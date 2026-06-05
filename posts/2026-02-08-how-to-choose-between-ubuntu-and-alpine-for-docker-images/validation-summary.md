# Validation Summary: How to Choose Between Ubuntu and Alpine for Docker Images

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfiles
- Ubuntu 22.04 LTS
- Alpine Linux
- apt / apt-cache
- apk
- glibc
- musl
- Bundler
- npm
- Go
- Node.js
- Trivy

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker CLI help from Docker 29.4.2 for `docker pull`, `docker images`, and `docker build`
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Alpine Linux BusyBox documentation: https://wiki.alpinelinux.org/wiki/BusyBox
- Alpine `apk` CLI help from `alpine:3.23`
- Ubuntu 22.04 LTS release notes: https://documentation.ubuntu.com/release-notes/22.04/
- Ubuntu package listings for Jammy Ruby packages: https://packages.ubuntu.com/jammy/ruby/
- Bundler `bundle install` manual: https://bundler.io/man/bundle-install.1.html
- npm `ci` command documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Local npm 10.9.4 CLI help for `npm ci --omit`
- Go release history and support policy: https://go.dev/doc/devel/release
- Docker Hub official `golang` image documentation: https://hub.docker.com/_/golang/
- Node.js release schedule: https://github.com/nodejs/release
- Docker Hub official `node` image documentation: https://hub.docker.com/_/node

## Issues Found
- The post used `alpine:3.19`, which reached end of support on 2025-11-01. Updated Alpine examples to `alpine:3.23`, a supported branch as of 2026-06-05.
- The base image size example was stale. Updated the sample `docker images` output to current local Docker 29.4.2 output for `ubuntu:22.04` and `alpine:3.23`, and changed the ratio from 10x to roughly 9x.
- The Ubuntu package search example ran `apt-cache search` without first refreshing package indexes in a fresh container. Updated it to run `apt-get update` before `apt-cache search`.
- The Alpine package search example used the unsupported `alpine:3.19` tag. Updated it to `alpine:3.23` and included `apk update` before the search so repository indexes are available.
- The installed package count comments were stale. Updated them to the observed current counts for `ubuntu:22.04` and `alpine:3.23`.
- The CVE scan example gave fixed Trivy counts, which are time-sensitive and can become inaccurate as CVE databases and images change. Replaced the fixed counts with a note that results vary over time.
- The Rails Dockerfile used `bundle install --without`, which Bundler documents as deprecated. Replaced it with `bundle config set without 'development test' && bundle install`.
- The Rails Dockerfile relied on `bundle` while installing packages with `--no-install-recommends`. Added `ruby-bundler` to make the command available explicitly.
- The Go Dockerfile used `golang:1.22-alpine`, an unsupported Go line by the 2026-06-05 review date. Updated it to `golang:1.26-alpine`.
- The Node.js comparison used `node:20-alpine`, and Node.js 20 reached EOL on 2026-04-30. Updated it to `node:24-alpine`.
- The Node.js examples used `npm ci --only=production`. Updated them to `npm ci --omit=dev`, which is the current npm-supported form.

## Review Notes
The example image sizes and Trivy results are inherently time-sensitive. The post is now technically correct for the review date, but those values should be rechecked when the post is refreshed.
