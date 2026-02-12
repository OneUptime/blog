# How to Fix CDK 'Cannot find module' Errors During Synthesis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Infrastructure as Code, Debugging

Description: Resolve AWS CDK cannot find module errors during synthesis caused by missing dependencies, TypeScript compilation issues, and incorrect import paths.

---

You run `cdk synth` and instead of getting a CloudFormation template, you get: "Cannot find module '@aws-cdk/aws-s3'" or "Cannot find module './lib/my-stack'." This error comes from Node.js failing to resolve an import. It's a dependency or build issue, not a CDK-specific bug, but CDK projects have some unique quirks that make this error more common.

## CDK v2 vs v1 Import Paths

The most common cause of this error is using CDK v1 import paths in a CDK v2 project. CDK v2 consolidated all modules into a single package.

```typescript
// CDK v1 style - WRONG in CDK v2
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

// CDK v2 style - CORRECT
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
```

If you're migrating from v1 to v2, update all your imports:

```bash
# Find all v1-style imports in your project
grep -r "@aws-cdk/" lib/ bin/ --include="*.ts"
```

Replace them systematically:

```typescript
// The pattern is simple:
// @aws-cdk/aws-X  ->  aws-cdk-lib/aws-X
// @aws-cdk/core   ->  aws-cdk-lib

// For constructs:
// @aws-cdk/core Construct  ->  constructs Construct
```

## Missing npm Dependencies

If the module genuinely isn't installed, install it:

```bash
# For CDK v2, you mainly need these two packages
npm install aws-cdk-lib constructs

# Check what's installed
npm ls aws-cdk-lib constructs
```

For CDK v2, most constructs are in `aws-cdk-lib`. Some experimental constructs are in separate `@aws-cdk` packages with an `alpha` suffix:

```bash
# Alpha constructs are separate packages
npm install @aws-cdk/aws-appsync-alpha
npm install @aws-cdk/aws-batch-alpha
```

```typescript
// Importing alpha constructs
import * as appsync from '@aws-cdk/aws-appsync-alpha';
```

## TypeScript Compilation Not Running

CDK projects in TypeScript need to be compiled to JavaScript before `cdk synth` can work. If you're not compiling, or the compilation has errors, Node.js can't find the modules.

```bash
# Check if there are compiled files
ls lib/*.js lib/*.d.ts

# If not, compile
npx tsc

# Or use the watch mode during development
npx tsc --watch
```

If you're using `ts-node` (which many CDK projects do by default), compilation happens automatically. Check your `cdk.json`:

```json
{
    "app": "npx ts-node --prefer-ts-exts bin/my-app.ts"
}
```

If `ts-node` is being used but the module error persists, it's likely a TypeScript configuration issue, not a compilation issue.

## tsconfig.json Issues

Your TypeScript configuration can cause module resolution failures:

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["es2020"],
        "declaration": true,
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noImplicitThis": true,
        "alwaysStrict": true,
        "moduleResolution": "node",
        "outDir": "./cdk.out",
        "rootDir": ".",
        "typeRoots": ["./node_modules/@types"]
    },
    "include": ["bin/**/*.ts", "lib/**/*.ts"],
    "exclude": ["node_modules", "cdk.out"]
}
```

Key settings:
- **moduleResolution**: Must be `"node"` (not `"bundler"` or `"node16"` for standard CDK projects)
- **include**: Must cover all your source directories
- **outDir**: If set, make sure `cdk.json` points to the compiled output, not the source

## node_modules Issues

Sometimes `node_modules` gets corrupted or out of sync. The nuclear option usually works:

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

If you're using a monorepo with workspaces, the modules might be hoisted to the root:

```bash
# Check where the module is actually installed
find . -path "*/aws-cdk-lib/package.json" -maxdepth 5 2>/dev/null
```

## Path Imports for Local Files

"Cannot find module './lib/my-stack'" means Node.js can't find your local file. Common issues:

```typescript
// Make sure the path matches the actual file location
import { MyStack } from '../lib/my-stack';  // Looks for lib/my-stack.ts

// If using compiled JS, the import resolves against the compiled output
// Make sure compilation output structure matches your imports
```

Check that the file exists and the export matches:

```typescript
// lib/my-stack.ts - Make sure the class is exported
export class MyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        // ...
    }
}
```

## Circular Dependencies Between Files

If file A imports from file B, and file B imports from file A, Node.js can sometimes return an empty module object:

```typescript
// This can cause "Cannot find module" or "X is not a constructor" errors
// Break the cycle by restructuring your code

// Option 1: Move shared types to a separate file
// shared-types.ts
export interface DatabaseProps {
    tableName: string;
}

// database-stack.ts
import { DatabaseProps } from './shared-types';

// app-stack.ts
import { DatabaseProps } from './shared-types';
```

## CDK CLI Version Mismatch

If your CDK CLI version doesn't match `aws-cdk-lib`, you might get unexpected module errors:

```bash
# Check CDK CLI version
npx cdk --version

# Check aws-cdk-lib version
npm ls aws-cdk-lib

# They should be compatible (same major version)
```

Update if needed:

```bash
# Update CDK CLI
npm install -g aws-cdk@latest

# Update aws-cdk-lib
npm install aws-cdk-lib@latest
```

## Using Projen or Other Project Generators

If your project was generated by Projen or another tool, make sure the generated configuration is correct:

```bash
# Regenerate project configuration
npx projen

# Then install dependencies
npm install
```

## Debugging Module Resolution

If you're stuck, add some debugging to understand how Node.js is resolving modules:

```bash
# Run with module resolution debugging
NODE_DEBUG=module npx cdk synth 2>&1 | head -50

# Or check if ts-node can find the module
npx ts-node -e "require('aws-cdk-lib')"
```

For monitoring your CDK deployment pipelines and catching these issues before they block releases, set up [CI/CD monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) that alerts on synthesis and deployment failures.

## Summary

"Cannot find module" in CDK projects usually comes from one of these: using CDK v1 import paths in a v2 project, missing npm packages, TypeScript not compiling, or incorrect `tsconfig.json` settings. Start by checking your import paths match your CDK version, run `npm install`, make sure TypeScript compiles cleanly, and verify your `cdk.json` entry point is correct. A clean reinstall of `node_modules` fixes most remaining cases.
