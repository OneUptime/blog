# Validation Summary: How to Use Amplify with Monorepos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- AWS Amplify Gen 1 and Gen 2 backends
- Monorepos
- npm workspaces
- Yarn workspaces
- pnpm workspaces
- Turborepo
- Next.js
- CI/CD build configuration

## Sources Consulted
- AWS Amplify Hosting: Configuring monorepo build settings: https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html
- AWS Amplify Hosting: Editing the build specification: https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html
- AWS Amplify Gen 2: Monorepo setup: https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/monorepos/
- Turborepo configuration reference: https://turborepo.dev/docs/reference/configuration
- Turborepo `run` command and filter syntax: https://turborepo.dev/docs/reference/run
- npm workspaces documentation: https://docs.npmjs.com/cli/v8/using-npm/workspaces/
- pnpm install command reference: https://pnpm.io/cli/install
- Next.js `transpilePackages` documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages

## Issues Found
- Amplify monorepo build examples used repeated `cd ../../` commands and artifact/cache paths relative to the app directory. Updated the examples to use `frontend.buildPath: /`, which AWS documents for running install and build commands from the monorepo root, and adjusted artifact/cache paths to be relative to that build path.
- The console setup prose referred to specifying the "monorepo root directory." Updated it to specify the app path inside the monorepo, matching Amplify's `appRoot` and `AMPLIFY_MONOREPO_APP_ROOT` behavior.
- The pnpm section omitted Amplify's documented `.npmrc` requirement for pnpm workspace and Turborepo apps. Added `node-linker=hoisted`.
- The Gen 1 backend example changed directories before running `amplifyPush --simple`. Updated it to use the documented helper command directly in the backend build phase.
- The Gen 2 backend note implied frontends can naturally share a root `amplify/` definition. Updated it to reflect AWS's Gen 2 monorepo guidance: deploy the shared backend as its own Amplify app and have frontend apps generate outputs from that backend app.
- The Turborepo example used the old `pipeline` key while the post declared `turbo` v2. Updated it to the current `tasks` key and adjusted Next.js outputs to exclude `.next/cache`.
- The relevant-change build section used a manual `git diff` shell snippet and `exit 0` as a build skip mechanism. Replaced it with Amplify's documented diff-based frontend build and deploy environment variables.
- A `json` fenced code block contained a JavaScript-style comment. Removed the comment so the JSON example is syntactically valid.

## Review Notes
- The remaining examples are illustrative and still require package names in Turborepo filters to match the actual workspace package names.
- `corepack prepare pnpm@latest --activate` is usable when Corepack is available in the selected Node.js build image, but AWS's documentation also shows `npm install -g pnpm` as a supported pnpm installation approach.
