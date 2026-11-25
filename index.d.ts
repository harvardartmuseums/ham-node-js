export = HAM;

declare class HAM {
    /**
     * @param apikey Your HAM API key. Only `/info` works without one.
     * @param options An environment name, a full base URL, or `{environment}` /
     *   `{baseurl}`. Defaults to `HAM_API_URL`, then `HAM_API_ENV`, then production.
     */
    constructor(apikey?: string | null, options?: HAM.ClientOptions);

    key: string | null;
    baseurl: string;

    static readonly environments: Readonly<Record<HAM.Environment, string>>;
    static readonly RESOURCES: Readonly<Record<HAM.Namespace, HAM.ResourceMeta>>;
    // HAM.HamApiError is contributed by the namespace declaration below.

    /** The endpoint manifest. Needs no API key. */
    static info(options?: HAM.ClientOptions): Promise<HAM.InfoResponse>;
    info(): Promise<HAM.InfoResponse>;

    // Generic forms. `resource` takes a plural key ('objects') or a path ('object').
    search<T = HAM.HamRecord>(
        resource: HAM.ResourceName,
        params?: HAM.SearchParams,
        aggregations?: object | string
    ): Promise<HAM.SearchResult<T>>;

    get<T = HAM.HamRecord>(resource: HAM.ResourceName, id: HAM.Id, params?: HAM.Params): Promise<T>;

    section<T = unknown>(
        resource: HAM.ResourceName,
        id: HAM.Id,
        section: string,
        params?: HAM.Params
    ): Promise<T>;

    similar(resource: 'objects' | 'object', id: HAM.Id, params?: HAM.SimilarParams): Promise<HAM.ObjectSimilar>;
    similar(resource: 'images' | 'image', id: HAM.Id, params?: HAM.SimilarParams): Promise<HAM.ImageSimilar>;

    // Resource namespaces.
    readonly Objects: HAM.SimilarResource<HAM.ObjectSearchParams, HAM.ObjectRecord, HAM.ObjectSignal>;
    readonly Images: HAM.SimilarResource<HAM.ImageSearchParams, HAM.ImageRecord, HAM.ImageSignal>;

    readonly Activities: HAM.Resource<HAM.ActivitySearchParams>;
    readonly Annotations: HAM.Resource<HAM.AnnotationSearchParams>;
    readonly Audio: HAM.Resource;
    readonly Centuries: HAM.Resource<HAM.TermSearchParams>;
    readonly Classifications: HAM.Resource<HAM.TermSearchParams>;
    readonly Colors: HAM.Resource;
    readonly Cultures: HAM.Resource<HAM.TermSearchParams>;
    readonly Exhibitions: HAM.Resource<HAM.ExhibitionSearchParams>;
    readonly Galleries: HAM.Resource<HAM.GallerySearchParams>;
    readonly Groups: HAM.Resource<HAM.HierarchySearchParams>;
    readonly Mediums: HAM.Resource<HAM.HierarchySearchParams>;
    readonly People: HAM.Resource;
    readonly Periods: HAM.Resource<HAM.TermSearchParams>;
    readonly Places: HAM.Resource<HAM.HierarchySearchParams>;
    readonly Publications: HAM.Resource<HAM.PublicationSearchParams>;
    readonly Sites: HAM.Resource;
    readonly Spectrum: HAM.Resource;
    readonly Supports: HAM.Resource<HAM.HierarchySearchParams>;
    readonly Techniques: HAM.Resource<HAM.TermSearchParams>;
    readonly Videos: HAM.Resource;
    readonly Worktypes: HAM.Resource<HAM.TermSearchParams>;
}

declare namespace HAM {
    //--------------------------------------------------------------------------
    // Client
    //--------------------------------------------------------------------------
    type Environment = 'production' | 'staging';

    type ClientOptions =
        | Environment
        | (string & {})
        | {environment?: Environment | (string & {}); baseurl?: string};

    interface ResourceMeta {
        readonly path: string;
        readonly key: string;
        readonly namespace: Namespace;
        readonly signals?: readonly string[];
    }

