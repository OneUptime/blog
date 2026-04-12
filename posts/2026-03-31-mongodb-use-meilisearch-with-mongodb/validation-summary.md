# Validation Summary: How to Use Meilisearch with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Meilisearch (search engine)
- MongoDB (database) with Change Streams
- meilisearch (JavaScript/Node.js SDK)
- mongodb (Node.js driver)
- Docker
- Express.js

## Sources Consulted
- Meilisearch JavaScript SDK source and README (https://github.com/meilisearch/meilisearch-js)
- Meilisearch official documentation — settings, search parameters, primary key (https://www.meilisearch.com/docs)
- Meilisearch Docker documentation (https://www.meilisearch.com/docs/guides/deployment/running-production)
- MongoDB Node.js Driver — Change Streams documentation (https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/change-streams/)
- MongoDB Manual — Change Events reference (https://www.mongodb.com/docs/manual/reference/change-events/)

## Issues Found

1. **`MeiliSearch` class name is deprecated**: The blog used `const { MeiliSearch } = require("meilisearch")` and `new MeiliSearch(...)`. The current meilisearch-js SDK (v0.57+) exports the class as `Meilisearch` (lowercase 's'). Changed to `Meilisearch` throughout.

2. **`index.waitForTask()` does not exist on Index**: The blog called `await index.waitForTask(task.taskUid)`. In the current SDK, `waitForTask` is on the `tasks` sub-object of the client or index. Changed to `await meili.tasks.waitForTask(task.taskUid)` using the client instance.

3. **Inaccurate claim about primary key naming**: The blog stated "Meilisearch requires a numeric or string primary key named `id`", implying the field must be called `id`. In fact, the primary key can be any field name — `id` is just the default if not specified. Updated the text to clarify this.

## Review Notes
- The `_id: undefined` pattern used to strip MongoDB's `_id` field works correctly because `undefined` values are omitted during JSON serialization, but the destructuring approach shown later in the `toMeiliDoc` helper is cleaner. Both are valid.
- The search endpoint interpolates user input directly into Meilisearch filter strings (`category = "${category}"`). While Meilisearch's filter syntax is limited and not vulnerable to the same injection risks as SQL, input validation would be a best practice for production code.
- MongoDB Change Streams require a replica set or sharded cluster; this prerequisite is not mentioned in the post but is a standard MongoDB requirement that readers should be aware of.
