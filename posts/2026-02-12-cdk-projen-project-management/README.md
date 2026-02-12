# How to Use CDK with Projen for Project Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Projen, TypeScript

Description: Use Projen to manage your AWS CDK projects with automated project configuration, dependency management, CI/CD pipelines, and code generation.

---

CDK projects have a lot of boilerplate. The `tsconfig.json`, `.gitignore`, jest configuration, ESLint rules, GitHub Actions workflows, package.json scripts - it all adds up. And when you have ten CDK projects, keeping all this configuration consistent is a full-time job. Projen solves this by generating all project configuration from a single TypeScript file. Change one line in `.projenrc.ts` and everything updates.

It's not just a scaffolding tool - Projen actively manages your project files. If someone manually edits a generated file, Projen will overwrite it on the next synthesis. This sounds restrictive, but it's actually liberating because all your project decisions live in one place.

## Getting Started

Create a new CDK app with Projen:

```bash
# Create a new CDK app project
mkdir my-cdk-app && cd my-cdk-app
npx projen new awscdk-app-ts
```

This creates a `.projenrc.ts` file that drives everything:

```typescript
// .projenrc.ts - The single source of truth for project configuration
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'my-cdk-app',
  projenrcTs: true,

  // Dependencies
  deps: [
    '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb',
  ],
  devDeps: [
    'esbuild',
  ],

  // TypeScript configuration
  tsconfig: {
    compilerOptions: {
      lib: ['es2022'],
      target: 'es2022',
    },
  },

  // Testing
  jestOptions: {
    jestConfig: {
      testPathIgnorePatterns: ['/node_modules/', '/cdk.out/'],
    },
  },

  // Git
  gitignore: ['cdk.out/', '.env', '*.js', '*.d.ts'],
});

project.synth();
```

After editing `.projenrc.ts`, run `npx projen` to regenerate all project files.

## CDK Construct Library with Projen

For shared construct libraries, Projen really shines. It sets up jsii, testing, packaging, and publishing automatically:

```typescript
// .projenrc.ts - Construct library configuration
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Your Name',
  authorAddress: 'you@example.com',
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-secure-bucket',
  repositoryUrl: 'https://github.com/your-org/cdk-secure-bucket.git',
  description: 'Secure S3 bucket construct with compliance defaults',
  projenrcTs: true,

  // jsii targets for multi-language support
  publishToPypi: {
    distName: 'cdk-secure-bucket',
    module: 'cdk_secure_bucket',
  },
  publishToMaven: {
    javaPackage: 'com.yourorg.cdk.securebucket',
    mavenGroupId: 'com.yourorg',
    mavenArtifactId: 'cdk-secure-bucket',
  },
  publishToNuget: {
    dotNetNamespace: 'YourOrg.Cdk.SecureBucket',
    packageId: 'YourOrg.Cdk.SecureBucket',
  },

  // Stability level shown on Construct Hub
  stability: 'experimental',

  // Dependencies that are bundled with the construct
  bundledDeps: [],
  // Dependencies that consumers must install
  peerDeps: [],

  // Enable automatic releases
  releaseToNpm: true,
  majorVersion: 0,

  // PR automation
  autoApproveUpgrades: true,
  autoApproveOptions: {
    allowedUsernames: ['github-bot'],
  },
});

project.synth();
```

This single file generates:

- `package.json` with jsii configuration
- `tsconfig.json` for TypeScript
- `.github/workflows/` for CI/CD
- `.eslintrc.json` for linting
- `jest.config.js` for testing
- `.gitignore`, `.npmignore`, and more

## Customizing Generated Files

You can customize almost everything through the Projen API:

```typescript
// Customize ESLint rules
project.eslint?.addRules({
  'no-console': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
  }],
});

// Add custom scripts
project.addTask('deploy:staging', {
  exec: 'cdk deploy --context env=staging',
  description: 'Deploy to staging environment',
});

project.addTask('deploy:production', {
  exec: 'cdk deploy --context env=production --require-approval broadening',
  description: 'Deploy to production environment',
});

// Add custom GitHub Actions workflow
const deployWorkflow = project.github?.addWorkflow('deploy');
deployWorkflow?.on({
  push: { branches: ['main'] },
});
deployWorkflow?.addJob('deploy', {
  runsOn: ['ubuntu-latest'],
  permissions: {
    contents: 'read',
    idToken: 'write',
  },
  steps: [
    { uses: 'actions/checkout@v4' },
    {
      uses: 'actions/setup-node@v4',
      with: { 'node-version': '20' },
    },
    { run: 'npm ci' },
    { run: 'npx cdk deploy --require-approval never' },
  ],
});
```

