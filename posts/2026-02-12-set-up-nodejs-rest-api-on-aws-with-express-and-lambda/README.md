# How to Set Up a Node.js REST API on AWS with Express and Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Node.js, Express, Lambda, API Gateway

Description: Build and deploy a production-ready Node.js REST API using Express.js on AWS Lambda with API Gateway, including authentication, validation, and database integration.

---

Running Express.js on AWS Lambda sounds counterintuitive at first. Express was designed for long-running servers, and Lambda is all about ephemeral functions. But with the right adapter library, it works beautifully. You get the familiar Express development experience locally while benefiting from Lambda's automatic scaling and pay-per-request pricing in production.

Let's build a complete REST API from scratch.

## Project Setup

Start by creating a new Node.js project and installing the dependencies:

```bash
mkdir express-lambda-api
cd express-lambda-api
npm init -y
npm install express serverless-http cors helmet
npm install -D @types/express typescript serverless serverless-offline
```

The key package here is `serverless-http`. It wraps your Express app so Lambda can invoke it through API Gateway requests.

## Building the Express API

Create a well-structured Express application. We'll separate the app from the handler so you can run it locally as a regular Express server and deploy it to Lambda without changes.

Define your Express app with middleware and routes:

```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    }));
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    level: 'ERROR',
    message: err.message,
    stack: err.stack,
  }));
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;
```

Create a users route with CRUD operations:

```javascript
// src/routes/users.js
const express = require('express');
const router = express.Router();

// In-memory store for demo - replace with DynamoDB or RDS in production
let users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

// GET all users
router.get('/', (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const paginated = users.slice(Number(offset), Number(offset) + Number(limit));
  res.json({
    data: paginated,
    total: users.length,
    limit: Number(limit),
    offset: Number(offset),
  });
});

// GET user by ID
router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ data: user });
});

// POST create user
router.post('/', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const newUser = {
    id: String(Date.now()),
    name,
    email,
  };
  users.push(newUser);
  res.status(201).json({ data: newUser });
});

// PUT update user
router.put('/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[index] = { ...users[index], ...req.body };
  res.json({ data: users[index] });
});

// DELETE user
router.delete('/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(index, 1);
  res.status(204).send();
});

module.exports = router;
```

## Lambda Handler

Create the Lambda handler that wraps your Express app:

```javascript
// src/handler.js
const serverless = require('serverless-http');
const app = require('./app');

// Wrap Express app for Lambda
module.exports.handler = serverless(app, {
  // Binary content types that should be base64 encoded
  binary: ['image/*', 'application/pdf'],
});
```

Create a local server entry point for development:

```javascript
// src/local.js
const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API running locally at http://localhost:${port}`);
});
```

## Serverless Framework Configuration

Configure the Serverless Framework to deploy your API:

```yaml
# serverless.yml
service: express-lambda-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 256
  timeout: 30
  stage: ${opt:stage, 'dev'}
  environment:
    NODE_ENV: production
    STAGE: ${self:provider.stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - !GetAtt UsersTable.Arn

functions:
  api:
    handler: src/handler.handler
    events:
      - httpApi: '*'

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-users-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
```

## Connecting to DynamoDB

Replace the in-memory store with DynamoDB for production:

```javascript
// src/services/dynamodb.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE || 'express-lambda-api-users-dev';

async function getUser(id) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id },
  }));
  return result.Item;
}

async function listUsers(limit = 10) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    Limit: limit,
  }));
  return result.Items;
}

async function createUser(user) {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: user,
  }));
  return user;
}

async function deleteUser(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id },
  }));
}

module.exports = { getUser, listUsers, createUser, deleteUser };
```

## Local Development

Test your API locally before deploying:

```bash
# Run with serverless-offline (simulates API Gateway + Lambda)
npx serverless offline

# Or run as a regular Express server
node src/local.js
```

## Deploying

Deploy to AWS with a single command:

```bash
# Deploy to the dev stage
npx serverless deploy

# Deploy to production
npx serverless deploy --stage production
```

The output will give you an API Gateway URL that you can start hitting immediately.

## Adding Authentication

Protect your API with a Lambda authorizer or API Gateway's built-in JWT authorizer:

```yaml
# serverless.yml addition
functions:
  api:
    handler: src/handler.handler
    events:
      - httpApi:
          path: /api/{proxy+}
          method: ANY
          authorizer:
            name: jwtAuthorizer
            type: jwt
            id: !Ref HttpApiAuthorizerJwt

  # Public routes without auth
  health:
    handler: src/handler.handler
    events:
      - httpApi:
          path: /health
          method: GET
```

## Monitoring and Cold Starts

Lambda cold starts can add latency to your API responses. For a Node.js Express app, cold starts are typically 200-500ms. You can reduce this by:

- Keeping your deployment package small
- Using provisioned concurrency for critical endpoints
- Minimizing top-level imports

```bash
# Enable provisioned concurrency for production
aws lambda put-provisioned-concurrency-config \
  --function-name express-lambda-api-production-api \
  --qualifier production \
  --provisioned-concurrent-executions 5
```

For monitoring your API's performance and uptime, check out our guide on [setting up monitoring for AWS services](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view).

## Wrapping Up

Express on Lambda gives you the best of both worlds - a familiar development experience and serverless scalability. The serverless-http adapter makes the transition nearly seamless. You don't have to rewrite your routes or middleware, and you can still test everything locally with serverless-offline. For most REST APIs that don't need persistent WebSocket connections, this is an excellent architecture choice.
