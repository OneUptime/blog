# Validation Summary: How to Containerize a Qwik Application with Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Qwik
- Qwik City
- Qwik City Node/Express adapter
- Qwik City static adapter
- Docker and multi-stage Docker builds
- Docker Compose
- Node.js
- Nginx
- PostgreSQL container health checks

## Sources Consulted
- Qwik Node Middleware deployment documentation: https://qwik.dev/docs/deployments/node/
- Qwik Node Docker deployment cookbook: https://qwik.dev/docs/cookbook/node-docker-deploy/
- Qwik `@builder.io/qwik-city/middleware/node` API reference: https://qwik.dev/api/qwik-city-middleware-node/
- Qwik environment variables guide: https://qwik.dev/docs/guides/env-variables/
- Qwik Static Site adapter documentation: https://qwik.dev/docs/deployments/static/
- Qwik speculative module fetching documentation: https://qwik.dev/docs/advanced/speculative-module-fetching/
- Qwik modules prefetching documentation: https://qwik.dev/docs/advanced/modules-prefetching/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The example project structure showed `server/dist/` as the server build output. Qwik's Node deployment docs describe the generated `server` folder as containing the Node server files. I changed this to `server/` to avoid implying a nested `server/dist` output.
- The Express adapter example manually served `dist/` with `express.static()` and did not use the `staticFile` middleware returned by `createQwikCity()`. The current Qwik Node middleware API returns `router`, `notFound`, and `staticFile`, with static serving configurable through the `static` option. I updated the example to use `staticFile` and a correct `dist` root.
- The Docker runtime examples omitted the `ORIGIN` environment variable. Qwik's Node deployment docs state that production deployments should set `ORIGIN` for Qwik City's CSRF origin checks. I added an explanation and included `ORIGIN` in both the `docker run` and Docker Compose examples.

## Review Notes
The static adapter command, Qwik server-side `env.get()` usage, Docker `HEALTHCHECK` syntax, Docker Compose `depends_on.condition: service_healthy`, and Qwik build output references for `dist/` and `q-manifest.json` are consistent with the consulted documentation. The image size numbers are plausible examples rather than guaranteed values; they can vary by dependency tree and base image version.
