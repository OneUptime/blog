# How to Use CDK Assets for Bundling Lambda Code

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Lambda, TypeScript

Description: Learn how CDK assets work for bundling and deploying Lambda function code, including NodejsFunction, PythonFunction, and custom bundling configurations.

---

CDK assets solve a problem that CloudFormation punts on entirely - packaging your Lambda function code and getting it to AWS. With raw CloudFormation, you have to zip your code, upload it to S3, and reference it in your template. CDK handles all of that automatically.

But CDK goes further than simple packaging. It can compile TypeScript, bundle with esbuild, install Python dependencies, and run arbitrary build commands during synthesis. Let's see how it all works.

## The Basics: Code.fromAsset

The simplest way to package Lambda code is `Code.fromAsset()`. Point it at a directory, and CDK zips it up and uploads it to the CDK bootstrap bucket.

```typescript
// Basic asset packaging - CDK zips the directory and uploads it
import * as lambda from 'aws-cdk-lib/aws-lambda';

const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  // CDK will zip the contents of ./lambda/my-function and upload to S3
  code: lambda.Code.fromAsset('./lambda/my-function'),
});
```

CDK creates a content hash of the directory. If nothing changed since the last deployment, it skips the upload. This makes subsequent deployments faster.

You can also use inline code for simple functions.

```typescript
// Inline code for simple functions
const simpleFunction = new lambda.Function(this, 'SimpleFunction', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
def handler(event, context):
    return {"statusCode": 200, "body": "Hello!"}
  `),
});
```

## NodejsFunction: The TypeScript/JavaScript Powerhouse

For Node.js Lambda functions, the `NodejsFunction` construct is a game-changer. It uses esbuild to bundle your TypeScript or JavaScript code, tree-shake unused code, and produce a minimal deployment package.

```typescript
// NodejsFunction automatically bundles TypeScript with esbuild
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
  // Points to lambda/api-handler/index.ts by convention
  entry: 'lambda/api-handler/index.ts',
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,

  // esbuild bundling options
  bundling: {
    // Minify the output
    minify: true,
    // Generate source maps for debugging
    sourceMap: true,
    // Tree-shake unused code
    treeShaking: true,
    // Target Node.js 20
    target: 'node20',
    // Externalize AWS SDK (available in Lambda runtime)
    externalModules: ['@aws-sdk/*'],
    // Environment variables available during bundling
    define: {
      'process.env.API_VERSION': JSON.stringify('v2'),
    },
  },

  environment: {
    TABLE_NAME: table.tableName,
    NODE_OPTIONS: '--enable-source-maps',
  },
});
```

The `entry` property can point directly to a `.ts` file. CDK uses esbuild to compile TypeScript, resolve imports, and bundle everything into a single JavaScript file. No separate build step needed.

Here's what the Lambda source file might look like.

```typescript
// lambda/api-handler/index.ts
// This TypeScript file is compiled and bundled by CDK automatically
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export async function handler(event: APIGatewayProxyEvent) {
  const { id } = event.pathParameters || {};

  const result = await client.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME!,
    Key: { id: { S: id! } },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
}
```

## PythonFunction: Handling pip Dependencies

For Python Lambda functions, the `PythonFunction` construct from `@aws-cdk/aws-lambda-python-alpha` handles pip dependency installation.

```bash
# Install the Python Lambda construct library
npm install @aws-cdk/aws-lambda-python-alpha
```

```typescript
// PythonFunction installs pip dependencies automatically
import * as python from '@aws-cdk/aws-lambda-python-alpha';

const dataProcessor = new python.PythonFunction(this, 'DataProcessor', {
  // Points to the directory containing index.py and requirements.txt
  entry: 'lambda/data-processor',
  runtime: lambda.Runtime.PYTHON_3_12,
  index: 'index.py',
  handler: 'handler',
  timeout: cdk.Duration.minutes(5),
  memorySize: 1024,
});
```

The directory structure for a Python function looks like this.

```
lambda/data-processor/
  index.py              # Your handler code
  requirements.txt      # pip dependencies
  utils/
    helpers.py          # Additional modules
