# How to Use Projen to Manage CDK Project Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Projen, DevOps

Description: Learn how to use Projen to manage your AWS CDK project configuration, including dependency management, testing, linting, and CI/CD pipeline generation.

---

CDK projects accumulate configuration files fast. You've got `tsconfig.json`, `package.json`, `.eslintrc`, `.gitignore`, Jest config, GitHub Actions workflows, and more. Keeping these consistent across multiple CDK projects is a chore. Projen solves this by generating and managing all of these files from a single TypeScript definition.

Think of Projen as "CDK for your project configuration." Instead of editing config files directly, you define them in code, and Projen generates everything for you.

## What Projen Does

Projen manages your project's "infrastructure" - the build configuration, not the cloud resources. It generates and maintains:

- `package.json` (dependencies, scripts)
- `tsconfig.json` (TypeScript configuration)
- ESLint configuration
- Jest configuration
- `.gitignore` and `.npmignore`
- GitHub Actions or GitLab CI workflows
- CDK-specific settings

The key rule with Projen is: **never edit generated files directly**. If you need to change something, change the Projen configuration and regenerate. Projen even adds a header comment to generated files reminding you not to edit them.

## Getting Started

Create a new CDK project with Projen.

```bash
# Install Projen globally
npm install -g projen

# Create a new CDK TypeScript project
mkdir my-cdk-app && cd my-cdk-app
npx projen new awscdk-app-ts
```

This generates a complete project structure. The key file is `.projenrc.ts` - that's where all your configuration lives.

## Understanding .projenrc.ts

Open the generated `.projenrc.ts`.

```typescript
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',     // CDK version to use
  defaultReleaseBranch: 'main',
  name: 'my-cdk-app',
  projenrcTs: true,

  // Dependencies
  deps: [],                   // Runtime dependencies
  devDeps: [],                // Dev dependencies

  // TypeScript options
  tsconfig: {
    compilerOptions: {
      strict: true,
    },
  },
});

project.synth();
```

After any change to this file, run:

```bash
# Regenerate all project files
npx projen
```

## Adding Dependencies

Don't run `npm install` directly. Add dependencies through Projen.

```typescript
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'my-cdk-app',
  projenrcTs: true,

  // Add runtime dependencies here
  deps: [
    'cdk-nag',              // CDK Nag for security checks
    '@aws-sdk/client-s3',   // AWS SDK for runtime code
  ],

  // Add dev dependencies here
  devDeps: [
    '@types/aws-lambda',    // Lambda type definitions
    'esbuild',              // For bundling Lambda functions
  ],
});
```

Run `npx projen` and Projen updates `package.json` and runs `npm install` for you.

## Configuring CDK Context

Projen makes it easy to manage CDK context values.

```typescript
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'my-cdk-app',
  projenrcTs: true,

  // CDK context values
  context: {
    '@aws-cdk/core:stackRelativeExports': true,
    'environment': 'production',
    'vpcId': 'vpc-12345',
  },

  // CDK-specific settings
  appEntrypoint: 'main.ts', // Entry point for the CDK app
  requireApproval: awscdk.ApprovalLevel.BROADENING, // Approval for security changes
});
```

## Setting Up Testing

Projen configures Jest for you, but you can customize it.

```typescript
const project = new awscdk.AwsCdkTypeScriptApp({
  // ... other options

  // Jest configuration
  jestOptions: {
    jestConfig: {
      testTimeout: 30000,           // 30 second timeout
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});

// Add test-related scripts
project.addTask('test:watch', {
  exec: 'jest --watch',
  description: 'Run tests in watch mode',
});
```

Now write CDK tests the usual way.

```typescript
// test/main.test.ts
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyStack } from '../src/main';

test('S3 bucket is encrypted', () => {
  const app = new App();
  const stack = new MyStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    },
  });
});
```

## Configuring ESLint

Projen sets up ESLint with sensible defaults for TypeScript projects. You can customize the rules.

```typescript
const project = new awscdk.AwsCdkTypeScriptApp({
  // ... other options

  eslint: true,
  eslintOptions: {
    dirs: ['src', 'test'],
    prettier: true, // Integrate Prettier with ESLint
  },
});

// Add custom ESLint rules after project initialization
project.eslint?.addRules({
  'no-console': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'max-len': ['warn', { code: 120 }],
});
```

