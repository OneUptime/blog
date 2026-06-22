# Validation Summary: How to Fix npm Peer Dependency Conflicts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Node.js
- npm CLI
- npm package.json dependencies, peerDependencies, overrides, aliases, and workspaces
- Yarn resolutions
- React and @types/react peer dependency scenarios
- Webpack plugins
- ESLint plugins
- CI/CD dependency installation with npm ci

## Sources Consulted
- npm package.json documentation: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- npm install documentation: https://docs.npmjs.com/cli/v11/commands/npm-install/
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm workspaces documentation: https://docs.npmjs.com/cli/v11/using-npm/workspaces/
- npm ls local help output from npm 10.9.4
- npm explain local help output from npm 10.9.4
- npm package-spec local help output from npm 10.9.4
- npm-check-updates package README from the npm registry: https://www.npmjs.com/package/npm-check-updates
- Yarn selective dependency resolutions documentation: https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/

## Issues Found
- The post stated that peer dependencies are not installed automatically. Updated this to note that npm 7 and later install peer dependencies automatically when npm can resolve a valid dependency tree.
- The npm overrides example implied that overrides can fix a package's peer dependency declaration by forcing React under `some-package`. Updated the example and explanation to clarify that npm overrides affect installed dependency versions in the dependency tree and do not change declared peer dependency ranges.
- The aliases section implied aliases can generally solve multiple-version package conflicts. Added a clarification that npm aliases only help when the project code imports the alias and do not satisfy transitive peer dependencies that require the original package name.
- The TypeScript types scenario gave a direct install command even when a package's peer range might not support React 18 types. Added a check of the package peer dependencies before installing matching React type packages.
- The workspace example used `workspace:*`, which npm 10.9.4 rejects with `EUNSUPPORTEDPROTOCOL`. Replaced it with npm's documented `npm install <workspace-name> -w <workspace>` approach for adding one workspace as a dependency of another.

## Review Notes
Most npm commands and flags in the post are current and valid, including `--legacy-peer-deps`, `--force`, `npm explain`, `npm ls --all`, `npm outdated`, package aliases, `npm ci --legacy-peer-deps`, and `npm-check-updates --filter`. The guidance around `--legacy-peer-deps` remains intentionally cautious and aligns with npm's warning that the same tree-shaping flags must be used with `npm ci` when the lockfile was created with those flags.
