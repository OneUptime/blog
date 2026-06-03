# How to Use Amplify with Monorepos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Monorepo, CI/CD

Description: A guide to deploying applications from monorepos with AWS Amplify, covering workspace configuration, build settings, and multi-app deployments.

---

Monorepos are everywhere now. Whether you're using Turborepo, Nx, Lerna, or plain npm/yarn workspaces, having multiple packages in a single repository makes sharing code easier. But deploying from a monorepo with Amplify requires some extra configuration.

The main challenge is that Amplify was originally designed for single-app repos. It expects your app to live at the root of the repository with a straightforward build process. When you've got packages scattered across directories with interdependencies, things need a bit more guidance.

## Monorepo Structure

A typical monorepo might look like this:

```text
my-monorepo/
  packages/
    shared-ui/        # Shared component library
    shared-utils/     # Shared utility functions
  apps/
    web/              # Next.js frontend
    admin/            # Admin dashboard
    api/              # Backend API
  package.json        # Root package.json
  turbo.json          # Turborepo config (or nx.json for Nx)
```

The goal is to deploy `apps/web` and `apps/admin` as separate Amplify apps, while both depend on `packages/shared-ui` and `packages/shared-utils`.

## Setting Up Amplify for a Monorepo App

When you connect your repo to Amplify, you need to tell it where your app lives and how to build it.

In the Amplify Console, when adding a new app:

1. Connect your repository
2. Select the branch
3. Select **My app is a monorepo** and specify the app's path inside the monorepo

You can set the app path to `apps/web` for your web app. Amplify will then use that path as the app root.

But here's the catch: if your app depends on packages outside its directory, you need to install dependencies from the repo root, not from the app directory.

## Build Configuration

The `amplify.yml` file needs to account for the monorepo structure. Place it at the root of your repository:

```yaml
# amplify.yml at repo root

version: 1
applications:
  - appRoot: apps/web
    frontend:
      buildPath: /
      phases:
        preBuild:
          commands:
            # Install dependencies from the root to resolve workspace packages
            - npm ci
            # Or if using yarn workspaces
            # - yarn install --frozen-lockfile
        build:
          commands:
            # Build shared packages first
            - npx turbo run build --filter=web...
            # Or just build the specific app
            # - npm run build
      artifacts:
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - apps/web/.next/cache/**/*
```

If you're using Turborepo, the build command leverages Turbo's dependency graph to build packages in the right order:

```bash
# This builds 'web' and all its dependencies
npx turbo run build --filter=web...
```

## npm Workspaces Configuration

For npm workspaces, your root `package.json` should define the workspace structure:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

Each app's `package.json` references shared packages:

```json
{
  "name": "web",
  "private": true,
  "dependencies": {
    "@myorg/shared-ui": "*",
    "@myorg/shared-utils": "*",
    "next": "^14.0.0",
    "react": "^18.0.0"
  },
  "scripts": {
    "build": "next build",
    "dev": "next dev"
  }
}
```

## Yarn Workspaces with Amplify

If you're on Yarn, the build configuration is slightly different:

```yaml
# amplify.yml for Yarn workspaces
version: 1
applications:
  - appRoot: apps/web
    frontend:
      buildPath: /
      phases:
        preBuild:
          commands:
            # Install from repo root with Yarn
            - yarn install --frozen-lockfile
        build:
          commands:
            - yarn turbo run build --filter=web...
      artifacts:
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .yarn/cache/**/*
```

For Yarn Berry (v2+), you might also need:

```yaml
        preBuild:
          commands:
            - corepack enable
            - yarn install --immutable
```

## pnpm Workspaces

pnpm is increasingly popular for monorepos. Amplify doesn't ship with pnpm by default, so you need to install it during the build. For pnpm workspace and Turborepo apps, Amplify also expects an `.npmrc` file at the project root with a hoisted node linker:

```text
node-linker=hoisted
```

