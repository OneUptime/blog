# Validation Summary: How to Use Heredocs in Dockerfiles for Multi-Line Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile syntax
- BuildKit
- Heredocs / here-documents
- RUN and COPY instructions
- Nginx configuration
- Cron configuration
- Shell scripting

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Docker Engine 23.0 release notes: https://docs.docker.com/engine/release-notes/23.0/
- Local Docker BuildKit verification with Docker Server 29.4.2

## Issues Found
- The introduction said heredocs work in "RUN, COPY, and other instructions." The post later correctly scoped support to RUN and COPY, so the introduction was changed to match that.
- The bash-specific `RUN <<EOF bash` example used `${config[host]}` with an unquoted heredoc delimiter. In this form, `/bin/sh` can expand the heredoc before `bash` receives it, causing `Bad substitution`. Changed it to `RUN <<'EOF' bash`.
- The nginx `COPY <<EOF` example contained nginx variables such as `$uri`, `$host`, and `$remote_addr`. With an unquoted delimiter, Dockerfile variable expansion can remove or replace those values. Changed it to `COPY <<"EOF"`.
- The entrypoint script `COPY --chmod=755 <<EOF` example contained runtime environment expressions such as `${APP_ENV:-production}` and `${APP_PORT:-8000}`. With an unquoted delimiter, these can be expanded at build time instead of preserved for container startup. Changed it to `COPY --chmod=755 <<'EOF'`.
- The Node.js install `RUN <<EOF bash -e` example contained `$(node --version)`, which can be evaluated before the heredoc script reaches bash. Changed it to `RUN <<'EOF' bash -e`.
- The variable expansion explanation incorrectly attributed COPY heredoc expansion to the shell and overstated what delimiter quoting does for RUN scripts. Updated the wording to distinguish Dockerfile/frontend expansion from normal shell expansion inside executed scripts.

## Review Notes
The corrected heredoc examples were spot-checked with local Docker BuildKit builds. Other snippets are illustrative and may require surrounding application files or services, but the Dockerfile heredoc syntax and configuration formats are now technically sound.
