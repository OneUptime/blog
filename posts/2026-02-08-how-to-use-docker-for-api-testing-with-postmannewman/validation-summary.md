# Validation Summary: How to Use Docker for API Testing with Postman/Newman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Postman
- Newman
- Newman reporters
- GitHub Actions
- JUnit XML reports
- CSV iteration data

## Sources Consulted
- Postman Docs: Run Newman with Docker on macOS, Ubuntu, and Windows - https://learning.postman.com/docs/reference/newman-cli/newman-with-docker
- Postman Docs: Install and run Newman - https://learning.postman.com/docs/reference/newman-cli/installing-running-newman
- Postman Docs: Generate collection run reports with Newman built-in reporters - https://learning.postman.com/docs/collections/using-newman-cli/newman-built-in-reporters
- Postman Labs Newman CLI reference - https://github.com/postmanlabs/newman
- Docker Docs: Compose services reference, including `depends_on` and `healthcheck` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Control startup and shutdown order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI help for `docker compose up`
- Newman Docker image CLI help for `postman/newman:6-alpine`
- npm package documentation for `newman-reporter-htmlextra` - https://www.npmjs.com/package/newman-reporter-htmlextra

## Issues Found
- The Docker Compose examples used the top-level `version: "3.8"` field. Current Docker Compose treats the top-level `version` field as obsolete and emits a warning, so it was removed from both Compose snippets.
- The HTML report example first showed `htmlextra` running with the base `postman/newman:6-alpine` image. The base image includes Newman but not `newman-reporter-htmlextra`, so that command would fail in a fresh environment. The section now explains that `htmlextra` is external and uses the custom image flow before running the reporter.

## Review Notes
The remaining Newman commands, Docker image tag, Compose flags, healthcheck-dependent startup ordering, JUnit reporter options, environment variable override option, and CSV iteration data option were consistent with official documentation and local CLI help.
