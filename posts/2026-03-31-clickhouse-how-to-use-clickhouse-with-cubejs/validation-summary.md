# Validation Summary: How to Use ClickHouse with Cube.js

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- ClickHouse (OLAP database)
- Cube.js (headless BI / semantic layer)
- `@cubejs-client/core` and `@cubejs-client/react` client libraries
- REST / JSON API
- Node.js / npm / npx tooling

## Sources Consulted
- Cube.js ClickHouse driver docs: https://cube.dev/docs/product/configuration/data-sources/clickhouse
- Cube.js CLI reference: https://cube.dev/docs/reference/cli
- Cube.js environment variables reference: https://cube.dev/docs/reference/environment-variables
- Cube.js data modeling (cubes, measures, dimensions): https://cube.dev/docs/product/data-modeling/reference/cube
- Cube.js pre-aggregations reference: https://cube.dev/docs/product/caching/using-pre-aggregations
- Cube.js REST API `/load` endpoint: https://cube.dev/docs/reference/rest-api
- `@cubejs-client/core` package: https://cube.dev/docs/reference/frontend/cubejs-client-core
- ClickHouse HTTP interface default port 8123: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
No technical issues found. The CLI command, environment variable names, cube schema syntax (including `count` and `countDistinct` measure types and `string`/`time` dimension types), pre-aggregation rollup structure, REST endpoint path, client library package names, and `cubejsApi.load()` / `resultSet.tablePivot()` usage are all consistent with current Cube.js documentation. ClickHouse's HTTP port 8123 is correct.

## Review Notes
- The phrasing "Edit `cube.js` (or `.env`)" is followed by a block of `KEY=VALUE` pairs, which are properly placed in the `.env` file (not in the JavaScript `cube.js` config). The wording is slightly ambiguous but not technically incorrect — both files exist in a Cube project, and environment variables can be sourced from `.env` while `cube.js` is used for programmatic configuration.
- Cube has recently rebranded the product from "Cube.js" to simply "Cube," and newer installations often use YAML-based data models under a `model/` directory. The JavaScript schema format shown here under `schema/` remains fully supported, so the tutorial continues to work as written.
- The post could benefit from mentioning that `CUBEJS_API_SECRET` is required to generate the `YOUR_TOKEN` JWT used in the REST and client examples, but omitting this detail is not a correctness issue.
