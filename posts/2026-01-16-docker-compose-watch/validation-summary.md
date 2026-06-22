# Validation Summary: How to Use Docker Compose Watch for Live Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Docker Compose Watch
- Docker Compose Develop Specification
- Dockerfile multi-stage builds
- Node.js / npm
- Flask / Python
- Go
- React / Vue frontend development
- PostgreSQL and Redis containers

## Sources Consulted
- Docker Docs: Use Compose Watch - https://docs.docker.com/compose/how-tos/file-watch/
- Docker Docs: Compose Develop Specification - https://docs.docker.com/reference/compose-file/develop/
- Docker Docs: docker compose up CLI reference - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Flask Documentation: Command Line Interface - https://flask.palletsprojects.com/en/stable/cli/
- npm Docs: npm config, deprecated `only` / `production` aliases - https://docs.npmjs.com/cli/v7/using-npm/config/
- npm Docs: npm install `omit` option - https://docs.npmjs.com/cli/v9/commands/npm-install/

## Issues Found
- The Compose examples used the obsolete top-level `version: '3.8'` field. Docker Compose now treats `version` as informational only and warns that it is obsolete, so the examples were updated to start at `services:`.
- The post presented the three shown watch actions as though they were the full set. Current Docker Compose also documents `restart` and `sync+exec`, so the section labels were changed to "Common Compose Watch Actions" and "Common Watch Actions" while preserving the post's focus.
- The Go example used `path: ./*.go`. Current Compose documentation presents file selection with `path` plus `include`, so this was changed to `path: .` with `include: "*.go"`.
- The production Dockerfile used `npm ci --only=production`. npm marks the `only=production` alias as deprecated in favor of `--omit=dev`, so the command was updated to `npm ci --omit=dev`.
- The best-practices example claimed watch rule order matters for overlapping paths. The official docs do not document rule ordering as a way to resolve overlaps, so the example was changed to use a narrower config path plus an `ignore: config/` rule on the broader source sync.

## Review Notes
The remaining examples are illustrative and depend on each application's Dockerfile, working directory, package scripts, and reload tooling. Compose Watch also requires Docker Compose 2.22.0 or later, and `sync+restart` requires Docker Compose 2.23.0 or later.