    //--------------------------------------------------------------------------
    // Resources
    //--------------------------------------------------------------------------
    interface Resource<P extends SearchParams = SearchParams, R = HamRecord> {
        readonly key: string;
        readonly path: string;
        readonly signals: readonly string[] | null;

        search(params?: P, aggregations?: object | string): Promise<SearchResult<R>>;

        /**
         * The API ignores query parameters on a by-id fetch, apart from `apikey`.
         * `fields` and `view` have no effect, and you always get the whole record.
         */
        get(id: Id, params?: Params): Promise<R>;

        /**
         * `GET /resource/ID/SECTION`. `section` is any top-level field on the record,
         * and the response is that field's bare value, with no `info`/`records` wrapper.
         * Rejects with code `EMPTY_RESPONSE` when the record has no such field.
         *
         * Like `get`, this ignores query parameters apart from `apikey`: there is no
         * way to page, sort or trim a section.
         */
        section<T = unknown>(id: Id, section: string, params?: Params): Promise<T>;
    }

    /** Only object and image have a similarity endpoint. */
    interface SimilarResource<P extends SearchParams, R, S extends string> extends Resource<P, R> {
        readonly signals: readonly S[];
        similar(id: Id, params?: SimilarParams): Promise<SimilarResult<R, S>>;
    }

    type Namespace =
        | 'Activities' | 'Annotations' | 'Audio' | 'Centuries' | 'Classifications'
        | 'Colors' | 'Cultures' | 'Exhibitions' | 'Galleries' | 'Groups' | 'Images'
        | 'Mediums' | 'Objects' | 'People' | 'Periods' | 'Places' | 'Publications'
        | 'Sites' | 'Spectrum' | 'Supports' | 'Techniques' | 'Videos' | 'Worktypes';

    /** Plural keys and singular paths both resolve. */
    type ResourceName =
        | 'activities' | 'activity'
        | 'annotations' | 'annotation'
        | 'audio'
        | 'centuries' | 'century'
        | 'classifications' | 'classification'
        | 'colors' | 'color'
        | 'cultures' | 'culture'
        | 'exhibitions' | 'exhibition'
        | 'galleries' | 'gallery'
        | 'groups' | 'group'
        | 'images' | 'image'
        | 'mediums' | 'medium'
        | 'objects' | 'object'
        | 'people' | 'person'
        | 'periods' | 'period'
        | 'places' | 'place'
        | 'publications' | 'publication'
        | 'sites' | 'site'
        | 'spectrum'
        | 'supports' | 'support'
        | 'techniques' | 'technique'
        | 'videos' | 'video'
        | 'worktypes' | 'worktype';

    //--------------------------------------------------------------------------
    // Parameters
    //
    // Arrays are joined for you: with a pipe for filters, with a comma for
    // `fields` and `facets`. The index signature keeps any parameter the API
    // adds later from being rejected here.
    //--------------------------------------------------------------------------
    type Id = number | string;
    type ParamPrimitive = string | number | boolean;
    type ParamValue = ParamPrimitive | readonly ParamPrimitive[] | object | null | undefined;

    /** A filter value: an id, a name, a list of either, or `'any'` / `'none'`. */
    type Filter = ParamPrimitive | readonly ParamPrimitive[];

    interface Params {
        apikey?: string;
        fields?: string | readonly string[];
        [name: string]: ParamValue;
    }

    type NamedSort = 'dated' | 'pageviews' | 'lastupdate' | 'accession' | 'rank';
    type Sort = NamedSort | 'random' | `random:${number}` | (string & {});

    interface SearchParams extends Params {
        /** Elasticsearch query string syntax, i.e. `FIELD:VALUE`. */
        q?: string;
        /** Natural language. Combine with `q` or `keyword` for hybrid search. */
        semantic?: string;
        size?: number;
        page?: number;
        /** An explicit offset. `page` wins if both are given. */
        from?: number;
        sort?: Sort;
        sortorder?: 'asc' | 'desc';
        id?: Filter;
        aggregation?: object | string;
        /** Adds a `_highlight` block. Pass `false` to omit the parameter entirely. */
        highlight?: boolean;
        /** Adds `_explanation` per record and the raw query to `info.query`. */
        debug?: boolean;
    }

