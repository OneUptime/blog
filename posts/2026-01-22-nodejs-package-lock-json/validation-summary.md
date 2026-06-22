# Validation Summary: How to Understand package-lock.json in Node.js

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Node.js
- npm
- package.json
- package-lock.json
- npm CLI commands
- GitHub Actions
- Yarn lock files

## Sources Consulted
- npm package-lock.json documentation: https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json/
- npm install documentation: https://docs.npmjs.com/cli/v10/commands/npm-install/
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm cache documentation: https://docs.npmjs.com/cli/v10/commands/npm-cache/
- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit/
- npm update documentation: https://docs.npmjs.com/cli/v10/commands/npm-update/
- npm explain documentation and local npm CLI help output for `npm explain` / `npm why`: https://docs.npmjs.com/cli/v10/commands/npm-explain/
- Yarn classic lockfile documentation: https://classic.yarnpkg.com/lang/en/docs/yarn-lock/
- GitHub Actions checkout action documentation: https://github.com/actions/checkout
- GitHub Actions setup-node action documentation: https://github.com/actions/setup-node

## Issues Found
- The commented JSON examples were fenced as strict `json`, which is not syntactically valid JSON. Changed those fences to `jsonc`.
- The `integrity` field was described as always being a SHA-512 hash. npm documents it as a Subresource Integrity string that may use `sha512` or `sha1`, so the wording now says it is usually SHA-512.
- The `npm install` description implied it installs only from `package.json` ranges. npm uses existing lock files when present, so the wording now mentions both `package.json` and the lock file.
- The `npm ci` description said it reads `package-lock.json` only. npm also validates against `package.json`, so the wording now says it reads both files.
- The team npm-version guidance claimed exact version alignment while showing a broad `>=9.0.0` range. Updated the wording to "compatible npm major version" and changed the example command to a pinned npm version.
- `npm audit` was presented as an integrity verification command. `npm audit` checks known vulnerabilities; cache integrity verification is `npm cache verify`. Added `npm cache verify` and clarified `npm audit`.
- The GitHub Actions example used older action versions and Node.js 18. Updated the example to `actions/checkout@v5`, `actions/setup-node@v6`, and Node.js 24.
- `npm diff` was suggested as a readable package-lock diff command, but npm's `diff` command compares package contents against registry/package specs. Replaced it with `git diff --word-diff package-lock.json`.
- The Yarn comparison table implied `yarn.lock` has only one lockfile version and that npm cannot use it. Updated the table to say Yarn lockfile versions are Yarn-specific and that npm can read `yarn.lock` only when npm lock files are absent.
- The `npm view express version` comment said it shows what version will be installed. It actually shows the latest published version for the default tag, so the comment was corrected.

## Review Notes
The post is technically relevant and current after the corrections. The library lockfile guidance remains intentionally described as debatable, which is reasonable because published libraries do not publish `package-lock.json`, but teams may still commit it for development and CI consistency.
