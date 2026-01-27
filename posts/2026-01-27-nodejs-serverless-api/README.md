# How to Build a Serverless API with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Serverless, AWS Lambda, API Gateway, JavaScript

Description: Learn how to build serverless APIs with Node.js using AWS Lambda and API Gateway, including project structure, deployment, and best practices.

---

> Serverless computing lets you focus on code, not infrastructure. You pay only for what you use, scale automatically, and eliminate server maintenance.

## What is Serverless and Why Use It

Serverless does not mean there are no servers. It means you do not manage them. AWS, Azure, or Google Cloud handles provisioning, scaling, and maintenance. Your code runs in response to events - HTTP requests, database changes, file uploads, or scheduled tasks.

| Aspect | Traditional Server | Serverless |
|--------|-------------------|------------|
| Scaling | Manual or auto-scaling rules | Automatic, per-request |
| Cost | Pay for idle time | Pay per execution |
| Maintenance | OS updates, patches | None |
| Cold starts | None | Possible latency |
| Complexity | Infrastructure setup | Function-level thinking |

**When to use serverless:**
- APIs with variable or unpredictable traffic
- Event-driven workloads
- Microservices with distinct functions
- Prototypes and MVPs
- Scheduled tasks and background jobs

**When to avoid serverless:**
- Long-running processes (Lambda has 15-minute limit)
- Applications requiring WebSocket connections for extended periods
- Workloads with consistent high traffic (may be more cost-effective on containers)

## Project Structure for Serverless Node.js APIs

A well-organized serverless project separates handlers, business logic, and shared utilities:

```
serverless-api/
├── src/
│   ├── handlers/           # Lambda entry points
│   │   ├── users.js
│   │   ├── orders.js
│   │   └── health.js
│   ├── services/           # Business logic
│   │   ├── userService.js
│   │   └── orderService.js
│   ├── utils/              # Shared utilities
│   │   ├── response.js     # Standard response formatter
│   │   ├── validator.js    # Input validation
│   │   └── logger.js       # Structured logging
│   └── middleware/         # Middleware functions
│       ├── auth.js
│       └── errorHandler.js
├── tests/
│   ├── unit/
│   └── integration/
├── serverless.yml          # Serverless Framework config
├── package.json
└── .env.example
```

## Creating Lambda Handlers

Lambda handlers receive an event object and context. Keep handlers thin - they should parse input, call services, and format output.

```javascript
// src/handlers/users.js

const userService = require('../services/userService');
const { success, error, notFound } = require('../utils/response');
const { validateUser } = require('../utils/validator');

// GET /users - List all users
module.exports.list = async (event) => {
  try {
    // Parse query parameters for pagination
    const { limit = 20, offset = 0 } = event.queryStringParameters || {};

    const users = await userService.getAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return success(users);
  } catch (err) {
    console.error('Error listing users:', err);
    return error('Failed to retrieve users');
  }
};

// GET /users/{id} - Get single user
module.exports.get = async (event) => {
  try {
    const { id } = event.pathParameters;

    const user = await userService.getById(id);

    if (!user) {
      return notFound('User not found');
    }

    return success(user);
  } catch (err) {
    console.error('Error getting user:', err);
    return error('Failed to retrieve user');
  }
};

// POST /users - Create user
module.exports.create = async (event) => {
  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');

    const validation = validateUser(body);
    if (!validation.valid) {
      return error(validation.errors, 400);
    }

    const user = await userService.create(body);

    return success(user, 201);
  } catch (err) {
    console.error('Error creating user:', err);
    return error('Failed to create user');
  }
};

// PUT /users/{id} - Update user
module.exports.update = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');

    const user = await userService.update(id, body);

    if (!user) {
      return notFound('User not found');
    }

    return success(user);
  } catch (err) {
    console.error('Error updating user:', err);
    return error('Failed to update user');
  }
};

// DELETE /users/{id} - Delete user
module.exports.delete = async (event) => {
  try {
    const { id } = event.pathParameters;

    const deleted = await userService.delete(id);

    if (!deleted) {
      return notFound('User not found');
    }

    return success({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return error('Failed to delete user');
  }
};
```

Create a response utility for consistent API responses:

```javascript
// src/utils/response.js

// Standard headers for all responses
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',           // Configure for your domain in production
  'Access-Control-Allow-Credentials': true,
};

// Success response (200 or custom status)
module.exports.success = (data, statusCode = 200) => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: true,
    data,
  }),
});

// Error response
module.exports.error = (message, statusCode = 500) => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: false,
    error: typeof message === 'string' ? message : 'Internal server error',
    details: typeof message === 'object' ? message : undefined,
  }),
});

// Not found response
module.exports.notFound = (message = 'Resource not found') => ({
  statusCode: 404,
  headers,
  body: JSON.stringify({
    success: false,
    error: message,
  }),
});
```

