# Validation Summary: How to Containerize an Ember.js Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker multi-stage builds
- Ember.js
- Ember CLI
- Nginx
- Node.js and npm

## Sources Consulted
- Ember CLI Guides: Deploying an Ember app - https://cli.emberjs.com/release/basic-use/deploying/
- Ember Guides: Specifying the URL Type - https://guides.emberjs.com/release/configuring-ember/specifying-url-type/
- Ember CLI Guides: CLI commands and testing - https://cli.emberjs.com/release/basic-use/cli-commands/
- Ember CLI Guides: Configuration and `.ember-cli` - https://cli.emberjs.com/release/appendix/configuration/
- Ember CLI Guides: Common issues and live reload ports - https://cli.emberjs.com/release/appendix/common-issues/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference for `ARG` and `ENV` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose file version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: npm `ci` command reference - https://docs.npmjs.com/cli/commands/npm-ci/
- NGINX Documentation: Serving static content and `try_files` - https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- Alpine Linux package contents for `chromium` - https://pkgs.alpinelinux.org/contents?name=chromium

## Issues Found
- The post said Ember Router operates in hash mode by default. Current Ember Guides say Ember CLI configures `history` by default, so the Nginx routing explanation was corrected.
- The `.dockerignore` example excluded `.ember-cli`. Ember CLI documents this as a project-level runtime configuration file, so it was removed from the ignore list to avoid silently dropping project CLI settings from Docker builds.
- The Compose examples used the top-level `version: "3.8"` field. Docker now marks this field obsolete and informational, so it was removed from both Compose snippets.
- The development workflow described port 7020 as Ember CLI's default live reload port. Official Ember CLI docs do not define a fixed default, so the dev Dockerfile now explicitly sets `--live-reload-port 7020`, and the explanatory text was updated.
- The testing command tried to run `npx ember test` from an image tag that had not been built and did not account for Ember CLI's default Headless Chrome test runner. The section now uses a `test` Dockerfile stage, installs Chromium, sets `CHROME_BIN`, and builds that stage with `docker build --target test`.

## Review Notes
The remaining Dockerfile, Nginx, build argument, `npm ci`, and Ember production build examples are technically valid for the documented workflow. In future updates, the article could consider using current image tags instead of pinned older examples such as `nginx:1.25-alpine`, but that tag is not itself technically invalid.
