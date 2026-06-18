# Validation Summary: How to Implement API Testing with Postman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postman collections
- Postman environments and Vault variables
- Postman JavaScript test and pre-request scripts
- Postman Collection Runner data files
- Newman CLI
- Newman reporters
- GitHub Actions CI/CD
- JSON Schema validation

## Sources Consulted
- Postman Docs: Postman Sandbox API reference - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/overview
- Postman Docs: Reference Postman responses in scripts - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-response
- Postman Docs: Use scripts to send requests in Postman - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-send-request
- Postman Docs: Writing tests and assertions in scripts - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-test-expect
- Postman Docs: Reference variables in Postman scripts - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables
- Postman Docs: Import packages into your scripts - https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-require
- Postman Docs: Create and manage vault secrets in Postman Vault - https://learning.postman.com/docs/use/postman-vault/manage-vault-secrets
- Postman Docs: Run collections using imported data - https://learning.postman.com/docs/tests-and-scripts/running-collections/working-with-data-files
- Postman Docs: Newman command reference - https://learning.postman.com/docs/reference/newman-cli/newman-options
- Postman Docs: Newman built-in reporters - https://learning.postman.com/docs/reference/newman-cli/newman-built-in-reporters
- Local Newman CLI help output for Newman 6.2.2
- npm package metadata for newman and newman-reporter-htmlextra

## Issues Found
- The production environment example used `{{$vault:production-api-key}}`, which is dynamic-variable syntax rather than Postman Vault syntax. Changed it to `{{vault:production-api-key}}`, matching Postman's documented Vault secret format.
- The pre-request script used `require('crypto-js')` for HMAC signing. Postman's current sandbox documentation lists `crypto-js` as deprecated and no longer supported, and the documented replacement is not portable to Newman 6.2.2. Removed the crypto dependency and narrowed the example to setting a timestamp variable.
- The contract testing example used `tv4.validate(...)`. Postman's current response documentation recommends JSON Schema assertions through `pm.response.to.have.jsonSchema(...)` using Ajv, and the sandbox documentation lists `tv4` as deprecated and no longer supported. Replaced the assertion with `pm.response.to.have.jsonSchema(userSchema)`.
- The deletion verification used `pm.sendRequest` inside `pm.test` without the asynchronous `done` callback. Updated the test to accept `done`, assert the request error is null, and call `done()` after the callback assertions.
- Some fenced examples were marked as `javascript` even though they contained raw JSON request bodies or literal HTTP header text mixed with script snippets. Changed those fences to `text` so they are not presented as syntactically valid JavaScript.

## Review Notes
- Newman commands and documented flags such as `--environment`, `--iteration-data`, `--reporters`, and `--reporter-junit-export` were verified against Newman CLI help and Postman's Newman documentation.
- Vault secrets are supported in Postman manual collection runs but not in Newman according to current Postman Vault documentation. The post does not use the Vault-based production environment in its Newman command examples, so no further edit was required.
