# Validation Summary: How to Create a Docker Build Pipeline with Earthly

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Earthly
- Earthfile syntax
- Docker and Docker images
- BuildKit caching
- Node.js and npm
- GitHub Actions
- Docker Hub authentication
- Multi-platform container builds

## Sources Consulted
- Earthly Introduction: https://docs.earthly.dev/
- Earthly Install documentation: https://docs.earthly.dev/install
- Earthly command reference: https://docs.earthly.dev/earthly-0.7/docs/earthly-command
- Earthfile reference: https://docs.earthly.dev/docs/earthfile
- Earthly built-in args documentation: https://docs.earthly.dev/docs/earthfile/builtin-args
- Earthly multi-platform builds guide: https://docs.earthly.dev/docs/guides/multi-platform
- Earthly GitHub Actions guide: https://docs.earthly.dev/ci-integration/vendor-specific-guides/gh-actions-integration
- Earthly debugging techniques guide: https://docs.earthly.dev/docs/guides/debugging
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- Earthly's official documentation now states that Earthly is no longer actively maintained. Added a short caveat in the "What is Earthly?" section so readers can evaluate that status before adopting it for new long-lived pipelines.
- Several examples used `SAVE IMAGE --push` but invoked Earthly without the CLI `--push` flag. Earthly requires `earthly --push ...` to actually push images marked with `SAVE IMAGE --push`, so the relevant local, full-pipeline, multi-platform, and GitHub Actions commands were updated.
- Remote cache examples used `--remote-cache` without `--push`. Earthly can read explicit remote cache with `--remote-cache`, but storing explicit cache requires `--push`, so the CI cache commands were corrected.
- The build-argument command used deprecated `--build-arg` syntax. Replaced it with the current target-reference syntax: `earthly --push +docker --APP_VERSION=... --REGISTRY=...`.
- The multi-platform Earthfile referenced `$TARGETPLATFORM` without declaring the built-in arg. Earthly requires built-in args to be pre-declared, so `ARG TARGETPLATFORM` was added.
- The snippets saved `dist` as `/dist` but copied it as `+build/dist`. Updated `SAVE ARTIFACT dist` so the artifact path matches the copy references.
- Replaced `npm ci --production` with `npm ci --omit=dev`, which matches current npm documentation for omitting development dependencies.
- Replaced the unsupported or undocumented `earthly --logstream` example with `earthly --verbose +build 2>&1 | tee build.log`.
- Clarified that CLI secrets must be consumed by a target with `RUN --secret`; passing `--secret` alone does not automatically expose it to build steps.

## Review Notes
The tutorial remains technically relevant, but readers should be aware that Earthly's official documentation currently says the project is no longer actively maintained. The integration-test example uses `WITH DOCKER` from a Node Alpine base image; Earthly documents that it can attempt to install Docker if `dockerd` is absent, but using a Docker-in-Docker base image is generally more predictable for production examples.
