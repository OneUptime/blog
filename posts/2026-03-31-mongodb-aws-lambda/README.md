# How to Use MongoDB with AWS Lambda

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS Lambda, Serverless, Mongoose, Connection Pool

Description: Learn how to connect MongoDB from AWS Lambda functions efficiently by reusing connections across warm invocations and configuring Mongoose for serverless environments.

---

AWS Lambda functions are short-lived, but MongoDB connections are expensive to establish. The key to efficient Lambda + MongoDB integration is caching the connection object outside the handler so it survives across warm invocations.

## Installing Dependencies

```bash
npm install mongoose
```

## Connection Caching Pattern

Declare the connection variable in module scope so it persists between warm Lambda invocations:

```javascript
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,       // Keep pool small for Lambda
    minPoolSize: 0,       // Allow pool to drain
    socketTimeoutMS: 45000,
  });

  cachedConnection = conn;
  return conn;
}
```

## Lambda Handler

```javascript
const User = require('./models/User');

exports.handler = async (event) => {
  await connectToDatabase();

  if (event.httpMethod === 'GET') {
    const users = await User.find().limit(20).lean();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const user = await User.create(body);
    return {
      statusCode: 201,
      body: JSON.stringify(user),
    };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
```

## Required Lambda Environment Variables

Set these in your Lambda configuration or via the AWS console:

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/mydb?retryWrites=true&w=majority
```

## Configuring MongoDB Atlas for Lambda

Allow Lambda's outbound IP range in Atlas Network Access. For production, use VPC peering:

```bash
# Add Lambda's NAT Gateway IP to Atlas allowlist
aws ec2 describe-nat-gateways --query 'NatGateways[*].NatGatewayAddresses[*].PublicIp'
```

## Serverless Framework Configuration

```yaml
service: mongodb-lambda

provider:
  name: aws
  runtime: nodejs20.x
  environment:
    MONGODB_URI: ${env:MONGODB_URI}
  vpc:
    securityGroupIds:
      - ${env:SECURITY_GROUP_ID}
    subnetIds:
      - ${env:SUBNET_ID}

functions:
  api:
    handler: src/handler.handler
    events:
      - http:
          path: /users
          method: ANY
    timeout: 30
    memorySize: 256
```

## Preventing Connection Leaks

Set `bufferCommands: false` to fail fast if MongoDB is not connected:

```javascript
mongoose.set('bufferCommands', false);
```

## Handling Cold Starts

Cold starts include the time to establish the MongoDB connection. Minimize cold start impact by:

1. Using MongoDB Atlas with a region close to your Lambda region.
2. Setting a low `serverSelectionTimeoutMS` (5000ms) to fail fast.
3. Keeping the Lambda function warm with a scheduled ping.

```javascript
// Scheduled warm-up handler
exports.warmUp = async () => {
  await connectToDatabase();
  return { statusCode: 200, body: 'warm' };
};
```

## Summary

Caching the Mongoose connection in module scope is the single most important optimization for MongoDB with AWS Lambda. Keep `maxPoolSize` small (3-5) to avoid exhausting Atlas connection limits across concurrent Lambda executions. Use MongoDB Atlas in the same AWS region as your Lambda functions to minimize latency during cold starts.
