# How to Use Amplify with Monorepos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Monorepo, CI/CD

Description: A guide to deploying applications from monorepos with AWS Amplify, covering workspace configuration, build settings, and multi-app deployments.

---

Monorepos are everywhere now. Whether you're using Turborepo, Nx, Lerna, or plain npm/yarn workspaces, having multiple packages in a single repository makes sharing code easier. But deploying from a monorepo with Amplify requires some extra configuration.

The main challenge is that Amplify was originally designed for single-app repos. It expects your app to live at the root of the repository with a straightforward build process. When you've got packages scattered across directories with interdependencies, things need a bit more guidance.

## Monorepo Structure

A typical monorepo might look like this:

```
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
3. In the build settings, specify the **monorepo root directory**

You can set the root directory to `apps/web` for your web app. Amplify will then treat that directory as the project root.

But here's the catch: if your app depends on packages outside its directory, you need to install dependencies from the repo root, not from the app directory.

## Build Configuration

The `amplify.yml` file needs to account for the monorepo structure. Place it at the root of your repository:

```yaml
# amplify.yml at repo root
version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            # Install dependencies from the root to resolve workspace packages
            - npm ci --prefix ../../
            # Or if using yarn workspaces
            # - cd ../../ && yarn install --frozen-lockfile
        build:
          commands:
            # Build shared packages first
            - cd ../../ && npx turbo run build --filter=web...
            # Or just build the specific app
            # - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - ../../node_modules/**/*
          - .next/cache/**/*
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
      phases:
        preBuild:
          commands:
            # Install from repo root with Yarn
            - cd ../../ && yarn install --frozen-lockfile
        build:
          commands:
            - cd ../../ && yarn turbo run build --filter=web...
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - ../../node_modules/**/*
          - ../../.yarn/cache/**/*
```

For Yarn Berry (v2+), you might also need:

```yaml
        preBuild:
          commands:
            - cd ../../
            - corepack enable
            - yarn install --immutable
```

## pnpm Workspaces

pnpm is increasingly popular for monorepos. Amplify doesn't ship with pnpm by default, so you need to install it during the build:

```yaml
# amplify.yml for pnpm
version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            - cd ../../
            - corepack enable
            - corepack prepare pnpm@latest --activate
            - pnpm install --frozen-lockfile
        build:
          commands:
            - cd ../../ && pnpm turbo run build --filter=web...
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - ../../node_modules/**/*
```

## Deploying Multiple Apps from One Repo

You can deploy multiple Amplify apps from the same repository. Each app points to a different `appRoot`:

App 1 (Web Frontend):
```yaml
# In Amplify Console, set appRoot to apps/web
applications:
  - appRoot: apps/web
    frontend:
      phases:
        build:
          commands:
            - cd ../../ && npx turbo run build --filter=web...
```

App 2 (Admin Dashboard):
```yaml
# In Amplify Console, set appRoot to apps/admin
applications:
  - appRoot: apps/admin
    frontend:
      phases:
        build:
          commands:
            - cd ../../ && npx turbo run build --filter=admin...
```

Both apps share the same repository and build process, but deploy independently.

## Handling Backend Resources

If your Amplify backend (auth, API, storage) is shared across apps, put the `amplify/` directory at the monorepo root or in a shared location:

```
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
        - cd ../../amplify && amplifyPush --simple
```

For Gen 2, the backend definition in `amplify/` at the repo root works naturally since it's just TypeScript that gets compiled.

## Build Caching

Monorepo builds can be slow. Use caching aggressively:

```yaml
frontend:
  cache:
    paths:
      # Root node_modules
      - ../../node_modules/**/*
      # Turbo cache
      - ../../.turbo/**/*
      # Next.js build cache
      - .next/cache/**/*
      # TypeScript build info
      - ../../packages/*/dist/**/*
```

Turborepo's remote caching can also speed things up significantly. Connect it to Vercel's cache or self-host a cache server:

```json
// turbo.json
{
  "remoteCache": {
    "enabled": true
  },
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

## Triggering Builds Only on Relevant Changes

By default, any push to your repo triggers a build for all connected Amplify apps. You can optimize this by configuring build triggers to only fire when relevant files change.

In the Amplify Console, under "Build settings", set up a custom build trigger:

```yaml
# Only rebuild the web app if files in these paths changed
frontend:
  phases:
    preBuild:
      commands:
        - |
          # Check if relevant files changed
          if git diff --name-only HEAD~1 | grep -qE '^(apps/web|packages/shared)'; then
            echo "Changes detected, building..."
          else
            echo "No relevant changes, skipping build"
            exit 0
          fi
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
        - npm ci --prefix ../../
```

**Shared packages not being transpiled.** If you're importing TypeScript from shared packages, make sure your bundler is configured to transpile them. For Next.js, use the `transpilePackages` option:

```javascript
// next.config.js
module.exports = {
  transpilePackages: ['@myorg/shared-ui', '@myorg/shared-utils'],
};
```

## Monitoring Multi-App Deployments

When you've got multiple apps deploying from one repo, tracking which deployments succeeded and which failed becomes important. Use [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alarms/view) to monitor deployment health and set up alerts for build failures across your apps.

## Wrapping Up

Monorepos with Amplify work well once you get the build configuration right. The key is installing dependencies from the repo root, using a build tool like Turborepo to handle the dependency graph, and caching aggressively. Set up each app with its own `appRoot`, share backend resources where it makes sense, and use build triggers to avoid unnecessary deployments. It takes a bit of upfront work, but the result is a streamlined deployment pipeline for your entire organization.
