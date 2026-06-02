# Validation Summary: How to Fix CDK 'Cannot find module' Errors During Synthesis

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS CDK v1 and v2
- TypeScript
- Node.js module resolution
- npm dependencies and package installation
- ts-node
- Projen

## Sources Consulted
- AWS CDK v2 migration guide: https://docs.aws.amazon.com/cdk/v2/guide/migrating-v2.html
- AWS CDK TypeScript guide: https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html
- AWS CDK CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK versioning guide: https://docs.aws.amazon.com/cdk/v2/guide/versioning.html
- TypeScript TSConfig reference for module resolution: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- TypeScript documentation for ECMAScript modules in Node.js: https://www.typescriptlang.org/docs/handbook/modules/reference.html
- ts-node CLI help output (`npx ts-node --help`)
- AWS CDK CLI help output (`npx aws-cdk@latest synth --help`)
- npm package metadata for `aws-cdk`, `aws-cdk-lib`, `@aws-cdk/aws-appsync-alpha`, and `@aws-cdk/aws-batch-alpha`

## Issues Found
- The post stated that TypeScript CDK projects must be compiled to JavaScript before `cdk synth` can work. This is only true when `cdk.json` points at compiled JavaScript; the default TypeScript CDK template runs `ts-node`. Updated the wording to distinguish compiled-JavaScript projects from `ts-node` projects.
- The sample `tsconfig.json` used `outDir: "./cdk.out"`. CDK uses `cdk.out` for synthesized cloud assemblies, so TypeScript compiler output should not be placed there. Changed the example `outDir` to `./dist` and excluded `dist`.
- The post said `moduleResolution` must be `"node"` and not `"node16"` for standard CDK projects. `"node"` is typical for CommonJS CDK projects, but `node16`/`nodenext` are valid when the project is configured for Node.js ESM with matching module settings. Updated the wording to be version- and configuration-aware.
- The circular dependency section implied cycles can cause `Cannot find module`. Circular imports more commonly produce incomplete exports or runtime errors such as `"X is not a constructor"` after the files resolve. Adjusted the comment to avoid misdiagnosing circular dependencies as module-not-found failures.

## Review Notes
The CDK v2 import path guidance, `aws-cdk-lib` and `constructs` dependency guidance, alpha package naming, `cdk synth` command usage, `--output` behavior, `ts-node --prefer-ts-exts`, npm inspection commands, and the internal OneUptime link were validated as technically sound.
