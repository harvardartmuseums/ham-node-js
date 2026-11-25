'use strict'

//------------------------------------------------------------------------------
//
// Errors.
//
//------------------------------------------------------------------------------
const APIKEY_PATTERN = /([?&]apikey=)[^&]*/gi;

// The API key travels in the query string, so it turns up in every URL this
// library builds. Strip it before it reaches a log or a bug report.
function redact(value) {
    return typeof value === 'string' ? value.replace(APIKEY_PATTERN, '$1REDACTED') : value;
}

// Parse a response body without throwing. Returns the raw text when it is not JSON.
function parseLoose(text) {
    if (text === '') {
        return undefined;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

class HamApiError extends Error {
    constructor(message, details = {}) {
        super(redact(message), details.cause !== undefined ? {cause: details.cause} : undefined);

        this.name = 'HamApiError';
        this.code = details.code ?? 'HTTP_ERROR';
        this.status = details.status ?? null;
        this.statusText = details.statusText ?? null;
        this.url = redact(details.url) ?? null;
        this.body = details.body;

        Error.captureStackTrace?.(this, HamApiError);
    }
}


//------------------------------------------------------------------------------
//
// Environments.
//
// Resolution order: constructor argument, HAM_API_URL, HAM_API_ENV, production.
//
//------------------------------------------------------------------------------
const ENVIRONMENTS = {
    production: 'https://api.harvardartmuseums.org',
    staging: 'https://staging.api.harvardartmuseums.org'
};

// Accepts an environment name or a full URL. Anything else is a typo, and a typo
// that quietly fell through to production would defeat the point of this.
function toBaseUrl(nameOrUrl) {
    if (Object.hasOwn(ENVIRONMENTS, nameOrUrl)) {
        return ENVIRONMENTS[nameOrUrl];
    }

    if (nameOrUrl.includes('://')) {
        return nameOrUrl.replace(/\/+$/, '');
    }

    throw new HamApiError(
        `Unknown environment "${nameOrUrl}". Expected ${Object.keys(ENVIRONMENTS).join(' or ')}, or a full URL.`,
        {code: 'INVALID_ENVIRONMENT'}
    );
}

function resolveBaseUrl(option) {
    if (option === undefined || option === null) {
        if (process.env.HAM_API_URL) {
            return toBaseUrl(process.env.HAM_API_URL);
        }

        if (process.env.HAM_API_ENV) {
            return toBaseUrl(process.env.HAM_API_ENV);
        }

        return ENVIRONMENTS.production;
    }

    if (typeof option === 'string') {
        return toBaseUrl(option);
    }

    if (option.baseurl) {
        return toBaseUrl(option.baseurl);
    }

    if (option.environment) {
        return toBaseUrl(option.environment);
    }

    return resolveBaseUrl(null);
}


//------------------------------------------------------------------------------
//
// Resources.
//
// Only object and image have a similarity endpoint, and their signal names differ.
//
//------------------------------------------------------------------------------
const RESOURCES = {
    Activities:      {path: 'activity',       key: 'activities'},
    Annotations:     {path: 'annotation',     key: 'annotations'},
    Audio:           {path: 'audio',          key: 'audio'},
    Centuries:       {path: 'century',        key: 'centuries'},
    Classifications: {path: 'classification', key: 'classifications'},
    Colors:          {path: 'color',          key: 'colors'},
    Cultures:        {path: 'culture',        key: 'cultures'},
    Exhibitions:     {path: 'exhibition',     key: 'exhibitions'},
    Galleries:       {path: 'gallery',        key: 'galleries'},
    Groups:          {path: 'group',          key: 'groups'},
    Images:          {path: 'image',          key: 'images',
                      signals: ['semantic', 'perceptual', 'color']},
    Mediums:         {path: 'medium',         key: 'mediums'},
    Objects:         {path: 'object',         key: 'objects',
                      signals: ['visual', 'concrete', 'interpretive', 'mixed']},
    People:          {path: 'person',         key: 'people'},
    Periods:         {path: 'period',         key: 'periods'},
    Places:          {path: 'place',          key: 'places'},
    Publications:    {path: 'publication',    key: 'publications'},
    Sites:           {path: 'site',           key: 'sites'},
    Spectrum:        {path: 'spectrum',       key: 'spectrum'},
    Supports:        {path: 'support',        key: 'supports'},
    Techniques:      {path: 'technique',      key: 'techniques'},
    Videos:          {path: 'video',          key: 'videos'},
    Worktypes:       {path: 'worktype',       key: 'worktypes'}
};

// Every resource answers to both its plural key and its singular path. Two passes,
// so a plural key can never be shadowed by another resource's singular path.
const BY_NAME = new Map();

for (const [namespace, resource] of Object.entries(RESOURCES)) {
    resource.namespace = namespace;
    Object.freeze(resource);
    BY_NAME.set(resource.key, resource);
}

for (const resource of Object.values(RESOURCES)) {
    if (!BY_NAME.has(resource.path)) {
        BY_NAME.set(resource.path, resource);
    }
}

function resolve(name) {
    const resource = typeof name === 'string' ? BY_NAME.get(name) : undefined;

    if (!resource) {
        throw new HamApiError(
            `Unknown resource "${name}". See HAM.RESOURCES for the valid names.`,
            {code: 'INVALID_RESOURCE'}
        );
    }

    return resource;
}


//------------------------------------------------------------------------------
//
// Query parameters.
//
//------------------------------------------------------------------------------

// The API combines multiple values with a pipe, except for these two, which are
// comma separated. Repeating a parameter does not work: the server keeps only the
// last occurrence of it.
const COMMA_DELIMITED = new Set(['fields', 'facets']);

// These are tested for plain truthiness on the server, so the string "0" would
// switch them on. Send nothing at all instead.
const FLAG_PARAMS = new Set(['highlight', 'debug']);

function appendParams(search, params) {
    for (const [name, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }

        if (Array.isArray(value)) {
            const values = value.filter(item => item !== undefined && item !== null);

            if (values.length > 0) {
                search.set(name, values.join(COMMA_DELIMITED.has(name) ? ',' : '|'));
            }
        } else if (typeof value === 'boolean') {
            if (!FLAG_PARAMS.has(name)) {
                search.set(name, value ? '1' : '0');
            } else if (value) {
                search.set(name, '1');
            }
        } else if (typeof value === 'object') {
            search.set(name, JSON.stringify(value));
        } else {
            search.set(name, String(value));
        }
    }
}

function encodeSegment(value) {
    return encodeURIComponent(String(value));
}

function searchErrorReason(body) {
    return body?.meta?.body?.error?.reason || body?.name || 'malformed search response';
}


//------------------------------------------------------------------------------
//
// Client.
//
//------------------------------------------------------------------------------
class HAM {
    constructor(apikey = null, options = null) {
        this.key = apikey;
        this.baseurl = resolveBaseUrl(options);

        for (const [namespace, resource] of Object.entries(RESOURCES)) {
            this[namespace] = makeNamespace(this, resource);
        }
    }

    _url(path, params, aggregations) {
        const url = new URL(`${this.baseurl}/${path}`);

        // Set the key first, so a caller supplied apikey can still override it.
        if (this.key !== null && this.key !== undefined) {
            url.searchParams.set('apikey', this.key);
        }

        if (params) {
            appendParams(url.searchParams, params);
        }

        if (aggregations !== undefined && aggregations !== null) {
            url.searchParams.set(
                'aggregation',
                typeof aggregations === 'string' ? aggregations : JSON.stringify(aggregations)
            );
        }

        return url.toString();
    }

    // The API reports most failures with an HTTP 200 and an error document, so the
    // body has to be inspected on every request. Nothing here resolves on failure.
    async _fetch(url, expect = 'record') {
        let response;

        try {
            response = await fetch(url);
        } catch (cause) {
            throw new HamApiError(`Request to the HAM API failed: ${cause.message}`, {
                code: 'NETWORK_ERROR',
                url: url,
                cause: cause
            });
        }

        const text = await response.text();

        if (!response.ok) {
            throw new HamApiError(`HAM API responded ${response.status} ${response.statusText}`, {
                code: 'HTTP_ERROR',
                status: response.status,
                statusText: response.statusText,
                url: url,
                body: parseLoose(text)
            });
        }

        // An empty body means the requested section is not a field on the record.
        if (text === '') {
            throw new HamApiError(
                'HAM API returned an empty body. The requested section is probably not a field on that record.',
                {code: 'EMPTY_RESPONSE', status: response.status, url: url}
            );
        }

        let body;

        try {
            body = JSON.parse(text);
        } catch (cause) {
            throw new HamApiError(`HAM API returned a body that is not JSON: ${text.slice(0, 120)}`, {
                code: 'INVALID_JSON',
                status: response.status,
                url: url,
                body: text,
                cause: cause
            });
        }

        if (body && typeof body === 'object' && !Array.isArray(body)) {
            // Only a top level error document counts as a failure. Restricted records
            // also appear as {error: ...} inside a records array, and that is a partial
            // result rather than a failed request.
            if (typeof body.error === 'string' && body.records === undefined) {
                throw new HamApiError(`HAM API error: ${body.error}`, {
                    code: 'API_ERROR',
                    status: response.status,
                    url: url,
                    body: body
                });
            }

            // A search always carries an info block. Anything else is a leaked
            // Elasticsearch error, which the server also sends with a 200.
            if (expect === 'search' && (!body.info || typeof body.info !== 'object')) {
                throw new HamApiError(`HAM API error: ${searchErrorReason(body)}`, {
                    code: 'API_ERROR',
                    status: response.status,
                    url: url,
                    body: body
                });
            }
        }

        return body;
    }

    _namespace(resource) {
        return this[resolve(resource).namespace];
    }

    async search(resource, params, aggregations) {
        return this._namespace(resource).search(params, aggregations);
    }

    async get(resource, id, params) {
        return this._namespace(resource).get(id, params);
    }

    async section(resource, id, section, params) {
        return this._namespace(resource).section(id, section, params);
    }

    async similar(resource, id, params) {
        const namespace = this._namespace(resource);

        if (!namespace.similar) {
            throw new HamApiError(
                `The "${namespace.path}" resource has no similarity endpoint. Only object and image do.`,
                {code: 'INVALID_RESOURCE'}
            );
        }

        return namespace.similar(id, params);
    }

    // /info needs no API key, so none is sent.
    async info() {
        return this._fetch(`${this.baseurl}/info`);
    }

    // Keyless, and useful before you have a key at all.
    static async info(options = null) {
        return new HAM(null, options).info();
    }
}


//------------------------------------------------------------------------------
//
// Resource namespaces.
//
// Methods are async so that a synchronous throw, such as an unknown resource name,
// surfaces as a rejection. Every call in this library returns a promise.
//
//------------------------------------------------------------------------------
function makeNamespace(api, resource) {
    const namespace = {
        key: resource.key,
        path: resource.path,
        signals: resource.signals ? Object.freeze([...resource.signals]) : null,

        get: async (id, params) => {
            return api._fetch(api._url(`${resource.path}/${encodeSegment(id)}`, params));
        },

        search: async (params, aggregations) => {
            return api._fetch(api._url(resource.path, params, aggregations), 'search');
        },

        section: async (id, section, params) => {
            const path = `${resource.path}/${encodeSegment(id)}/${encodeSegment(section)}`;

            return api._fetch(api._url(path, params));
        }
    };

    // Leaving similar off the other resources is a clearer signal than a guard that
    // throws: api.People.similar is undefined, and the type declarations say so too.
    if (resource.signals) {
        namespace.similar = async (id, params) => {
            return api._fetch(api._url(`${resource.path}/${encodeSegment(id)}/similar`, params));
        };
    }

    return Object.freeze(namespace);
}


module.exports = HAM;
module.exports.HamApiError = HamApiError;
module.exports.RESOURCES = Object.freeze(RESOURCES);
module.exports.environments = Object.freeze(ENVIRONMENTS);
