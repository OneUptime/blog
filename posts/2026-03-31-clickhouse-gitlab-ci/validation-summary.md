# Validation Summary: How to Set Up ClickHouse in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (versions 24.3 and 24.8 LTS)
- GitLab CI/CD (pipelines, services, jobs, artifacts, cache, extends, default, only)
- Docker service containers
- Python 3.12 (test runner image)
- pytest (with JUnit XML output)
- ClickHouse HTTP interface (`/ping`, port 8123)
- `clickhouse-client` CLI

## Sources Consulted
- GitLab CI/CD YAML reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab CI services keyword: https://docs.gitlab.com/ee/ci/services/
- GitLab `default`, `extends`, `cache`, `artifacts:reports:junit`, `only` keyword docs
- ClickHouse Docker image: https://hub.docker.com/r/clickhouse/clickhouse-server
- ClickHouse HTTP interface (`/ping` endpoint, default port 8123): https://clickhouse.com/docs/en/interfaces/http
- ClickHouse client documentation: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse APT package availability (packages.clickhouse.com)
- Official `python:3.12-slim` Dockerfile: https://github.com/docker-library/python/blob/master/3.12/slim-bookworm/Dockerfile
- `debian:bookworm-slim` package contents (Debian package index)

## Issues Found

1. **`schema-validation` job: `apt-get install -y clickhouse-client` would fail.**
   The default base image (`python:3.12-slim`) is Debian-based, and the `clickhouse-client` package is not present in Debian's standard repositories. It is published only via ClickHouse's own APT repo (`packages.clickhouse.com`), which would have to be added with a signed keyring before installation — a multi-step setup the post did not include.
   - **Fix:** Overrode the job's image to `clickhouse/clickhouse-server:24.3`, which already ships with `clickhouse-client`. The wait loop was switched from a `wget` HTTP ping to `clickhouse-client --query "SELECT 1"`, since the server image does not include `wget` either.

2. **All jobs using `wget`: `wget` is not present in `python:3.12-slim`.**
   The slim variant of the official Python image does not include `wget` (or `curl`) — `wget` is used during build only and stripped by the auto-remove purge. As written, every `wget -qO- http://clickhouse:8123/ping` readiness check on jobs running on the default `python:3.12-slim` image would fail with `wget: command not found`.
   - **Fix:** Added `apt-get update -q && apt-get install -y --no-install-recommends wget` as the first `before_script` step in the `integration-tests` job and the `.integration-base` template. (The `schema-validation` job no longer uses wget.)

## Review Notes
- The post uses the legacy `only:` keyword (`only: - main - merge_requests`). It still works in current GitLab versions, but `rules:` is the recommended replacement going forward. This is a stylistic / forward-compatibility note rather than a current bug, so no change was made.
- The `.staging-vars` template at the bottom is defined but never referenced by any actual job — it serves only as an illustrative snippet, which is acceptable in a tutorial.
- ClickHouse versions 24.3 and 24.8 are both valid LTS releases of ClickHouse.
- The `Caching Python Dependencies` snippet redefines the `integration-tests` job. In the same `.gitlab-ci.yml` this would override the earlier definition; the snippet is meant as an illustrative fragment to be merged into the main job, which is a common convention in tutorials.