## API Gateway Integration

The Serverless Framework simplifies API Gateway configuration. Here is a complete `serverless.yml`:

```yaml
service: my-serverless-api

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}

  # Environment variables available to all functions
  environment:
    NODE_ENV: ${self:provider.stage}
    DB_HOST: ${env:DB_HOST}
    DB_NAME: ${env:DB_NAME}

  # IAM permissions for Lambda functions
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
        - Effect: Allow
          Action:
            - ssm:GetParameter
            - ssm:GetParameters
          Resource:
            - arn:aws:ssm:${self:provider.region}:*:parameter/${self:service}/*

# Package configuration
package:
  individually: true           # Package each function separately
  patterns:
    - '!tests/**'              # Exclude test files
    - '!.env*'                 # Exclude environment files
    - '!README.md'

functions:
  # Health check endpoint
  health:
    handler: src/handlers/health.check
    events:
      - http:
          path: /health
          method: get
          cors: true

  # User endpoints
  listUsers:
    handler: src/handlers/users.list
    events:
      - http:
          path: /users
          method: get
          cors: true

  getUser:
    handler: src/handlers/users.get
    events:
      - http:
          path: /users/{id}
          method: get
          cors: true

  createUser:
    handler: src/handlers/users.create
    events:
      - http:
          path: /users
          method: post
          cors: true

  updateUser:
    handler: src/handlers/users.update
    events:
      - http:
          path: /users/{id}
          method: put
          cors: true

  deleteUser:
    handler: src/handlers/users.delete
    events:
      - http:
          path: /users/{id}
          method: delete
          cors: true

# DynamoDB table
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
  - serverless-offline           # Local development
  - serverless-dotenv-plugin     # Load .env files
```

## Environment Variables and Secrets

Never hardcode secrets. Use AWS Systems Manager Parameter Store or Secrets Manager:

```javascript
// src/utils/secrets.js

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: process.env.AWS_REGION });

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map();

// Fetch a secret from Parameter Store
async function getSecret(name) {
  // Return cached value if available
  if (secretsCache.has(name)) {
    return secretsCache.get(name);
  }

  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: true,    // Decrypt SecureString parameters
    });

    const response = await ssm.send(command);
    const value = response.Parameter.Value;

    // Cache the value
    secretsCache.set(name, value);

    return value;
  } catch (err) {
    console.error(`Failed to get secret ${name}:`, err);
    throw err;
  }
}

// Get database connection string
module.exports.getDbConnection = async () => {
  const host = await getSecret('/my-api/db/host');
  const password = await getSecret('/my-api/db/password');
  return {
    host,
    password,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
  };
};

// Get API key
module.exports.getApiKey = async (service) => {
  return getSecret(`/my-api/keys/${service}`);
};
```

Store secrets using AWS CLI:

```bash
# Store a secret in Parameter Store
aws ssm put-parameter \
  --name "/my-api/db/password" \
  --value "your-secret-password" \
  --type SecureString \
  --overwrite

# Store API keys
aws ssm put-parameter \
  --name "/my-api/keys/stripe" \
  --value "sk_live_xxx" \
  --type SecureString
```

## Local Development and Testing

### Using Serverless Offline

The serverless-offline plugin emulates API Gateway locally:

```bash
# Install dependencies
npm install --save-dev serverless-offline serverless-dotenv-plugin

# Start local server
npx serverless offline

# Server runs at http://localhost:3000
```

### Using AWS SAM

AWS SAM (Serverless Application Model) is AWS's native tool:

```yaml
# template.yaml (SAM format)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: My Serverless API

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 256

Resources:
  ListUsersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/users.list
      Events:
        Api:
          Type: Api
          Properties:
            Path: /users
            Method: GET
```

```bash
# Start SAM local API
sam local start-api

# Invoke a single function
sam local invoke ListUsersFunction --event events/list-users.json
```

### Unit Testing

```javascript
// tests/unit/handlers/users.test.js

const { list, get, create } = require('../../../src/handlers/users');

// Mock the user service
jest.mock('../../../src/services/userService', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
}));

const userService = require('../../../src/services/userService');

describe('User Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return users with pagination', async () => {
      // Arrange
      const mockUsers = [{ id: '1', name: 'John' }];
      userService.getAll.mockResolvedValue(mockUsers);

      const event = {
        queryStringParameters: { limit: '10', offset: '0' },
      };

      // Act
      const result = await list(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).data).toEqual(mockUsers);
      expect(userService.getAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it('should handle missing query parameters', async () => {
      userService.getAll.mockResolvedValue([]);

      const event = { queryStringParameters: null };
      const result = await list(event);

      expect(result.statusCode).toBe(200);
      expect(userService.getAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('get', () => {
    it('should return 404 for non-existent user', async () => {
      userService.getById.mockResolvedValue(null);

      const event = { pathParameters: { id: 'not-found' } };
      const result = await get(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
```

