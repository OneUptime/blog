# How to Use Amplify Functions (Lambda)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Lambda, Serverless

Description: A practical guide to adding Lambda functions to your AWS Amplify project, including triggers, REST APIs, and GraphQL resolvers.

---

Serverless functions are where the real power of Amplify kicks in. Sure, the frontend hosting and GraphQL API are great, but Lambda functions let you run arbitrary backend logic without managing servers. Need to send emails after a user signs up? Process images on upload? Build a custom API endpoint? That's all Lambda territory.

Amplify wraps Lambda in a nice developer experience. You add a function, write your logic, and Amplify handles packaging, deploying, and connecting it to other resources. Let's dig into how it all works.

## Adding a Function

The simplest way to create a Lambda function in Amplify is through the CLI:

```bash
# Add a new Lambda function to your project
amplify add function

# When prompted:
# ? Select which capability you want to add: Lambda function
# ? Provide an AWS Lambda function name: processOrder
# ? Choose the runtime: NodeJS
# ? Choose the function template: Hello World
```

This creates a function directory under `amplify/backend/function/processOrder/`. The actual handler code lives in `src/index.js`.

Here's what the generated file looks like after you customize it:

```javascript
// amplify/backend/function/processOrder/src/index.js
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Your business logic here
  const orderId = event.arguments?.orderId || event.pathParameters?.orderId;

  try {
    const result = await processOrder(orderId);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Order processed successfully',
        orderId: result.id
      })
    };
  } catch (error) {
    console.error('Processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process order' })
    };
  }
};

async function processOrder(orderId) {
  // Process the order - validate, charge, fulfill
  return { id: orderId, status: 'processed' };
}
```

## Connecting Functions to REST APIs

You can expose your Lambda function through an API Gateway REST endpoint:

```bash
# Add a REST API that triggers your function
amplify add api

# Select REST, then link it to your existing function
# ? Select from one of the below mentioned services: REST
# ? Provide a friendly name for your resource: orderApi
# ? Provide a path: /orders/{orderId}
# ? Choose a Lambda source: Use a Lambda function already added
# ? Choose the Lambda function: processOrder
```

Now your function is accessible via HTTP. Amplify sets up API Gateway with the proper routes and permissions.

From your frontend, calling it looks like this:

```javascript
import { API } from 'aws-amplify';

// Call the REST endpoint
async function fetchOrder(orderId) {
  try {
    const response = await API.get('orderApi', `/orders/${orderId}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch order:', error);
  }
}
```

## Using Functions as GraphQL Resolvers

This is where things get interesting. You can use Lambda functions as resolvers for your GraphQL API, giving you full control over how data is fetched or transformed.

In your schema, use the `@function` directive:

```graphql
# Use a Lambda function to resolve this query
type Query {
  getOrderSummary(orderId: ID!): OrderSummary
    @function(name: "getOrderSummary-${env}")
}

type OrderSummary {
  orderId: ID!
  totalAmount: Float!
  itemCount: Int!
  status: String!
}
```

The Lambda function receives the GraphQL arguments in the event:

```javascript
// Lambda resolver for getOrderSummary
exports.handler = async (event) => {
  const { orderId } = event.arguments;

  // Fetch from your data source
  const order = await fetchOrderFromDB(orderId);

  // Return the shape that matches your GraphQL type
  return {
    orderId: order.id,
    totalAmount: order.items.reduce((sum, item) => sum + item.price, 0),
    itemCount: order.items.length,
    status: order.status
  };
};
```

## Triggers: Responding to Events

Lambda functions shine as event triggers. Amplify supports several trigger types out of the box.

### Cognito Triggers

Run logic when users sign up, sign in, or verify their accounts:

```bash
# Add a function triggered by Cognito events
amplify add function

