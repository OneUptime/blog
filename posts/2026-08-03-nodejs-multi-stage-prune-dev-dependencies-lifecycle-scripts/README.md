# Node.js Multi-Stage Builds: Prune Dev Dependencies Without Script Reruns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, npm, Docker, Multi-Stage Builds, Dev Dependencies, Lifecycle Scripts, BuildKit

Description: Install once for the build, run the application build explicitly, prune development packages without lifecycle hooks, and copy a target-compatible production tree.

---

A Node.js image often needs development dependencies to compile TypeScript or bundle assets, but those packages do not belong in production. Re-running `npm ci --omit=dev` after the build creates a second installation and can invoke dependency lifecycle scripts again unless script execution is disabled.

npm's `prune` command can remove packages listed in `devDependencies` from the existing tree. Its documented `--ignore-scripts` option prevents package scripts from running during that prune operation.

## Install, Build, Then Prune

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

The sequence is important:

1. `npm ci` installs exactly from the lock file and removes any pre-existing `node_modules` in that stage.
2. `npm run build` explicitly runs the project's build script while development tools are present.
3. `npm prune --omit=dev` removes development dependencies from disk.
4. `--ignore-scripts` prevents prune-time lifecycle execution.
5. The final stage copies only the pruned tree, manifests, and built application.

The build cache mount speeds downloads but is not copied into the image layer. It is separate from `node_modules`, so pruning packages does not discard the shared download cache.

## Understand What `--ignore-scripts` Does

npm documents `ignore-scripts` as preventing scripts from `package.json` files for commands such as install and prune. Commands explicitly intended to run a script, including `npm run`, still run the requested script, while their pre- and post-scripts are suppressed if the configuration applies to that invocation.

In the Dockerfile above, `--ignore-scripts` is attached only to `npm prune`. It does not retroactively affect the earlier `npm ci`, and it does not prevent the previous `npm run build`.

This distinction matters for native dependencies. A production dependency may need its `install` or `postinstall` hook during the initial `npm ci` to compile or download a target binary. If the initial install also uses `--ignore-scripts`, that dependency can be present but unusable. Review lifecycle scripts and npm's newer script-approval controls instead of disabling all initial scripts without testing.

The cache-friendly ordering also assumes the root project's install-time scripts do not need source files that have not been copied yet. If the application defines such a hook, copy its required inputs before `npm ci`, or redesign the hook so dependency installation and application compilation remain explicit steps.

## Why Not Install Production Dependencies Again?

This alternative is valid when a clean second install is the desired security boundary:

```dockerfile
RUN npm ci --omit=dev --ignore-scripts
```

But it does not preserve install artifacts created during the full dependency install, and `--ignore-scripts` means required production install hooks will not run. Omitting `--ignore-scripts` allows those hooks to run again. Choose intentionally:

- prune when the fully installed tree is target-compatible and should be reduced without re-running hooks;
- use a fresh production install when you want to prove the runtime tree can be constructed independently, and permit or approve the hooks it genuinely requires.

Do not replace `npm ci` with an unlocked `npm install` merely to work around a failing lifecycle script. `npm ci` requires a lock file consistent with `package.json` and fails instead of updating it.

## Keep Native Addons on the Target Platform

Copying `node_modules` is safe only when builder and runtime have compatible Node ABI, OS, CPU architecture, and libc. Keep both stages on the same Node image family and build under the intended target platform.

Do not copy host `node_modules` into the build context. Add it to `.dockerignore`:

```text
node_modules
npm-debug.log*
```

An addon built on macOS, glibc Linux, or ARM64 does not become musl Linux or AMD64 because it was copied into an image with that label.

## Validate the Pruned Tree

Add checks after pruning:

```dockerfile
RUN npm ls --omit=dev \
    && node -e 'require("./dist/server.js")'
```

Only use the `require` smoke test if importing the module does not start a long-running server or require production-only configuration. Otherwise expose a dedicated application self-test.

Compare size and package inventory in the final image, then execute its real startup path as the configured non-root user. For npm workspaces, run install and prune from the workspace root and test every packaged workspace; workspace selection changes which dependency tree npm operates on.

The goal is not simply fewer directories. It is a lockfile-derived, target-compatible runtime tree whose necessary lifecycle outputs were created once and whose dev-only tools are absent.

## Official Documentation

- [npm ci documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm prune documentation](https://docs.npmjs.com/cli/v11/commands/npm-prune/)
- [npm scripts and lifecycle order](https://docs.npmjs.com/cli/v11/using-npm/scripts/)
- [npm package script controls](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Docker cache mounts](https://docs.docker.com/build/cache/optimize/#use-cache-mounts)
