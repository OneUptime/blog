# Validation Summary: How to Containerize a Gleam Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Gleam
- Docker
- Docker Compose
- Erlang / BEAM
- Wisp
- Mist
- Erlang shipment export
- Node.js JavaScript target

## Sources Consulted
- Gleam command-line reference: https://gleam.run/command-line-reference/
- Gleam deployment guide for Linux servers: https://gleam.run/deployment/linux-server/
- Gleam writing guide for environment-variable packages and dependency manifests: https://gleam.run/writing-gleam
- Wisp documentation: https://wisp.hexdocs.pm/
- Wisp Mist adapter documentation: https://wisp.hexdocs.pm/wisp/wisp_mist.html
- Mist documentation: https://hexdocs.pm/mist/mist.html
- Gleam JSON documentation: https://hexdocs.pm/gleam_json/gleam/json.html
- Envoy documentation: https://hexdocs.pm/envoy/envoy.html
- Gleam stdlib result documentation: https://hexdocs.pm/gleam_stdlib/gleam/result.html
- Gleam HTTP documentation: https://hexdocs.pm/gleam_http/gleam/http.html
- Erlang `erl` command documentation: https://www.erlang.org/docs/26/man/erl
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/building/context/
- Dockerfile reference: https://docs.docker.com/reference/builder

## Issues Found
- The sample project name `gleam_docker_demo` is no longer accepted by current Gleam because the `gleam_` prefix is reserved for official packages. Changed it to `docker_demo` and updated module/file/output paths accordingly.
- Dependency versions were outdated for current Gleam, Wisp, Mist, Gleam JSON, Gleam HTTP, and Gleam Erlang packages. Updated version constraints and added `envoy` for environment variables.
- The tutorial manually edited `gleam.toml` but later Dockerfiles copied `manifest.toml`. Added `gleam deps download` after the dependency edit so the manifest is generated and kept in sync.
- The main module imported `gleam/erlang/os`, used `result.then`, called `mist.start_http`, and referenced an unimported `handle_request`. Updated the code to use `envoy.get`, `result.try`, `mist.start`, `router.handle_request`, and the current Wisp/Mist adapter pipeline.
- The server did not bind to `0.0.0.0`, which would prevent normal access through Docker port publishing. Added `mist.bind("0.0.0.0")`.
- JSON response code used older `gleam_json` APIs and manual content-type headers. Updated it to `json.to_string` and `wisp.json_body`.
- Docker image tags were pinned to old Gleam and runtime versions. Updated Gleam images to `v1.14.0`, Erlang runtime to the Erlang 28 Alpine family, and Node runtime to `node:24-alpine`.
- The Erlang shipment explanation incorrectly described the output as fully self-contained and implied the runtime was included. Clarified that the shipment contains compiled app/dependency files and start scripts, but still needs a compatible Erlang runtime.
- The shipment contents example listed `lib/` and `erl_args`, which did not match current `gleam export erlang-shipment` output. Updated the example to show `entrypoint.sh`, `entrypoint.ps1`, the app directory, and dependency directories.
- The `.dockerignore` excluded `test/`, which would break the later Docker test stage that runs `gleam test` after `COPY . .`. Removed `test/` from the ignore snippet.
- The Compose file used the legacy top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- The JavaScript-target section implied the Wisp/Mist BEAM app could be compiled to JavaScript. Added a caveat that the shown server is BEAM-specific and the JavaScript Dockerfile applies to JavaScript-compatible Gleam projects.
- The fault-tolerance section overstated automatic restarts for all crashed BEAM processes. Clarified that supervised processes can be restarted by supervisors.

## Review Notes
- Verified the corrected BEAM sample with `ghcr.io/gleam-lang/gleam:v1.14.0-erlang-alpine`: `gleam build` and `gleam export erlang-shipment` both succeeded.
- Verified `ghcr.io/gleam-lang/gleam:v1.14.0-node-alpine` exists and that current JavaScript builds output modules under `build/dev/javascript/<package>/<package>.mjs`.
- Attempted to pull `erlang:28-alpine`, but Docker Hub unauthenticated pull limits blocked that check. The selected Erlang 28 runtime family matches the OTP version reported by the current Gleam Erlang image and the official Gleam deployment guide.