## Cold Starts and Optimization

Cold starts occur when AWS creates a new Lambda instance. The first request to a new instance includes initialization time.

### Minimize Cold Starts

```javascript
// Initialize outside the handler - runs once per container
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Connection is reused across invocations
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Handler runs on every invocation
module.exports.handler = async (event) => {
  // Use the pre-initialized client
  const result = await docClient.send(/* command */);
  return result;
};
```

### Provisioned Concurrency

For latency-sensitive endpoints, enable provisioned concurrency:

```yaml
# serverless.yml
functions:
  criticalEndpoint:
    handler: src/handlers/critical.handler
    provisionedConcurrency: 5    # Keep 5 warm instances
```

### Bundle Size Optimization

Smaller bundles mean faster cold starts:

```javascript
// package.json
{
  "devDependencies": {
    "esbuild": "^0.19.0"
  },
  "scripts": {
    "build": "esbuild src/handlers/*.js --bundle --platform=node --target=node18 --outdir=dist"
  }
}
```

```yaml
# serverless.yml with esbuild
plugins:
  - serverless-esbuild

custom:
  esbuild:
    bundle: true
    minify: true
    sourcemap: true
    exclude:
      - '@aws-sdk/*'    # Use Lambda's built-in SDK
```

### Memory Configuration

More memory also means more CPU. Test to find the optimal setting:

```yaml
functions:
  compute-heavy:
    handler: src/handlers/compute.handler
    memorySize: 1024    # 1GB RAM, proportionally more CPU
    timeout: 30
```

## Error Handling

Implement consistent error handling across all handlers:

```javascript
// src/middleware/errorHandler.js

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

// Wrapper for handlers with automatic error handling
const withErrorHandling = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (err) {
    console.error('Handler error:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      requestId: context.awsRequestId,
    });

    // Known application errors
    if (err instanceof AppError) {
      return {
        statusCode: err.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details,
        }),
      };
    }

    // Unexpected errors - don't leak details
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
    };
  }
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  withErrorHandling,
};
```

Use the wrapper in handlers:

```javascript
// src/handlers/orders.js

const { withErrorHandling, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const orderService = require('../services/orderService');

module.exports.get = withErrorHandling(async (event) => {
  const { id } = event.pathParameters;

  const order = await orderService.getById(id);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, data: order }),
  };
});

module.exports.create = withErrorHandling(async (event) => {
  const body = JSON.parse(event.body || '{}');

  if (!body.items || body.items.length === 0) {
    throw new ValidationError('Order must have at least one item', {
      field: 'items',
      message: 'Required field is empty',
    });
  }

  const order = await orderService.create(body);

  return {
    statusCode: 201,
    body: JSON.stringify({ success: true, data: order }),
  };
});
```

## Deployment Strategies

### Stage-Based Deployments

```bash
# Deploy to development
npx serverless deploy --stage dev

# Deploy to staging
npx serverless deploy --stage staging

# Deploy to production
npx serverless deploy --stage prod
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Serverless API

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy-staging:
    needs: test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - name: Deploy to staging
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npx serverless deploy --stage staging

  deploy-prod:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production    # Requires approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - name: Deploy to production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npx serverless deploy --stage prod
```

### Function-Level Deployments

Deploy single functions for faster iteration:

```bash
# Deploy only the user handler
npx serverless deploy function -f listUsers

# Deploy with verbose output
npx serverless deploy -v
```

## Best Practices Summary

| Area | Practice |
|------|----------|
| **Structure** | Keep handlers thin, logic in services |
| **Errors** | Use custom error classes, never leak stack traces |
| **Secrets** | Parameter Store or Secrets Manager, never env files |
| **Cold starts** | Initialize outside handler, minimize bundle size |
| **Testing** | Unit test services, integration test handlers |
| **Deployment** | Use stages, CI/CD pipelines, function-level deploys |
| **Monitoring** | Structured logs, CloudWatch metrics, X-Ray tracing |
| **Security** | Least-privilege IAM, validate all input |

Serverless APIs simplify infrastructure management while enabling rapid scaling. Start with the Serverless Framework for ease of use, structure your code for testability, and implement proper error handling from day one.

For monitoring your serverless APIs in production, consider using [OneUptime](https://oneuptime.com) to track performance, set up alerts, and visualize your API health across all environments.
