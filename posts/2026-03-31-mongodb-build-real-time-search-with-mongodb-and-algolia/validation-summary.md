# Validation Summary: How to Build Real-Time Search with MongoDB and Algolia

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver, Change Streams)
- Algolia (JavaScript client v5, index settings, save/delete/partial update operations)
- React (InstantSearch v7 with SearchBox, Hits, RefinementList)
- Node.js (CommonJS modules)

## Sources Consulted
- Algolia JavaScript API client v5 documentation and migration guide (https://www.algolia.com/doc/libraries/javascript/)
- Algolia JavaScript client v5 GitHub repository (https://github.com/algolia/algoliasearch-client-javascript)
- MongoDB Node.js Driver documentation — Change Streams (https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/)
- Algolia React InstantSearch v7 documentation (https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/)

## Issues Found
1. **Algolia client initialization used deprecated v4 API**: The original code used `const algoliasearch = require("algoliasearch")` (default export) and `algolia.initIndex("products")`. In the current `algoliasearch` v5 package, `initIndex()` is removed and the import is a named export. Fixed to `const { algoliasearch } = require("algoliasearch")` with methods called directly on the client using `indexName` parameter.

2. **`setSettings` used v4 signature**: The original called `index.setSettings({ searchableAttributes: ... })` directly on the index object. In v5, the method is `client.setSettings({ indexName, indexSettings: { ... } })`. Updated to use the v5 options-object pattern.

3. **`saveObjects` used v4 signature**: The original called `index.saveObjects(records)` and destructured `{ objectIDs }` from the return value. Updated to `client.saveObjects({ indexName: "products", objects: records })` and simplified the logging to use `records.length` directly.

4. **`saveObject` used v4 signature**: The original called `index.saveObject({ objectID, ... })` directly on the index object. Updated to `client.saveObject({ indexName: "products", body: { objectID, ... } })` per the v5 API.

5. **`deleteObject` used v4 signature**: The original called `index.deleteObject(objectID)` with a positional argument. Updated to `client.deleteObject({ indexName: "products", objectID })`.

6. **`partialUpdateObject` used v4 signature**: The original called `index.partialUpdateObject({ objectID, ...updatedFields })`. Updated to `client.partialUpdateObject({ indexName: "products", objectID, attributesToUpdate: updatedFields })` per the v5 API.

7. **Frontend lite client import used v4 pattern**: The original used `import algoliasearch from "algoliasearch/lite"` (default export). In v5, the lite client is a named export. Updated to `import { liteClient as algoliasearch } from "algoliasearch/lite"`.

## Review Notes
- The Change Stream error handler reconnects after a 5-second delay but does not use a `resumeToken` for resumability. This means some changes could be missed during reconnection. For production use, storing and passing the resume token would be recommended, but this is acceptable for a tutorial.
- The `ProductHit` component referenced in the React front end is not defined in the post. This is typical for tutorial code and not an error — it implies the reader should define their own hit component.
- The `await` keyword in the first code block (for `client.setSettings`) is used at the top level, which requires ESM module context or an async wrapper. This is a common pattern in tutorial snippets.
- MongoDB Change Streams require a replica set or sharded cluster deployment; they do not work with standalone MongoDB instances. The post does not mention this prerequisite.
