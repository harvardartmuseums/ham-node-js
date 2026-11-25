# @harvardartmuseums/ham

A server-side Node.js library for the [Harvard Art Museums API](https://github.com/harvardartmuseums/api-docs).
Zero dependencies, TypeScript declarations included.

```
npm install @harvardartmuseums/ham
```

Requires Node 18 or later and an [API key](https://harvardartmuseums.org/collections/api).

---

## Quick start

```javascript
const HAM = require('@harvardartmuseums/ham');

const api = new HAM(API_KEY);

// Search
const results = await api.Objects.search({keyword: 'van gogh', size: 5});
console.log(results.info.totalrecords, results.records);

// Get one record
const object = await api.Objects.get(299843);

// Find objects that resemble it
const similar = await api.Objects.similar(299843, {size: 3});
console.log(similar.visual, similar.interpretive);
```

## Configuration

```javascript
new HAM(API_KEY)                                    // production
new HAM(API_KEY, 'staging')
new HAM(API_KEY, {environment: 'staging'})
new HAM(API_KEY, {baseurl: 'http://localhost:5000'})
new HAM(API_KEY, 'http://localhost:5000')           // a URL works positionally too

HAM.environments    // {production: '...', staging: '...'}
```

With no second argument the base URL comes from the environment, highest first:

| Source | Example |
| :-- | :-- |
| constructor argument | `new HAM(key, 'staging')` |
| `HAM_API_URL` | `HAM_API_URL=http://localhost:5000 node app.js` |
| `HAM_API_ENV` | `HAM_API_ENV=staging node app.js` |
| default | production |

An unrecognized environment name throws rather than falling back to production, so a typo
in `HAM_API_ENV` can't quietly point your test run at the live API. `api.baseurl` stays
writable if you need to change hosts after construction.

---

## Resources

Each of the 23 resources has its own namespace with `search`, `get` and `section`.
`object` and `image` also have `similar`.

| Namespace | Path | 
| :-- | :-- |
| `Activities` | `/activity` | 
| `Annotations` | `/annotation` | 
| `Audio` | `/audio` | 
| `Centuries` | `/century` | 
| `Classifications` | `/classification` | 
| `Colors` | `/color` | 
| `Cultures` | `/culture` | 
| `Exhibitions` | `/exhibition` | 
| `Galleries` | `/gallery` |
| `Groups` | `/group` | 
| `Images` | `/image` | 
| `Mediums` | `/medium` |
| `Objects` | `/object` | 
| `People` | `/person` |
| `Periods` | `/period` |
| `Places` | `/place` | 
| `Publications` | `/publication` |
| `Sites` | `/site` |
| `Spectrum` | `/spectrum` |
| `Supports` | `/support` |
| `Techniques` | `/technique` |
| `Videos` | `/video` |
| `Worktypes` | `/worktype` |

## Methods

```javascript
api.Objects.search(parameters, aggregations)   // GET /object
api.Objects.get(id, parameters)                // GET /object/ID
api.Objects.section(id, name, parameters)      // GET /object/ID/NAME
api.Objects.similar(id, parameters)            // GET /object/ID/similar
```

Generic equivalents take the resource name first. Both the plural key and the singular
path work, so `'objects'` and `'object'` are the same thing.

```javascript
api.search('objects', parameters, aggregations)
api.get('object', id, parameters)
api.section('objects', id, name, parameters)
api.similar('object', id, parameters)
```

Every method returns a promise and rejects on failure. See [Errors](#errors).

### info

`/info` is a manifest of every endpoint: its filters, facets, named sorts, named views,
relationships, record counts and similarity signals. It needs no API key, which makes it a
convenient way to check the service before you have one.

```javascript
const {endpoints} = await HAM.info();          // static, no client needed
const {endpoints} = await HAM.info('staging');
const {endpoints} = await api.info();          // instance form, key not sent

endpoints.find(e => e.path === '/object').filters;
```

`endpoint.similar` is an object on `/object` and `/image` and an empty array everywhere
else, so narrow it with `Array.isArray` before reading `.signals`.

### Sections

`GET /object/ID/SECTION` returns one top-level field of a record. The section name is a raw
field lookup, so any field on the record works — these are just the ones most people want.

```javascript
await api.Objects.section(6772, 'publications');
await api.Objects.section(6772, 'images');
await api.Objects.section(6772, 'people');
await api.Objects.section(6772, 'colors');
await api.Objects.section(6772, 'exhibitions');
await api.Objects.section(6772, 'videos');
```

The response is the field's bare value — usually an array — with no `info` block and no
`records` wrapper. Some fields are excluded from search results but still available here.
Asking for a field the record doesn't have rejects with code `EMPTY_RESPONSE`.

Sections ignore query parameters. There is no way to page, sort or trim a section; you get
the whole field as it is stored on the record.

### Similarity

Similarity is computed from the descriptive text attached to each record, so the results
are not simply other works by the same artist or in the same classification. Each signal
comes back as its own array, and a record with no source text for a signal gets an empty
one.

```javascript
const similar = await api.Objects.similar(299843, {size: 3, fields: ['objectid', 'title']});
```

| `api.Objects.similar` | |
| :-- | :-- |
| `visual` | Objects that look alike, from descriptions of what each work depicts |
| `concrete` | Objects sharing concrete subject matter, such as the things and places shown |
| `interpretive` | Objects sharing themes, mood or ideas |
| `mixed` | A blend of the concrete and interpretive signals |

| `api.Images.similar` | |
| :-- | :-- |
| `semantic` | Images whose descriptions convey similar content |
| `perceptual` | Images that look alike, compared pixel to pixel |
| `color` | Images with a similar distribution of color |

Parameters are `size` (per signal; default 10, max 100 for objects and 1000 for images),
`fields` and `debug`. There is no paging. Each record carries a `_score` that is comparable
within a signal but not across signals.

`similar` is defined only on `Objects` and `Images` — `api.People.similar` is `undefined`.

---

## Parameters

Arrays are joined for you, with a pipe for filters and a comma for `fields` and `facets`.
Don't pass repeated parameters yourself: the server keeps only the last occurrence.

```javascript
await api.Objects.search({
    century: ['17th century', '18th century'],   // century=17th century|18th century
    fields: ['objectid', 'title'],               // fields=objectid,title
    hasimage: true
});
```

Most filters accept an id, a name, a list of either, or the literal `'any'` or `'none'`.
Ids and names can't be mixed in one list — an all-digit value matches the id field and
anything else matches the name field.

| Parameter | Notes |
| :-- | :-- |
| `size` | Default 10. The cap varies by resource: 100 for object, 1000 for most, 5000 for place |
| `page` | 1-based |
| `from` | An explicit offset instead of `page`. `page` wins if both are given |
| `sort`, `sortorder` | A field name, a named sort, `'random'`, or `'random:42'` for a seed |
| `fields` | The fields you want back |
| `highlight`, `debug` | Pass `true` to enable. Passing `false` omits them entirely, which is what the server needs |

These apply to `search()`. **`get()` and `section()` accept a parameters argument and
forward it, but the API ignores query parameters on by-id and section fetches** — `fields`
and `view` have no effect there, and you always get the whole record or the whole field.
The exception is `apikey`, which is read before the route and so can still be overridden
per request. `similar()` is the one sub-resource that does read parameters: `size`,
`fields` and `debug`.

### Searching

| Parameter | |
| :-- | :-- |
| `q` | Elasticsearch query string syntax, e.g. `'culture:Dutch'`. Every resource |
| `keyword` | Plain text across titles, people, description, classification, culture and more. Object, image, exhibition, publication |
| `semantic` | Natural language. Object, image, exhibition, publication, gallery, video, audio |
| `match` | `'all'` or `'any'`, for how `keyword` terms combine. Object and image |

`keyword` and `q` are mutually exclusive, and `keyword` wins. Combining `semantic` with
`keyword` or `q` gives hybrid search — in that mode `sort` has no effect, and `info.next`
appears whenever a full page comes back, so treat an empty `records` array as the end.

### Named sorts and views

`/object` only. A named view is a predefined field set; `fields` overrides it.

```javascript
await api.Objects.search({sort: 'pageviews', sortorder: 'desc', view: 'core'});
```

Sorts: `dated`, `pageviews`, `lastupdate`, `accession`, `rank`.
Views: `core`, `stats`, `images`, `provenance`, `minimal`.

### Facets and aggregations

```javascript
await api.Objects.search({facets: ['classification', 'culture'], facet_size: 20});
await api.Objects.search({size: 0}, {by_division: {terms: {field: 'division'}}});
```

Facets come back in a `facets` block, aggregations in an `aggregations` block. The third
argument is serialized for you. Note the facet is named `grouping` while the parameter you
filter with is named `group`.

### Pagination

```javascript
let results = await api.Objects.search({keyword: 'portrait', size: 100});

while (results.records.length > 0) {
    // ...
    if (!results.info.next) break;
    results = await api.Objects.search({keyword: 'portrait', size: 100, page: results.info.page + 1});
}
```

`info.next` and `info.prev` are absent at the ends of a result set. They are fully formed
URLs — **which means they contain your API key**, so don't log or store them.

### Keeping data in sync

Every record carries `lastupdate`, and every record except annotation and activity carries
`md5`, so you can tell what changed without diffing whole records. The dataset refreshes
daily, around 6am.

---

## Errors

**Most API failures arrive as HTTP 200 with an error document in the body** — a missing
record, a restricted record and a failed similarity lookup all come back 200. This library
inspects the body on every request and turns all of them into rejections.

```javascript
const {HamApiError} = require('@harvardartmuseums/ham');

try {
    await api.Objects.get(999999999);
} catch (error) {
    if (error instanceof HamApiError) {
        console.error(error.code, error.status, error.message);
    }
}
```

| `error.code` | |
| :-- | :-- |
| `HTTP_ERROR` | A real non-2xx: 401 bad key, 400 malformed aggregation, 404, 500 |
| `API_ERROR` | An HTTP 200 carrying an error document. The API's usual failure channel |
| `EMPTY_RESPONSE` | An HTTP 200 with an empty body: the section is not a field on that record |
| `INVALID_JSON` | A body that isn't JSON, such as a proxy error page |
| `INVALID_RESOURCE` | An unknown resource name, or `similar` on a resource without one |
| `INVALID_ENVIRONMENT` | An unrecognized environment name or env var |
| `NETWORK_ERROR` | The request never completed. The original failure is on `error.cause` |

Errors also carry `status`, `statusText`, `body`, and `url` with the API key redacted.

To treat a missing section as a normal outcome:

```javascript
const provenance = await api.Objects.section(id, 'provenance')
    .catch(error => error.code === 'EMPTY_RESPONSE' ? null : Promise.reject(error));
```

---

## TypeScript

Declarations ship with the package; there is no build step. Similarity results are typed by
signal, so `result.visual` exists on an object result and `result.perceptual` on an image
one. Named sorts, views and facets autocomplete while still accepting any field name.
Records are intentionally loose, since `fields` and `view` change their shape.

---

## Migrating from 1.x

| 1.x | 2.0 |
| :-- | :-- |
| Failures resolved to `undefined` | Reject with a `HamApiError` |
| A 200 error document resolved as if it were a record | Rejects with code `API_ERROR` |
| `get`/`search` returned `{error: 'invalid endpoint'}` — not a promise | Reject with code `INVALID_RESOURCE` |
| `search('support', …)` | `search('supports', …)`; `'support'` still works as the path form |
| `{century: ['a', 'b']}` became repeated parameters, and the server kept only the last | Becomes `century=a\|b` |
| Production only | `new HAM(key, 'staging')`, `HAM_API_URL`, `HAM_API_ENV` |
| — | `section()`, `similar()`, `info()`, TypeScript declarations |

Namespaces, method names and `new HAM(key)` are unchanged. On the server side, the legacy
`i` and `s` aliases for `hasimage` and `sort` have been removed and now do nothing.

---

## Terms

Please stay under 2,500 API calls per day and don't cache data for more than two weeks.
See the [API documentation](https://github.com/harvardartmuseums/api-docs) for the full terms.
