# @harvardartmuseums/ham

A barebones server-side Node.js library for the Harvard Art Museums API.

---

## Getting Started

### Installation
```
npm install @harvardartmuseums/ham
```

### Basic Example

```javascript
    const HAM = require('@harvardartmuseums/ham');

    let api = new HAM(API_KEY);
    let criteria = {
        'venue': 'HAM'
    };
    api.Exhibitions.search(criteria)
        .then(data => console.log(data.info));

```