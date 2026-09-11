# Validation Summary: How to Retrieve Buildkite Logs and Test Results Through the API

## Status
validated

## Post Type
Tutorial / API integration guide

## Technologies Covered
- Buildkite Pipelines and REST API v2
- Buildkite Test Engine
- Job logs, build artifacts, and JUnit XML reports
- Bash, curl, and jq
- HTTP authentication, redirects, byte ranges, pagination, and rate limits

## Sources Consulted
- [Buildkite Builds API](https://buildkite.com/docs/apis/rest-api/builds): build numbers, UUIDs, script-job fields, read_builds scope, and inclusion of retried jobs.
- [Buildkite Jobs API](https://buildkite.com/docs/apis/rest-api/jobs): log routes, JSON content, plain-text representation, read_build_logs scope, and suffix byte ranges.
- [Buildkite Artifacts API](https://buildkite.com/docs/apis/rest-api/artifacts): job-scoped listing, state/path filters, download URLs, and read_artifacts scope.
- [Buildkite Runs API](https://buildkite.com/docs/apis/rest-api/test-engine/runs): build UUID filtering, read_suites scope, run processing, and paginated failed executions.
- [Buildkite REST API overview](https://buildkite.com/docs/apis/rest-api): authentication and Link-based pagination; per_page maximum of 100.
- [Buildkite REST API rate limits](https://buildkite.com/docs/apis/rest-api/rate-limits): rate-limit response headers and retry handling.
- [Buildkite API access tokens](https://buildkite.com/docs/apis/managing-api-tokens): REST token permissions.
- [Buildkite build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts): upload prerequisites and artifact storage.
- [Buildkite Test Engine overview](https://buildkite.com/docs/pipelines/configure/tests): test collection as a separate source of structured results.
- [curl manual](https://curl.se/docs/manpage.html): fail, silent, show-error, header, get, data-urlencode, and location options; Authorization handling on redirects.
- [jq manual](https://jqlang.org/manual/): raw output, exit status, selection, TSV formatting, length, and error.
- [Bash simple command expansion](https://www.gnu.org/software/bash/manual/html_node/Simple-Command-Expansion.html): assignment exit status from command substitution.
- [Bash command lists](https://www.gnu.org/s/bash/manual/html_node/Lists.html): conditional execution with ||.
- Local curl 8.7.1, jq 1.6, Bash syntax checks, and Bash builtin help.

## Issues Found
1. **Earlier retry attempts were absent from the job-selection response.** The post advised selecting specific attempts or iterating over relevant jobs, but the unqualified build request omits earlier retried executions. Added include_retried_jobs=true to the build fetch and explained its purpose in the existing paragraph.
2. **Failed JSON extraction did not stop dependent commands.** jq -e and error() return failure, but the original assignment statements did not stop Bash. An invalid artifact selection could still reach curl, and failed build UUID extraction could lead to a request with an empty filter value. Added || exit 1 to both assignments so the dependent requests cannot run after extraction failure.

## Review Notes
- Verified the documented routes, scopes, response fields, and distinction between build numbers, build UUIDs, and job UUIDs. No deprecated API usage was found.
- Confirmed that log tails require text/plain and suffix ranges; empty logs can return HTTP 416, while successful range requests return HTTP 206.
- Confirmed the Test Engine result/processing distinction and structured failure fields. Pagination remains necessary for all three list resources described.
- All nine Bash blocks passed bash -n. Five JSON extraction filters passed local fixture checks. Artifact selection was checked for one valid match, zero matches, multiple matches, and a null download URL; failure cases stopped the simulated dependent action.
- No authenticated Buildkite requests were performed. Validation combines official documentation with local syntax and fixture checks, rather than an end-to-end run against a real build.
- Examples intentionally retrieve one page and use placeholder identifiers. Production pagination, bounded retries, and HTTP failure handling remain requirements already stated in the post.
