# Validation Summary: How to Use MongoDB in GitLab CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (pipeline configuration, service containers, parallel jobs)
- MongoDB 7.0 (Docker image, authentication, mongosh)
- Node.js 20 (npm, Jest sharding)
- Python 3.12 (pytest, pymongo)
- Docker service containers

## Sources Consulted
- GitLab CI/CD `services` keyword documentation: https://docs.gitlab.com/ee/ci/services/
- GitLab CI/CD predefined variables (`CI_NODE_INDEX`, `CI_NODE_TOTAL`): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- Official MongoDB Docker image environment variables (`MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`): https://hub.docker.com/_/mongo
- MongoDB Shell (mongosh) installation docs: https://www.mongodb.com/docs/mongodb-shell/install/
- mongosh system requirements (glibc dependency, no Alpine/musl support): https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems
- pytest `--junitxml` flag documentation: https://docs.pytest.org/en/stable/how-to/output.html#creating-junitxml-format-files
- pymongo `MongoClient` API: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found

### 1. `mongosh` not available in `node:20-alpine` (Seeding section)
- **What was wrong:** The "Seeding Data Before Tests" section used `image: node:20-alpine` but called `mongosh` in `before_script`. The `mongosh` binary requires glibc (2.28+), but Alpine Linux uses musl libc. There is no official mongosh package for Alpine, and the binary will not run on Alpine without a glibc compatibility layer.
- **What was changed:** Changed the image from `node:20-alpine` to `node:20` (Debian Bookworm-based) and added installation steps for `mongosh` via the official MongoDB apt repository before the wait loop.
- **Why:** Without this fix, the pipeline would fail immediately at the `until mongosh ...` line with a "command not found" error.

### 2. Missing `--junitxml` flag in pytest command (Python section)
- **What was wrong:** The pipeline declared `artifacts.reports.junit: report.xml` to publish a JUnit test report, but the `pytest` command (`pytest tests/integration/ -v --tb=short`) did not include the `--junitxml=report.xml` flag needed to generate that file.
- **What was changed:** Added `--junitxml=report.xml` to the pytest command.
- **Why:** Without this flag, pytest does not produce a JUnit XML file, so the `report.xml` artifact would not exist and GitLab would not display test results in the merge request UI.

## Review Notes
- The "Parallel Test Jobs" section is a minimal snippet that omits `image`, `services`, and `variables` blocks. While it's clearly focused on demonstrating the `parallel` keyword and sharding syntax, readers should understand it needs to be combined with a full job definition (like the basic configuration section) to work.
- The global `MONGODB_URI` variable in the basic configuration uses `localhost` while the job-level variable correctly uses `mongo` (the service alias). This is technically fine since the job-level variable overrides the global one, but could be confusing to readers unfamiliar with GitLab CI variable precedence. Consider removing the global variable or adding a comment explaining the override.
- The `CI_NODE_INDEX` and `CI_NODE_TOTAL` predefined variables and the `--shard` flag syntax are correct for Jest test sharding.
- The pymongo code in the Python section uses correct, current API calls (`MongoClient`, `insert_one`, `find_one`, `delete_many`).
- Authentication section correctly uses `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD` environment variables, which GitLab CI passes to service containers via job-level `variables`.
