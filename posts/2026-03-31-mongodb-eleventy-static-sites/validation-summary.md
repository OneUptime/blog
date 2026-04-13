# Validation Summary: How to Use MongoDB with Eleventy for Static Sites

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver 4.x+)
- Eleventy (11ty) static site generator
- Nunjucks templating
- Luxon date library
- Node.js / JavaScript (CommonJS)
- dotenv for environment variables

## Sources Consulted
- Eleventy documentation on global data files: https://www.11ty.dev/docs/data-global/
- Eleventy documentation on pagination: https://www.11ty.dev/docs/pagination/
- Eleventy documentation on configuration: https://www.11ty.dev/docs/config/
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js driver `find()` API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/find/
- Luxon API documentation: https://moment.github.io/luxon/api-docs/
- Nunjucks templating documentation: https://mozilla.github.io/nunjucks/

## Issues Found
1. **Missing `luxon` dependency in install command**: The `.eleventy.js` configuration file requires `luxon` (`const { DateTime } = require('luxon')`) for the `dateReadable` and `dateIso` template filters, but the `npm install` command only listed `@11ty/eleventy mongodb dotenv`. Running the project as-is would fail with a `Cannot find module 'luxon'` error. Fixed by adding `luxon` to the install command: `npm install @11ty/eleventy mongodb dotenv luxon`.

## Review Notes
- The post uses CommonJS (`require`) syntax throughout. Eleventy 3.x (released 2025) defaults to ESM, but CommonJS is still supported. This is not an error but worth noting for readers using the latest Eleventy version.
- The `.eleventy.js` config filename is the traditional naming. Eleventy 2.x+ also supports `eleventy.config.js`. Both work, so this is fine.
- The project structure lists `_data/config.js` and `posts/posts.11tydata.json` which are never shown in the post. This is not a technical error but could confuse readers — they are presumably left as an exercise or implied to be optional.
- The MongoDB connection pattern (connect in try, close in finally) is correct and follows best practices for short-lived scripts like build-time data fetching.
