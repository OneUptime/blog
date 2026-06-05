# Validation Summary: How to Containerize a SvelteKit Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- SvelteKit
- Svelte
- Node.js
- @sveltejs/adapter-node
- Vite
- Prisma
- WebSockets

## Sources Consulted
- SvelteKit adapter-node documentation: https://svelte.dev/docs/kit/adapter-node
- SvelteKit adapters documentation: https://svelte.dev/docs/kit/adapters
- SvelteKit hooks documentation: https://svelte.dev/docs/kit/hooks
- SvelteKit $env/dynamic/private documentation: https://svelte.dev/docs/kit/$env-dynamic-private
- SvelteKit $env/dynamic/public documentation: https://svelte.dev/docs/kit/$env-dynamic-public
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Node.js release schedule: https://github.com/nodejs/Release
- Prisma Docker guide: https://www.prisma.io/docs/guides/deployment/docker
- Prisma CLI installation documentation: https://www.prisma.io/docs/concepts/components/prisma-cli/installation/

## Issues Found
- The SvelteKit adapter configuration used unsupported `host` and `port` options. Removed those options because adapter-node is configured with `out`, `precompress`, and `envPrefix`; runtime host and port are set with `HOST` and `PORT` environment variables.
- The post said SvelteKit's default adapter targets static hosting. Updated this to refer to projects using `adapter-auto` or `adapter-static`, since current SvelteKit projects commonly use adapter-auto unless changed.
- The Dockerfile used `node:20-alpine`, but Node.js 20 is EOL as of April 30, 2026. Updated examples to `node:24-alpine`, the current active LTS line on the validation date.
- The Alpine user/group creation commands used unsupported BusyBox long options such as `--system`, `--gid`, `--uid`, and `--ingroup`. Replaced them with Alpine-supported short flags.
- The post described `build/index.js` as an Express-based server. Corrected this to a self-contained Node server and noted that `build/handler.js` can be used with Express, Connect, Polka, or Node's HTTP server.
- The dependency explanation said adapter-node bundles most dependencies. Adjusted this to match SvelteKit documentation: development dependencies are bundled, while production dependencies remain in `node_modules`.
- The Prisma snippet ran `npx prisma generate` after pruning dev dependencies, which can fail because the Prisma CLI is normally installed as a dev dependency. Moved generation before `npm prune --omit=dev`.
- The WebSocket section referenced a non-existent `handleWebsocket` hook and implied `envPrefix` enables WebSocket support. Replaced it with a custom Node server example that attaches a `ws` WebSocket server to SvelteKit's handler.
- The WebSocket example imported `ws` without installing it. Added the `npm install ws` command before the example.

## Review Notes
The Docker Compose `depends_on` health condition, Docker `HEALTHCHECK` syntax, SvelteKit dynamic environment variable imports, and `ORIGIN` guidance are consistent with the consulted documentation. Image sizes remain approximate and can vary based on dependency set and base image updates.
