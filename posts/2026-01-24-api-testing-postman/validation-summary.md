# Validation Summary: How to Handle API Testing with Postman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postman
- Postman collections and environments
- Postman Sandbox JavaScript APIs
- JSON Schema validation
- Newman CLI
- GitHub Actions
- CI/CD API testing

## Sources Consulted
- Postman Sandbox API reference: https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/overview
- Postman `pm.require` sandbox library reference: https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-require
- Postman `pm.execution` reference: https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution
- Newman CLI command reference: https://learning.postman.com/docs/reference/newman-cli/newman-options
- Newman CLI overview and v3 compatibility note: https://learning.postman.com/docs/reference/newman-cli/command-line-integration-with-newman
- Current Newman CLI help output from `npx --yes newman@latest run -h`

## Issues Found
- The environment examples were presented as a single `json` block containing comments and two top-level JSON objects. Split them into separate valid JSON examples.
- The JSON Schema example used `tv4`, which Postman now lists as deprecated and no longer supported. Replaced it with `ajv`, the supported sandbox library.
- The pre-request HMAC example used `crypto-js`, which Postman now lists as deprecated and no longer supported. Replaced it with the Web Crypto API.
- The retry example was labeled as a collection-level pre-request script and used `postman.setNextRequest`. A pre-request script cannot inspect the current response, and current Postman flow control uses `pm.execution.setNextRequest`. Moved the example to a post-response script and updated the API call.
- The Newman example used `--reporters cli,html`, but `html` is not a built-in reporter in current Newman docs. Changed the basic example to `cli,json`.
- The Newman configuration section used `newman run --config newman.config.json`, but the current Newman CLI has no `--config` option. Replaced it with an equivalent reusable shell script using documented Newman options.

## Review Notes
Newman remains valid for collection v2 workflows, but current Postman documentation notes that Newman is not compatible with the collection v3 format used by Postman v12 Native Git workflows. Teams using collection v3 should migrate those runs to the Postman CLI.
