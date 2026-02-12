# How to Write Integration Tests for CDK Stacks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Testing, DevOps

Description: Learn how to write integration tests for CDK stacks that deploy real resources to AWS, validate behavior, and clean up automatically using the integ-tests library.

---

Unit tests verify what your CDK code produces on paper. Integration tests verify that it actually works in AWS. They deploy your stack to a real account, run assertions against live resources, and tear everything down. It's the only way to catch issues like misconfigured IAM policies, broken Lambda handlers, or network connectivity problems.

CDK has a dedicated integration testing framework called `integ-tests-alpha` that handles the deploy-test-destroy lifecycle for you.

## Why Integration Tests Matter

Unit tests check that your template has the right CloudFormation properties. But they can't tell you whether your Lambda function can actually connect to your DynamoDB table, whether your security groups allow the right traffic, or whether your IAM policies are sufficient for the actual API calls your code makes.

Integration tests are slower and more expensive than unit tests, but they catch an entire class of bugs that no amount of template inspection can find.

## Setting Up

Install the integration testing library.

```bash
# Install the CDK integration test library
npm install --save-dev @aws-cdk/integ-tests-alpha
```

You'll also need a dedicated AWS account for running integration tests. Never run integration tests in a production account.

## Writing Your First Integration Test

Integration tests are CDK apps that deploy a stack and run assertions against the deployed resources.

```typescript
// integ-tests/integ.api-stack.ts
// Integration test for the API stack
import * as cdk from 'aws-cdk-lib';
import { IntegTest, ExpectedResult } from '@aws-cdk/integ-tests-alpha';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Create the stack under test
const stack = new ApiStack(app, 'IntegTestApiStack', {
  environment: 'test',
});

// Create the integration test
const integ = new IntegTest(app, 'ApiIntegTest', {
  testCases: [stack],
  // Clean up after the test
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  // Regions to test in
  regions: ['us-east-1'],
});
```

## Testing API Endpoints

The most common integration test pattern is hitting an API endpoint and checking the response.

```typescript
// Test that the API Gateway returns a 200 response
const apiEndpoint = stack.apiEndpoint;  // CfnOutput from the stack

// Make an HTTP call to the deployed API
const getItems = integ.assertions.httpApiCall(`${apiEndpoint}/items`);

// Assert the response
getItems.expect(ExpectedResult.objectLike({
  status: 200,
  body: {
    items: ExpectedResult.arrayWith([]),
  },
}));

// Test POST endpoint
const createItem = integ.assertions.httpApiCall(`${apiEndpoint}/items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'test-001',
    name: 'Integration Test Item',
  }),
});

createItem.expect(ExpectedResult.objectLike({
  status: 201,
}));
```

## Testing with AWS SDK Calls

For resources that don't have HTTP endpoints, you can make AWS SDK calls directly.

```typescript
// Test that a DynamoDB table was created and is accessible
const describeTable = integ.assertions.awsApiCall('DynamoDB', 'describeTable', {
  TableName: stack.tableName,
});

describeTable.expect(ExpectedResult.objectLike({
  Table: {
    TableStatus: 'ACTIVE',
    BillingModeSummary: {
      BillingMode: 'PAY_PER_REQUEST',
    },
  },
}));

// Test that an S3 bucket exists and has the right configuration
const getBucketVersioning = integ.assertions.awsApiCall('S3', 'getBucketVersioning', {
  Bucket: stack.bucketName,
});

getBucketVersioning.expect(ExpectedResult.objectLike({
  Status: 'Enabled',
}));
```

## Testing Lambda Functions

Invoke Lambda functions directly and check their responses.

```typescript
// Invoke a Lambda function and check the response
const invokeLambda = integ.assertions.awsApiCall('Lambda', 'invoke', {
  FunctionName: stack.functionName,
  Payload: JSON.stringify({
    action: 'healthcheck',
  }),
});