# Select Lambda trigger
# ? Which trigger: Cognito User Pool
# ? Which event: Post Confirmation
```

```javascript
// Post-confirmation trigger - runs after a user confirms their account
exports.handler = async (event) => {
  const { userName, request } = event;
  const email = request.userAttributes.email;

  console.log(`New user confirmed: ${userName} (${email})`);

  // Create a user profile in your database
  await createUserProfile({
    userId: userName,
    email: email,
    createdAt: new Date().toISOString()
  });

  // Send a welcome email
  await sendWelcomeEmail(email);

  // Must return the event object for Cognito triggers
  return event;
};
```

### S3 Triggers

Process files when they're uploaded to a storage bucket:

```javascript
// S3 trigger - runs when a file is uploaded
exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    console.log(`File uploaded: ${key} in ${bucket}`);

    // Example: resize an image
    if (key.match(/\.(jpg|jpeg|png)$/i)) {
      await resizeImage(bucket, key);
    }

    // Example: parse a CSV
    if (key.endsWith('.csv')) {
      await processCSV(bucket, key);
    }
  }
};
```

### DynamoDB Triggers

React to changes in your database tables:

```javascript
// DynamoDB stream trigger - runs on table changes
exports.handler = async (event) => {
  for (const record of event.Records) {
    const { eventName, dynamodb } = record;

    if (eventName === 'INSERT') {
      const newItem = dynamodb.NewImage;
      console.log('New record:', JSON.stringify(newItem));
      // Maybe send a notification or update a search index
    }

    if (eventName === 'MODIFY') {
      const oldItem = dynamodb.OldImage;
      const newItem = dynamodb.NewImage;
      console.log('Record updated from', oldItem, 'to', newItem);
    }
  }
};
```

## Accessing Other AWS Services

Your Lambda functions often need to talk to other AWS services. Amplify can grant permissions automatically.

```bash
# Update your function to access a DynamoDB table
amplify update function

# Select the function, then choose "Resource access permissions"
# Grant access to storage, API, or other categories
```

Here's a function that reads from DynamoDB and writes to S3:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = async (event) => {
  // Read from DynamoDB - table name comes from environment variables
  const data = await dynamodb.scan({
    TableName: process.env.STORAGE_ORDERSTABLE_NAME
  }).promise();

  // Generate a report and save to S3
  const report = generateReport(data.Items);
  await s3.putObject({
    Bucket: process.env.STORAGE_REPORTSBUCKET_NAME,
    Key: `reports/${Date.now()}.json`,
    Body: JSON.stringify(report),
    ContentType: 'application/json'
  }).promise();

  return { statusCode: 200, body: 'Report generated' };
};
```

## Environment Variables and Secrets

You can add environment variables to your function through the CLI or by editing the CloudFormation template.

For secrets, use the `amplify update function` command or set them in the `parameters.json` file:

```json
{
  "STRIPE_SECRET_KEY": "sk_live_...",
  "SENDGRID_API_KEY": "SG..."
}
```

A better approach for secrets is to use AWS Systems Manager Parameter Store:

```javascript
const AWS = require('aws-sdk');
const ssm = new AWS.SSM();

// Fetch a secret from Parameter Store at runtime
async function getSecret(name) {
  const result = await ssm.getParameter({
    Name: name,
    WithDecryption: true
  }).promise();
  return result.Parameter.Value;
}

exports.handler = async (event) => {
  const apiKey = await getSecret('/myapp/stripe-key');
  // Use the key...
};
```

## Local Testing

Amplify lets you invoke functions locally before deploying:

```bash
# Invoke the function locally with a test event
amplify mock function processOrder --event src/event.json
```

Create a test event file to simulate different scenarios:

```json
{
  "arguments": {
    "orderId": "order-123"
  },
  "identity": {
    "username": "testuser",
    "claims": {
      "sub": "abc-123"
    }
  }
}
```

## Monitoring and Debugging

Lambda functions log to CloudWatch automatically. You can view logs through the AWS Console or the CLI:

```bash
# Tail the logs for your function
amplify console function processOrder
```

For production monitoring, you'll want more than just logs. Track invocation counts, error rates, cold starts, and duration. Setting up alerts through [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can help you catch issues before they affect users.

## Common Pitfalls

**Cold starts** are real. If your function hasn't been invoked in a while, there's a delay while AWS spins up a new execution environment. For latency-sensitive endpoints, consider provisioned concurrency.

**Timeouts** catch people off guard. The default timeout for Amplify functions is 25 seconds. If your function does heavy processing, increase it in the CloudFormation template.

**Package size matters.** Keep your dependencies lean. Large packages increase cold start times. Use webpack or esbuild to bundle only what you need.

## Wrapping Up

Amplify Functions give you the full power of Lambda without leaving the Amplify ecosystem. Whether you're building REST endpoints, GraphQL resolvers, or event-driven triggers, the pattern is the same: write your logic, let Amplify handle the infrastructure. Start simple, test locally, and monitor everything once it's in production. That's the recipe for reliable serverless backends.