```

CDK runs `pip install` in a Docker container that matches the Lambda runtime, ensuring compiled dependencies (like numpy or pandas) are built for the right platform.

## Custom Bundling

For languages or build tools that CDK doesn't natively support, you can define custom bundling commands.

```typescript
// Custom bundling with Docker
const goFunction = new lambda.Function(this, 'GoFunction', {
  runtime: lambda.Runtime.PROVIDED_AL2023,
  handler: 'bootstrap',
  code: lambda.Code.fromAsset('./lambda/go-handler', {
    bundling: {
      // Use a Go Docker image for building
      image: lambda.Runtime.PROVIDED_AL2023.bundlingImage,
      command: [
        'bash', '-c', [
          'export GOCACHE=/tmp/go-cache',
          'export GOPATH=/tmp/go-path',
          'cd /asset-input',
          'go build -tags lambda.norpc -o /asset-output/bootstrap .',
        ].join(' && '),
      ],
      // Environment variables for the build container
      environment: {
        CGO_ENABLED: '0',
        GOOS: 'linux',
        GOARCH: 'amd64',
      },
    },
  }),
});
```

You can also bundle locally (without Docker) using the `local` bundling option.

```typescript
// Local bundling (runs on the host machine, no Docker)
const rustFunction = new lambda.Function(this, 'RustFunction', {
  runtime: lambda.Runtime.PROVIDED_AL2023,
  handler: 'bootstrap',
  code: lambda.Code.fromAsset('./lambda/rust-handler', {
    bundling: {
      // Try local bundling first
      local: {
        tryBundle(outputDir: string): boolean {
          try {
            execSync(
              `cargo build --release --target x86_64-unknown-linux-gnu && ` +
              `cp target/x86_64-unknown-linux-gnu/release/bootstrap ${outputDir}/`,
              { cwd: './lambda/rust-handler' }
            );
            return true;
          } catch {
            return false;  // Fall back to Docker bundling
          }
        },
      },
      // Docker fallback
      image: cdk.DockerImage.fromRegistry('rust:1.75'),
      command: ['bash', '-c', 'cargo build --release && cp target/release/bootstrap /asset-output/'],
    },
  }),
});
```

## Excluding Files from Assets

Keep your deployment packages small by excluding unnecessary files.

```typescript
// Exclude test files, documentation, and dev dependencies from the asset
const apiFunction = new lambda.Function(this, 'ApiFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('./lambda/api', {
    exclude: [
      '*.test.ts',
      '*.test.js',
      '*.spec.ts',
      '__tests__',
      'node_modules/aws-sdk',  // Available in Lambda runtime
      '.git',
      'README.md',
      'tsconfig.json',
      '.eslintrc*',
    ],
  }),
});
```

## Asset Hashing and Caching

CDK calculates a content hash of each asset. If the hash hasn't changed, the asset isn't re-uploaded. You can customize how the hash is computed.

```typescript
// Control asset hashing behavior
const code = lambda.Code.fromAsset('./lambda/handler', {
  // Hash based on content (default) or by path modification time
  assetHashType: cdk.AssetHashType.SOURCE,

  // Or provide a custom hash
  assetHash: 'v1.2.3',  // Useful for versioned builds
});
```

## Lambda Layers as Assets

Layers work the same way - CDK packages the directory and uploads it.

```typescript
// Create a Lambda layer from a local directory
const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
  code: lambda.Code.fromAsset('./layers/shared', {
    bundling: {
      image: lambda.Runtime.NODEJS_20_X.bundlingImage,
      command: [
        'bash', '-c',
        'mkdir -p /asset-output/nodejs && ' +
        'cp -r /asset-input/* /asset-output/nodejs/ && ' +
        'cd /asset-output/nodejs && npm ci --production',
      ],
    },
  }),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Shared utilities layer',
});
```

CDK assets take the pain out of Lambda packaging. You write your code, CDK builds and deploys it. For more on Lambda with CDK, check out the post on [creating a Lambda function with CDK](https://oneuptime.com/blog/post/create-lambda-function-with-cdk/view). For Docker-based assets, see the guide on [using CDK with Docker assets](https://oneuptime.com/blog/post/cdk-with-docker-assets/view).