## Dependency Management

Projen automates dependency updates through scheduled workflows:

```typescript
// Configure automatic dependency updates
const project = new awscdk.AwsCdkTypeScriptApp({
  // ... other config
  depsUpgrade: true,
  depsUpgradeOptions: {
    workflow: true,
    workflowOptions: {
      schedule: {
        cron: ['0 6 * * 1'], // Every Monday at 6 AM
      },
    },
    exclude: ['aws-cdk-lib'], // Don't auto-update CDK
  },
});
```

This creates a GitHub Actions workflow that opens PRs for dependency updates on your schedule.

## Multi-Stack Project Structure

For larger projects with multiple stacks, organize them properly:

```typescript
// .projenrc.ts for a multi-stack project
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'platform-infrastructure',
  projenrcTs: true,

  deps: [],
  devDeps: ['@types/node'],

  // Organize source files
  srcdir: 'src',
  testdir: 'test',

  context: {
    '@aws-cdk/core:stackRelativeExports': true,
  },
});

// Create directory structure expectations
project.addTask('synth:all', {
  exec: 'cdk synth --all',
  description: 'Synthesize all stacks',
});

project.addTask('diff:all', {
  exec: 'cdk diff --all',
  description: 'Show diffs for all stacks',
});

project.synth();
```

Then structure your source like this:

```typescript
// src/main.ts - CDK app entry point
import { App } from 'aws-cdk-lib';
import { NetworkStack } from './stacks/network-stack';
import { DatabaseStack } from './stacks/database-stack';
import { ApplicationStack } from './stacks/application-stack';

const app = new App();
const env = { account: '123456789012', region: 'us-east-1' };

const network = new NetworkStack(app, 'Network', { env });
const database = new DatabaseStack(app, 'Database', {
  env,
  vpc: network.vpc,
});
const application = new ApplicationStack(app, 'Application', {
  env,
  vpc: network.vpc,
  database: database.cluster,
});

app.synth();
```

## Projen Components

Create reusable project components:

```typescript
// .projenrc.ts - Custom component for standard Lambda configuration
import { awscdk } from 'projen';
import { Component, Project } from 'projen';

class LambdaDefaults extends Component {
  constructor(project: Project) {
    super(project);

    // Add esbuild for bundling
    (project as awscdk.AwsCdkTypeScriptApp).addDevDeps('esbuild');

    // Add Lambda-specific task
    project.addTask('bundle:lambdas', {
      exec: 'esbuild src/lambda/*.ts --bundle --platform=node --outdir=dist/lambda',
      description: 'Bundle Lambda functions',
    });
  }
}

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'my-app',
  projenrcTs: true,
});

// Apply the component
new LambdaDefaults(project);

project.synth();
```

## Escape Hatches

When you need to manually manage a file, tell Projen to leave it alone:

```typescript
// Tell Projen not to manage specific files
project.tryFindObjectFile('tsconfig.json')?.addOverride('compilerOptions.paths', {
  '@/*': ['./src/*'],
});

// Or create a file that Projen won't overwrite
import { TextFile } from 'projen';
new TextFile(project, '.env.example', {
  lines: [
    'AWS_REGION=us-east-1',
    'CDK_DEFAULT_ACCOUNT=123456789012',
  ],
  marker: false, // No "generated by projen" marker
});
```

## Why Projen Over Manual Setup

The main benefits boil down to:

**Consistency** - Every project follows the same structure and conventions. New team members know exactly where to find things.

**Maintenance** - Update CDK version, linting rules, or CI/CD configuration in one place and regenerate. No more updating 15 workflows across 15 repos.

**Best practices** - Projen's CDK presets encode community best practices. You get proper jsii setup, snapshot testing, and release automation out of the box.

For publishing the constructs you build with Projen, see [publishing CDK constructs to Construct Hub](https://oneuptime.com/blog/post/publish-cdk-constructs-construct-hub/view). For sharing constructs privately, check out [sharing CDK constructs across projects](https://oneuptime.com/blog/post/share-cdk-constructs-across-projects/view).

## Wrapping Up

Projen isn't just a project generator - it's a project manager that keeps your configuration in sync. For CDK projects especially, where you've got TypeScript, jsii, testing, linting, and deployment all to coordinate, having a single `.projenrc.ts` as the source of truth is invaluable. Start with `projen new awscdk-app-ts` for application projects or `projen new awscdk-construct` for libraries, customize from there, and let Projen handle the boilerplate.
