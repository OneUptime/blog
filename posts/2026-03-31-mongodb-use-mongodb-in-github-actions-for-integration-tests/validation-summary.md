# Validation Summary: How to Use MongoDB in GitHub Actions for Integration Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB 6.0 and 7.0
- GitHub Actions (service containers, matrix strategy)
- mongosh (MongoDB Shell)
- Node.js (test runner)
- codecov/codecov-action@v4
- Docker (service containers)

## Sources Consulted
- MongoDB Shell (mongosh) documentation — https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB Shell scripting documentation — https://www.mongodb.com/docs/mongodb-shell/write-scripts/
- GitHub Actions service containers documentation — https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- GitHub Actions runner-images installed software — https://github.com/actions/runner-images
- GitHub issue actions/runner-images#6626 (mongosh removal from ubuntu-22.04)
- Official MongoDB Docker image documentation — https://hub.docker.com/_/mongo
- codecov/codecov-action v4 documentation — https://github.com/codecov/codecov-action

## Issues Found
1. **mongosh not available on GitHub Actions runner** — The "Seed test data" step runs `mongosh` directly on the `ubuntu-latest` runner, but `mongosh` is not pre-installed on Ubuntu 22.04/24.04 runner images (it was only on the now-deprecated Ubuntu 20.04 image). The step would fail with "command not found". Fixed by adding an `npm install -g mongosh` step before the seeding step, leveraging the Node.js environment already configured in the workflow.

## Review Notes
- The `--file` flag used with mongosh is valid and actually recommended over passing filenames as bare positional arguments, per official MongoDB documentation.
- The `file` parameter (singular) in codecov-action v4 is valid for single coverage files, though `files` (plural) is also accepted and more commonly shown in examples.
- The section titled "Caching with Matrix Strategy" only demonstrates matrix strategy for testing multiple MongoDB versions — no caching configuration is shown. The title is slightly misleading but the code is correct.
- Health check commands correctly use `mongosh` which is available inside the `mongo:7.0` container image (as opposed to the deprecated `mongo` shell).