    interface SimilarParams extends Params {
        /** Records per signal. Default 10; max 100 for objects, 1000 for images. */
        size?: number;
        debug?: boolean;
    }

    /** `usedby` takes `FIELD NAME:ID`. */
    interface TermSearchParams extends SearchParams {
        usedby?: string;
    }

    /** Hierarchical vocabularies: group, medium, place, support. */
    interface HierarchySearchParams extends TermSearchParams {
        level?: number;
        parent?: number;
    }

    type ObjectView = 'core' | 'stats' | 'images' | 'provenance' | 'minimal';

    type ObjectFacet =
        | 'classification' | 'worktype' | 'culture' | 'century' | 'technique'
        | 'medium' | 'support' | 'period' | 'place' | 'gallery' | 'color'
        | 'grouping' | 'division' | 'verificationlevel' | 'topic'
        | 'accessionmethod' | 'department' | 'style' | 'state';

    interface ObjectSearchParams extends SearchParams {
        /** Searches titles, people, description, classification, culture and more. */
        keyword?: string;
        /** How `keyword` terms combine. Ignored in Lucene syntax mode. */
        match?: 'all' | 'any';
        /** A named field set. Ignored when `fields` is also given. */
        view?: ObjectView;
        /** `'all'`, or the facets you want. */
        facets?: 'all' | ObjectFacet | readonly ObjectFacet[] | (string & {});
        facet_size?: number;

        hasimage?: boolean | 0 | 1;
        objectnumber?: string;
        title?: string;
        exact_title?: string;
        /** A four digit year, or a range such as `'1850-1900'`. */
        yearmade?: string | number;
        /** Exclusive bound. Takes `YEAR` or `FIELD:YEAR`. */
        before?: string | number;
        after?: string | number;

        accessionmethod?: Filter;
        audio?: Filter;
        century?: Filter;
        classification?: Filter;
        color?: Filter;
        culture?: Filter;
        department?: Filter;
        division?: Filter;
        exhibition?: Filter;
        /** A gallery NUMBER, not a gallery id. */
        gallery?: Filter;
        group?: Filter;
        image?: Filter;
        medium?: Filter;
        period?: Filter;
        person?: Filter;
        place?: Filter;
        publication?: Filter;
        relatedto?: Filter;
        role?: Filter;
        state?: Filter;
        style?: Filter;
        support?: Filter;
        technique?: Filter;
        topic?: Filter;
        verificationlevel?: Filter;
        video?: Filter;
        worktype?: Filter;
    }

    interface ImageSearchParams extends SearchParams {
        keyword?: string;
        match?: 'all' | 'any';
    }

    interface ExhibitionSearchParams extends SearchParams {
        keyword?: string;
        hasimage?: boolean | 0 | 1;
        person?: Filter;
        venue?: Filter;
        status?: 'current' | 'past' | 'upcoming';
        exact_title?: string;
        /** `YYYY-MM-DD`, or `begindate:`/`enddate:`/`temporalorder:` prefixed. */
        before?: string;
        after?: string;
    }

    interface PublicationSearchParams extends SearchParams {
        keyword?: string;
        hasimage?: boolean | 0 | 1;
        person?: Filter;
        group?: Filter;
    }

    interface GallerySearchParams extends TermSearchParams {
        /** 0 through 5. */
        floor?: Filter;
    }

    interface ActivitySearchParams extends SearchParams {
        object?: Filter;
        type?: 'edits' | 'pageviews' | 'uniquepageviews' | 'moves' | 'conservation' | 'studycenterviews';
    }

    interface AnnotationSearchParams extends SearchParams {
        image?: Filter;
    }

    //--------------------------------------------------------------------------
    // Responses
    //--------------------------------------------------------------------------
    interface HamRecord {
        id: number;
        /** Changes when the record changes. Absent on annotation and activity. */
        md5?: string;
        lastupdate?: string | null;
        [field: string]: any;
    }