```yaml
# amplify.yml for pnpm
version: 1
applications:
  - appRoot: apps/web
    frontend:
      buildPath: /
      phases:
        preBuild:
          commands:
            - corepack enable
            - corepack prepare pnpm@latest --activate
            - pnpm install --frozen-lockfile
        build:
          commands:
            - pnpm turbo run build --filter=web...
      artifacts:
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

## Deploying Multiple Apps from One Repo

You can deploy multiple Amplify apps from the same repository. Each app points to a different `appRoot`:

App 1 (Web Frontend):
```yaml
# In Amplify Console, set appRoot to apps/web
applications:
  - appRoot: apps/web
    frontend:
      buildPath: /
      phases:
        build:
          commands:
            - npx turbo run build --filter=web...
```

App 2 (Admin Dashboard):
```yaml
# In Amplify Console, set appRoot to apps/admin
applications:
  - appRoot: apps/admin
    frontend:
      buildPath: /
      phases:
        build:
          commands:
            - npx turbo run build --filter=admin...
```

Both apps share the same repository and build process, but deploy independently.

## Handling Backend Resources

If your Amplify backend (auth, API, storage) is shared across apps, put the `amplify/` directory at the monorepo root or in a shared location:

```text
my-monorepo/
  amplify/               # Shared backend
  apps/
    web/
    admin/
  packages/
    shared-ui/
```

In your build spec, reference the backend from each app:

```yaml
backend:
  phases:
    build:
      commands:
        - amplifyPush --simple
```

For Gen 2, deploy the shared backend as its own Amplify app, then have each frontend app generate outputs from that backend app:

```bash
npx ampx generate outputs --branch main --app-id BACKEND-APP-ID
```

## Build Caching

Monorepo builds can be slow. Use caching aggressively:

```yaml
frontend:
  cache:
    paths:
      # Root node_modules
      - node_modules/**/*
      # Turbo cache
      - .turbo/**/*
      # Next.js build cache
      - apps/web/.next/cache/**/*
      # TypeScript build info
      - packages/*/dist/**/*
```

Turborepo's remote caching can also speed things up significantly. Connect it to Vercel's cache or self-host a cache server:

```json
{
  "remoteCache": {
    "enabled": true
  },
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    }
  }
}
```

## Triggering Builds Only on Relevant Changes

By default, any push to your repo triggers a build for all connected Amplify apps. You can optimize this by enabling Amplify's diff-based frontend build and deploy feature.

In the Amplify Console, under "Hosting" > "Environment variables", set `AMPLIFY_DIFF_DEPLOY` to `true`. Amplify checks your `appRoot` for changes by default, and you can override the path with `AMPLIFY_DIFF_DEPLOY_ROOT` if needed:

```yaml
AMPLIFY_DIFF_DEPLOY: true
AMPLIFY_DIFF_DEPLOY_ROOT: apps/web
```

## Troubleshooting

**"Module not found" errors during build.** This usually means the workspace packages weren't linked correctly. Make sure you're running `npm ci` from the repo root, not from the app directory.

**Build works locally but fails in Amplify.** Check the Node.js version. Amplify's build image might use a different version. Set it explicitly:

```yaml
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 20
        - npm ci
```

**Shared packages not being transpiled.** If you're importing TypeScript from shared packages, make sure your bundler is configured to transpile them. For Next.js, use the `transpilePackages` option:

```javascript
// next.config.js
module.exports = {
  transpilePackages: ['@myorg/shared-ui', '@myorg/shared-utils'],
};
```

## Monitoring Multi-App Deployments

When you've got multiple apps deploying from one repo, tracking which deployments succeeded and which failed becomes important. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to monitor deployment health and set up alerts for build failures across your apps.

## Wrapping Up

Monorepos with Amplify work well once you get the build configuration right. The key is installing dependencies from the repo root, using a build tool like Turborepo to handle the dependency graph, and caching aggressively. Set up each app with its own `appRoot`, share backend resources where it makes sense, and use diff-based deploys to avoid unnecessary deployments. It takes a bit of upfront work, but the result is a streamlined deployment pipeline for your entire organization.
