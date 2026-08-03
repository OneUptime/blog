# One Dockerfile for Dev, Test, and Production with Compose Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Multi-Stage Builds, Dockerfile, Development, Testing, Production

Description: Model development, test, build, and production images as named Dockerfile stages, then select the intended stage explicitly from Compose configurations.

---

A single Dockerfile can describe several related images without forcing production to contain developer tools. The key is to name each meaningful stage and make Compose's `build.target` select one of those exact names.

This is more predictable than passing an environment name into a long conditional `RUN`. BuildKit sees real stage dependencies, each image has a clear contract, and the production stage copies only prepared runtime artifacts.

## Design the Stage Graph

For a Node.js service, start with common metadata, then branch by purpose:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM development AS test
ENV NODE_ENV=test
CMD ["npm", "test"]

FROM development AS build
RUN npm run build \
    && npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

The graph is intentional:

- `development` has source code, development dependencies, and a live-reload command;
- `test` inherits exactly that toolchain but changes the default command and environment;
- `build` creates distribution files and removes development dependencies;
- `production` starts from a fresh runtime base and copies only runtime inputs.

Building `production` does not include the `development` stage's base layers in the final image. It does depend on the stage as a producer, so BuildKit executes the necessary path and copies selected files.

## Select Development in the Base Compose File

```yaml
services:
  api:
    image: example-api:dev
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - 3000:3000
    volumes:
      - .:/app
      - api_node_modules:/app/node_modules
    environment:
      NODE_ENV: development

volumes:
  api_node_modules:
```

The named volume prevents the host bind mount from replacing the container's installed `node_modules`. Whether this pattern is appropriate depends on the package manager and host platform, but the build target itself is unambiguous.

Run it with:

```bash
docker compose up --build api
```

Compose's build specification defines `target` as the stage to build in a multi-stage Dockerfile. The value is a Dockerfile stage alias, not a Compose service name and not an arbitrary environment label.

## Add a Test Service

```yaml
services:
  api-test:
    profiles: [test]
    build:
      context: .
      target: test
    command: ["npm", "test", "--", "--runInBand"]
```

Run the test-specific service explicitly:

```bash
docker compose --profile test run --rm api-test
```

The Compose `command` overrides the Dockerfile `CMD`; it does not change the selected stage. If tests must be a build gate rather than a runnable image, put `RUN npm test` in a separate validation stage and target it in CI.

## Override the Target for Production

Keep development conveniences out of a production override:

```yaml
# compose.production.yaml
services:
  api:
    image: registry.example.com/acme/api:${IMAGE_TAG:?set IMAGE_TAG}
    build:
      context: .
      target: production
    volumes: !reset []
    ports: !reset []
    environment:
      NODE_ENV: production
```

Render and build the merged model:

```bash
docker compose \
  -f compose.yaml \
  -f compose.production.yaml \
  config

docker compose \
  -f compose.yaml \
  -f compose.production.yaml \
  build api
```

Always inspect `docker compose config` when using overrides. Compose merges mappings and sequences according to its model; a plain empty list does not necessarily erase values inherited from the base file. The Compose Specification defines the custom `!reset` tag for replacing a field with its type's default value, so `!reset []` deliberately removes the development mounts and published port. Verify bind mounts, ports, secrets, and environment values in the rendered output.

## Avoid Conditional Mega-Stages

This obscures the graph and can accidentally persist tools:

```dockerfile
ARG BUILD_MODE=production
RUN if [ "$BUILD_MODE" = development ]; then install-debug-tools; fi
```

Prefer named branches:

```dockerfile
FROM base AS development
RUN install-debug-tools

FROM base AS production
COPY --from=build /app/dist /app/dist
```

The aliases are reviewable, targetable, and cacheable. They also let CI build the exact test stage and deployment build the exact production stage from the same file.

## Verify Every Contract

Build targets independently:

```bash
docker build --target development --tag example-api:dev .
docker build --target test --tag example-api:test .
docker build --target production --tag example-api:prod .
```

Check that the development image has its tools, the test image runs without host-only files, and the production image runs as non-root without source or dev dependencies. One Dockerfile is useful only when each named output remains a deliberately tested product.

## Official Documentation

- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Compose Build Specification and target attribute](https://docs.docker.com/reference/compose-file/build/#target)
- [Docker Compose build command](https://docs.docker.com/reference/cli/docker/compose/build/)
- [Docker guide to building Compose projects with Bake](https://docs.docker.com/guides/compose-bake/)
- [Docker Compose merge rules](https://docs.docker.com/reference/compose-file/merge/)
