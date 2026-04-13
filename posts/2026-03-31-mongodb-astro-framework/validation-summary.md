# Validation Summary: How to Use MongoDB with Astro Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- Astro framework (SSR, static rendering, hybrid output)
- @astrojs/node adapter
- Node.js

## Sources Consulted
- Astro documentation: https://docs.astro.build/en/guides/server-side-rendering/
- Astro 5.0 migration guide: https://docs.astro.build/en/guides/upgrade-to/v5/
- Astro API routes documentation: https://docs.astro.build/en/guides/endpoints/
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **`output: 'hybrid'` replaced by `output: 'server'` in Astro 5**: The `hybrid` output mode was removed in Astro 5 (released December 2024). Since `npm create astro@latest` installs Astro 5+, using `output: 'hybrid'` would cause a configuration error. Changed to `output: 'server'`, which in Astro 5 defaults to prerendering all pages (the same behavior as the old `hybrid` mode). Pages can still opt into SSR with `export const prerender = false`, so the rest of the post's code remains correct as-is.

## Review Notes
- The MongoDB client module uses a simple singleton pattern without connection pooling limits or error handling. This is fine for a tutorial but production usage would benefit from connection pool options and graceful shutdown handling.
- The `findOne({ _id: userId })` in the dashboard example passes a string as `_id`. If the MongoDB collection uses `ObjectId` for `_id` (the default), this query would not match. The code works correctly if `_id` is stored as a string, but readers should be aware they may need `new ObjectId(userId)` depending on their schema.
- The `$text` search in the API route requires a text index on the `posts` collection. The post does not mention creating this index, which could confuse readers if they try the search endpoint without one.
