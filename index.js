'use strict'
const querystring = require('querystring');

const ENDPOINTS = {
    activities: 'activity',
    annotations: 'annotation',
    audio: 'audio', 
    centuries: 'century',
    classifications: 'classification',
    colors: 'color',
    cultures: 'culture',
    exhibitions: 'exhibition',
    galleries: 'gallery',
    groups: 'group',
    images: 'image', 
    mediums: 'medium',
    objects: 'object',
    people: 'person',
    periods: 'period',
    places: 'place',
    publications: 'publication',
    sites: 'site',
    spectrum: 'spectrum',
    support: 'support',
    techniques: 'technique',
    videos: 'video', 
    worktypes: 'worktype',
};

module.exports = class HAM {
    baseurl = 'https://api.harvardartmuseums.org';
    
    constructor(key) {
        this.key = key;
    }

    _makeSearchUrl(endpoint, parameters, aggregations) {
        let qs = {
            apikey: this.key
        };

        if (parameters) {
            qs = {...qs, ...parameters};
        };

        if (aggregations) {
            qs.aggregation = JSON.stringify(aggregations);
        }

        return `${this.baseurl}/${endpoint}?${querystring.encode(qs)}`; 
    }

    _makeGetUrl(endpoint, id) {
        let qs = {
            apikey: this.key
        };    

        return `${this.baseurl}/${endpoint}/${id}?${querystring.encode(qs)}`; 
    }

    _fetch(url) {
        return fetch(url)
                    .then(response => {if(response.ok) return response.json()})
                    .then(response => response);
    }

    Images = {
        get: (id) => { 
            return this._fetch(this._makeGetUrl(ENDPOINTS.images, id)); 
        },     
        search: (parameters, aggregations) => { 
            return this._fetch(this._makeSearchUrl(ENDPOINTS.images, parameters, aggregations)); 
        }
    }

    Audio = {
        get: (id) => { 
            return this._fetch(this._makeGetUrl(ENDPOINTS.audio, id)); 
        },     
        search: (parameters, aggregations) => { 
            return this._fetch(this._makeSearchUrl(ENDPOINTS.audio, parameters, aggregations)); 
        }
    }

    Videos = {
        get: (id) => { 
            return this._fetch(this._makeGetUrl(ENDPOINTS.videos, id)); 
        },     
        search: (parameters, aggregations) => { 
            return this._fetch(this._makeSearchUrl(ENDPOINTS.videos, parameters, aggregations)); 
        }
    }

    Objects = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.objects, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.objects, parameters, aggregations));
        }
    }

    Exhibitions = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.exhibitions, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.exhibitions, parameters, aggregations));
        }
    }

    Publications = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.publications, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.publications, parameters, aggregations));
        }
    }

    People = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.people, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.people, parameters, aggregations));
        }
    }

    Galleries = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.galleries, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.galleries, parameters, aggregations));
        }
    }

    Annotations = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.annotations, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.annotations, parameters, aggregations));
        }
    }

    Centuries = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.centuries, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.centuries, parameters, aggregations));
        }
    }

    Classifications = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.classifications, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.classifications, parameters, aggregations));
        }
    }

    Colors = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.colors, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.colors, parameters, aggregations));
        }
    }

    Cultures = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.cultures, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.cultures, parameters, aggregations));
        }
    }

    Groups = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.groups, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.groups, parameters, aggregations));
        }
    }

    Mediums = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.mediums, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.mediums, parameters, aggregations));
        }
    }

    Periods = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.periods, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.periods, parameters, aggregations));
        }
    }

    Places = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.places, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.places, parameters, aggregations));
        }
    }

    Sites = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.sites, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.sites, parameters, aggregations));
        }
    }

    Spectrum = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.spectrum, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.spectrum, parameters, aggregations));
        }
    }

    Supports = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.support, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.support, parameters, aggregations));
        }
    }

    Techniques = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.techniques, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.techniques, parameters, aggregations));
        }
    }

    Worktypes = {
        get: (id) => {
            return this._fetch(this._makeGetUrl(ENDPOINTS.worktypes, id));
        },     
        search: (parameters, aggregations) => {
            return this._fetch(this._makeSearchUrl(ENDPOINTS.worktypes, parameters, aggregations));
        }
    }
}