invokeLambda.expect(ExpectedResult.objectLike({
  StatusCode: 200,
  // Check the function didn't error
  FunctionError: ExpectedResult.absent(),
}));
```

## Testing with Waits

Some resources take time to become ready. Use the `waitForAssertions` option to retry assertions.

```typescript
// Wait for an SQS message to appear (testing async processing)
const receiveMessage = integ.assertions.awsApiCall('SQS', 'receiveMessage', {
  QueueUrl: stack.outputQueueUrl,
  WaitTimeSeconds: 10,
  MaxNumberOfMessages: 1,
});

// Retry the assertion every 30 seconds for up to 5 minutes
receiveMessage.assertAtPath(
  'Messages.0.Body',
  ExpectedResult.objectLike({
    status: 'processed',
  }),
).waitForAssertions({
  totalTimeout: cdk.Duration.minutes(5),
  interval: cdk.Duration.seconds(30),
});
```

## Full Integration Test Example

Here's a complete integration test for a serverless API.

```typescript
// integ-tests/integ.serverless-api.ts
// Complete integration test for a serverless CRUD API
import * as cdk from 'aws-cdk-lib';
import { IntegTest, ExpectedResult } from '@aws-cdk/integ-tests-alpha';
import { ServerlessApiStack } from '../lib/serverless-api-stack';

const app = new cdk.App();

const stack = new ServerlessApiStack(app, 'IntegServerlessApi', {
  environment: 'integ-test',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const integ = new IntegTest(app, 'ServerlessApiInteg', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: { args: { force: true } },
  },
});

// Step 1: Create an item
const createResponse = integ.assertions.httpApiCall(
  `${stack.apiUrl}/items`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'integ-test-item',
      name: 'Test Item',
      category: 'testing',
    }),
  },
);

createResponse.expect(ExpectedResult.objectLike({
  status: 201,
}));

// Step 2: Verify the item exists in DynamoDB
const getItem = integ.assertions.awsApiCall('DynamoDB', 'getItem', {
  TableName: stack.tableName,
  Key: {
    id: { S: 'integ-test-item' },
  },
});

getItem.expect(ExpectedResult.objectLike({
  Item: {
    id: { S: 'integ-test-item' },
    name: { S: 'Test Item' },
  },
}));

// Step 3: Read the item through the API
const readResponse = integ.assertions.httpApiCall(
  `${stack.apiUrl}/items/integ-test-item`,
);

readResponse.expect(ExpectedResult.objectLike({
  status: 200,
}));

// Step 4: Delete the item
const deleteResponse = integ.assertions.httpApiCall(
  `${stack.apiUrl}/items/integ-test-item`,
  { method: 'DELETE' },
);

deleteResponse.expect(ExpectedResult.objectLike({
  status: 200,
}));
```

## Running Integration Tests

```bash
# Run a specific integration test
npx integ-runner --directory integ-tests --parallel-regions us-east-1

# Run with verbose output
npx integ-runner --directory integ-tests --verbose

# Update snapshots for integration tests
npx integ-runner --directory integ-tests --update-on-failed
```

## Best Practices

Keep integration tests focused. Each test should verify one behavior or workflow, not the entire application. Run them in a dedicated test account with limited resources. Use meaningful resource names that include "integ-test" so you can identify and clean up orphaned resources.

Tag all integration test resources for easy cleanup.

```typescript
// Tag resources for easy identification and cleanup
cdk.Tags.of(stack).add('Purpose', 'integration-test');
cdk.Tags.of(stack).add('AutoDelete', 'true');
```

Integration tests complement unit tests and snapshot tests to give you full coverage of your infrastructure code. For unit test patterns, see the post on [writing unit tests for CDK stacks](https://oneuptime.com/blog/post/write-unit-tests-for-cdk-stacks/view). For snapshot testing, check out [snapshot tests for CDK stacks](https://oneuptime.com/blog/post/write-snapshot-tests-for-cdk-stacks/view).