    interface SearchInfo {
        totalrecordsperquery: number;
        totalrecords: number;
        pages: number;
        page: number;
        /** Absent at the end of the results. In semantic mode it can point at an empty page. */
        next?: string;
        prev?: string;
        responsetime: string;
        query?: object;
    }

    interface FacetValue {
        value: string;
        count: number;
        active: boolean;
        id?: number;
    }

    interface Facet {
        values: FacetValue[];
        missing: number;
        other: number;
    }

    interface SearchResult<T = HamRecord> {
        info: SearchInfo;
        records: T[];
        facets?: Record<string, Facet>;
        aggregations?: Record<string, any>;
    }

    interface ObjectRecord extends HamRecord {
        objectid: number;
        objectnumber?: string;
        title?: string;
        classification?: string;
        dated?: string;
        datebegin?: number;
        dateend?: number;
        culture?: string;
        medium?: string;
        technique?: string;
        division?: string;
        department?: string;
        creditline?: string;
        primaryimageurl?: string | null;
        people?: Array<{role?: string; displayname?: string; personid?: number; displayorder?: number}>;
        accesslevel?: 0 | 1;
    }

    interface ImageRecord extends HamRecord {
        imageid: number;
        baseimageurl?: string;
        alttext?: string | null;
        description?: string | null;
        caption?: string | null;
        width?: number;
        height?: number;
        format?: string;
        accesslevel?: 0 | 1;
    }

    //--------------------------------------------------------------------------
    // Similarity
    //
    // Keyed by signal, so `.visual` exists on an object result and `.perceptual`
    // on an image one. Signals with no source data come back as empty arrays.
    // `_score` is comparable within a signal but not across them.
    //--------------------------------------------------------------------------
    type ObjectSignal = 'visual' | 'concrete' | 'interpretive' | 'mixed';
    type ImageSignal = 'semantic' | 'perceptual' | 'color';

    type SimilarResult<R, S extends string> = {
        [K in S]: Array<R & {_score: number; _explanation?: unknown}>;
    };

    type ObjectSimilar = SimilarResult<ObjectRecord, ObjectSignal>;
    type ImageSimilar = SimilarResult<ImageRecord, ImageSignal>;

    //--------------------------------------------------------------------------
    // Info
    //--------------------------------------------------------------------------
    interface Relationship {
        endpoint: string;
        field: string;
        filter?: string;
        cardinality: 'one-to-one' | 'one-to-many';
    }

    interface SimilarityInfo {
        path: string;
        signals: string[];
        parameters: string[];
    }

    interface InfoEndpoint {
        path: string;
        /** The underlying index name. */
        name: string;
        totalrecords: number;
        publicrecords: number;
        privaterecords: number;
        lastupdated: string | null;
        filters: string[];
        facets: string[];
        sorts: string[];
        views: string[];
        relationships: Relationship[];
        /** An empty array on endpoints without similarity. Narrow with `Array.isArray`. */
        similar: SimilarityInfo | never[];
    }

    interface InfoResponse {
        endpoints: InfoEndpoint[];
    }

    //--------------------------------------------------------------------------
    // Errors
    //--------------------------------------------------------------------------
    type ErrorCode =
        /** A real non-2xx: 400 bad aggregation, 401 bad key, 404, 500. */
        | 'HTTP_ERROR'
        /** An HTTP 200 carrying an error document. The API's usual failure channel. */
        | 'API_ERROR'
        /** An HTTP 200 with an empty body: the section is not a field on the record. */
        | 'EMPTY_RESPONSE'
        | 'INVALID_JSON'
        | 'INVALID_RESOURCE'
        | 'INVALID_ENVIRONMENT'
        | 'NETWORK_ERROR';

    class HamApiError extends Error {
        name: 'HamApiError';
        code: ErrorCode;
        status: number | null;
        statusText: string | null;
        /** The request URL, with the API key redacted. */
        url: string | null;
        body: unknown;
    }
}
