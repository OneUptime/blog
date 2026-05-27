# Validation Summary: How to Set Up Cloud Build to Run Unit Tests Before Deploying to Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build configuration files
- Cloud Run
- Docker and Artifact Registry
- Node.js
- Python and pytest
- Go
- Java and Maven
- Jest
- Vitest
- PostgreSQL
- Google Cloud Storage

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build overview and Docker network behavior: https://docs.cloud.google.com/build/docs/overview
- Google Cloud Build bash scripts: https://docs.cloud.google.com/build/docs/configuring-builds/run-bash-scripts
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build deploying to Cloud Run: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run source deployment documentation: https://docs.cloud.google.com/run/docs/deploying-source-code
- Node.js release schedule and EOL policy: https://nodejs.org/en/about/releases/
- Go release history and support policy: https://go.dev/doc/devel/release
- Go race detector documentation: https://go.dev/doc/articles/race_detector.html
- Jest CLI options: https://jestjs.io/docs/cli
- Jest `jest.retryTimes` API: https://jestjs.io/docs/en/jest-object#jestretrytimesnumretries-options
- Vitest reporters and output file documentation: https://vitest.dev/guide/reporters
- pytest-rerunfailures documentation: https://pytest-rerunfailures.readthedocs.io/stable/
- Apache Maven command line reference: https://maven.apache.org/ref/3-LATEST/maven-embedder/cli.html

## Issues Found
- The examples used `node:20`, which is end-of-life as of April 30, 2026. I updated Node.js examples to `node:24`, the current Active LTS line on the validation date.
- The Go example used `golang:1.22`, which is outside Go's supported release window now that Go 1.25 and 1.26 are supported. I updated it to `golang:1.26`.
- The PostgreSQL database example included `options: pool: {}` with a comment saying it was required for Docker networking. Cloud Build's `cloudbuild` network is available by default; `pool` is for private pool configuration. I removed the misleading block.
- The test report example used `|| true` before reading `$?`, which would always record a successful exit status. I rewrote the example to capture the real test result, upload the report, and then fail the build if the tests failed.
- The original report commands mixed generic `npm test` usage with reporter flags that are not portable across Node test runners. I changed the example to a Vitest-specific JUnit report command using documented `--reporter=junit` and `--outputFile`.
- The Jest flaky-test example claimed to retry failed tests but only ran `--forceExit --detectOpenHandles`, which does not retry tests and is intended for open handle debugging. I changed the text to require `jest.retryTimes(3)` configuration before running Jest.
- The Jest path filtering examples used the older `--testPathPattern` flag. I updated them to the current documented `--testPathPatterns` flag.
- One snippet said "deploy" but only built and published a Docker image via the `images` field. I changed the comment to "Build only if both lint and test pass."

## Review Notes
- The Cloud Build step ordering, `waitFor`, substitution variables, `images` publishing, Cloud Run deploy commands, `go test -race`, Maven `-B`, and pytest rerun examples are consistent with current documentation.
- The report upload example assumes the Cloud Build service account has permission to write to the target Cloud Storage bucket.