## Generating CI/CD Workflows

One of Projen's best features is generating CI/CD workflows. Here's how to set up GitHub Actions.

```typescript
const project = new awscdk.AwsCdkTypeScriptApp({
  // ... other options

  // GitHub integration
  githubOptions: {
    mergify: false,  // Disable Mergify if you don't use it
  },

  // Build workflow
  buildWorkflow: true,
  buildWorkflowTriggers: {
    pullRequest: {},
    push: { branches: ['main'] },
  },
});

// Add a custom deployment workflow
const deployWorkflow = project.github?.addWorkflow('deploy');
deployWorkflow?.on({
  push: { branches: ['main'] },
});

deployWorkflow?.addJob('deploy', {
  runsOn: ['ubuntu-latest'],
  permissions: {
    contents: 'read' as any,
    idToken: 'write' as any,
  },
  steps: [
    { uses: 'actions/checkout@v4' },
    {
      uses: 'actions/setup-node@v4',
      with: { 'node-version': '20' },
    },
    { run: 'npm ci' },
    { run: 'npx cdk synth' },
    {
      run: 'npx cdk deploy --require-approval never',
      env: {
        AWS_ACCESS_KEY_ID: '${{ secrets.AWS_ACCESS_KEY_ID }}',
        AWS_SECRET_ACCESS_KEY: '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
        AWS_DEFAULT_REGION: 'us-east-1',
      },
    },
  ],
});
```

## Creating Reusable Project Templates

If you have multiple CDK projects, you can create a shared Projen template.

```typescript
// In a shared library package
import { awscdk } from 'projen';

export class CompanyCdkApp extends awscdk.AwsCdkTypeScriptApp {
  constructor(options: awscdk.AwsCdkTypeScriptAppOptions) {
    super({
      ...options,
      // Company-wide defaults
      cdkVersion: '2.130.0',
      minNodeVersion: '20.0.0',
      eslint: true,
      jest: true,
      deps: [
        'cdk-nag', // Always include security checks
        ...(options.deps || []),
      ],
    });

    // Add company-wide ESLint rules
    this.eslint?.addRules({
      'no-console': 'error',
    });

    // Add CDK Nag to the app entry point
    // ... additional company-wide configuration
  }
}
```

Then use it in individual projects:

```typescript
// .projenrc.ts in a specific project
import { CompanyCdkApp } from '@mycompany/projen-cdk-template';

const project = new CompanyCdkApp({
  name: 'my-specific-app',
  defaultReleaseBranch: 'main',
  deps: ['@aws-sdk/client-dynamodb'], // Project-specific deps
});

project.synth();
```

## Working with Projen Day-to-Day

Here are the commands you'll use most often.

```bash
# Regenerate all files after changing .projenrc.ts
npx projen

# Build the project
npx projen build

# Run tests
npx projen test

# Deploy the CDK app
npx projen deploy

# Synthesize the CDK app
npx projen synth

# See all available tasks
npx projen --help
```

## The No-Edit Rule

Projen adds this header to generated files:

```
# ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".
```

Respect it. If you edit a generated file directly, your changes will be overwritten the next time someone runs `npx projen`. This feels restrictive at first, but it enforces consistency and prevents configuration drift.

If Projen doesn't support a configuration you need, you can use escape hatches.

```typescript
// Add arbitrary files that Projen doesn't natively support
project.tryFindObjectFile('tsconfig.json')?.addOverride('compilerOptions.baseUrl', '.');

// Or create custom files
new TextFile(project, '.env.example', {
  lines: ['DATABASE_URL=postgres://localhost:5432/mydb', 'API_KEY=your-key-here'],
});
```

## Wrapping Up

Projen eliminates the "configuration drift" problem that plagues multi-project setups. Define your project standards once in TypeScript, and every project stays consistent. The initial learning curve is worth it, especially if you're managing more than a couple of CDK projects.

For the CDK-specific best practices that Projen helps enforce, check out our guide on [CDK Nag for security checks](https://oneuptime.com/blog/post/use-cdk-nag-for-security-best-practice-checks/view) and [synthesizing and diffing changes](https://oneuptime.com/blog/post/synthesize-and-diff-cdk-changes-before-deployment/view).
