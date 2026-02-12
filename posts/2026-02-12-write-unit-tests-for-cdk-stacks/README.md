# How to Write Unit Tests for CDK Stacks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Testing, TypeScript

Description: Learn how to write effective unit tests for CDK stacks using the assertions library, covering resource counts, property matching, and testing IAM policies.

---

CDK stacks are code, and code should be tested. Unit testing your CDK stacks catches configuration errors before they reach AWS, validates that your constructs produce the expected resources, and gives you confidence when refactoring infrastructure.

CDK ships with a powerful assertions library that lets you inspect the synthesized CloudFormation template without deploying anything. Let's see how to use it.

## Setting Up

If you initialized your project with `cdk init`, you already have a test file and Jest configured. If not, install the test dependencies.

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest
```

Your `jest.config.js` should look like this.

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```

## Your First Test

The basic pattern is: create an app, instantiate your stack, synthesize a template, and assert against it.

```typescript
// test/my-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyStack } from '../lib/my-stack';

describe('MyStack', () => {
  let template: Template;

  beforeEach(() => {
    // Create a fresh app and stack for each test
    const app = new cdk.App();
    const stack = new MyStack(app, 'TestStack');
    // Synthesize the template
    template = Template.fromStack(stack);
  });

  test('creates an S3 bucket', () => {
    // Assert that the template contains exactly one S3 bucket
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('S3 bucket has versioning enabled', () => {
    // Assert bucket properties
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });
});
```

Run the tests with Jest.

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm test -- --watch

# Run a specific test file
npm test -- --testPathPattern my-stack
```

## Matching Resource Properties

The assertions library provides several ways to match resource properties.

```typescript
import { Template, Match } from 'aws-cdk-lib/assertions';

describe('Resource property matching', () => {
  test('exact property match', () => {
    // Match specific properties (other properties can exist)
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Timeout: 30,
      MemorySize: 256,
    });
  });

  test('partial match with Match helpers', () => {
    // Match properties using flexible matchers
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: Match.stringLikeRegexp('nodejs'),
      Timeout: Match.anyValue(),
      Environment: {
        Variables: Match.objectLike({
          TABLE_NAME: Match.anyValue(),
        }),
      },
    });
  });

  test('match with absent properties', () => {
    // Assert that a property is NOT present
    template.hasResourceProperties('AWS::S3::Bucket', {
      // Bucket should not have a public access configuration
      WebsiteConfiguration: Match.absent(),
    });
  });

  test('match array properties', () => {
    // Match arrays with specific elements
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
        }),
      ]),
    });
  });
});
```

## Testing Resource Counts

Verify that your stack creates the expected number of each resource type.

```typescript
describe('Resource counts', () => {
  test('creates the right number of resources', () => {
    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::SQS::Queue', 2);  // Main queue + DLQ
    template.resourceCountIs('AWS::SNS::Topic', 1);
  });

  test('no unexpected public resources', () => {
    // Ensure no public S3 buckets were created
    template.resourceCountIs('AWS::S3::BucketPolicy', 0);
  });
});
```

## Testing IAM Policies

IAM policies are critical to get right. Test them explicitly.

```typescript
describe('IAM Policies', () => {
  test('Lambda has DynamoDB read/write permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith([
              'dynamodb:BatchGetItem',
              'dynamodb:GetItem',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ]),
          }),
        ]),
      },
    });
  });

  test('Lambda execution role is created', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          }),
        ]),
      },
    });
  });
});
```

## Testing Outputs

Verify that your stack exports the right values.

```typescript
describe('Stack Outputs', () => {
  test('exports the API endpoint', () => {
    template.hasOutput('ApiEndpoint', {
      Export: {
        Name: Match.anyValue(),
      },
    });
  });

  test('exports the bucket name', () => {
    template.hasOutput('BucketName', {});
  });
});
```

## Testing Custom Constructs

Custom constructs should have their own focused tests.

```typescript
// test/constructs/monitored-function.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { MonitoredFunction } from '../../lib/constructs/monitored-function';

describe('MonitoredFunction', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    // Create the construct under test
    new MonitoredFunction(stack, 'TestFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {}'),
      errorRateThreshold: 5,
      durationThresholdMs: 3000,
    });

    template = Template.fromStack(stack);
  });

  test('creates a Lambda function', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('creates error and duration alarms', () => {
    // Should create exactly 2 alarms
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
  });

  test('error alarm has correct threshold', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Threshold: 5,
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
    });
  });

  test('duration alarm uses p95 statistic', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Threshold: 3000,
      ExtendedStatistic: 'p95',
      MetricName: 'Duration',
    });
  });

  test('function has X-Ray tracing enabled', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      TracingConfig: {
        Mode: 'Active',
      },
    });
  });
});
```

## Testing Conditional Logic

When your stacks have conditional behavior based on props or context, test both paths.

```typescript
describe('Environment-specific configuration', () => {
  test('production stack retains resources', () => {
    const app = new cdk.App();
    const stack = new MyStack(app, 'ProdStack', {
      environment: 'production',
    });
    const template = Template.fromStack(stack);

    // In production, DynamoDB table should have deletion protection
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      DeletionProtectionEnabled: true,
    });
  });

  test('dev stack allows resource deletion', () => {
    const app = new cdk.App();
    const stack = new MyStack(app, 'DevStack', {
      environment: 'dev',
    });
    const template = Template.fromStack(stack);

    // In dev, DynamoDB table should not have deletion protection
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      DeletionProtectionEnabled: Match.absent(),
    });
  });
});
```

## Finding Resources by Logical ID

Sometimes you need to inspect a specific resource by its logical ID.

```typescript
test('inspect a specific resource', () => {
  // Find all Lambda functions
  const functions = template.findResources('AWS::Lambda::Function');

  // Get the logical IDs
  const logicalIds = Object.keys(functions);
  expect(logicalIds.length).toBe(2);

  // Inspect a specific resource's properties
  const allBuckets = template.findResources('AWS::S3::Bucket', {
    Properties: {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    },
  });

  expect(Object.keys(allBuckets).length).toBeGreaterThan(0);
});
```

Unit tests for CDK stacks are fast, deterministic, and catch a surprising number of real issues. They're especially valuable when you're building [custom CDK constructs](https://oneuptime.com/blog/post/create-custom-cdk-constructs/view) that other teams will use. For testing the actual deployed behavior, see the guide on [integration tests for CDK stacks](https://oneuptime.com/blog/post/write-integration-tests-for-cdk-stacks/view). And for catching template regressions, check out [snapshot tests for CDK stacks](https://oneuptime.com/blog/post/write-snapshot-tests-for-cdk-stacks/view).
