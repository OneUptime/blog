# How to Use Lambda with API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Lambda, API Gateway, Serverless, REST API, HTTP API, SAM, CDK, DevOps

Description: A comprehensive guide to integrating AWS Lambda with API Gateway, covering REST vs HTTP APIs, proxy integration, request/response mapping, authorizers, CORS, stages, custom domains, and Infrastructure as Code examples.

---

> The serverless promise is not about eliminating servers. It is about eliminating the mental overhead of managing them. API Gateway plus Lambda turns HTTP requests into function invocations without provisioning or patching anything in between.

## Why Lambda Plus API Gateway?

AWS Lambda lets you run code without provisioning servers. API Gateway sits in front of Lambda to handle HTTP routing, authentication, rate limiting, and protocol translation. Together, they form the backbone of most serverless architectures on AWS. You pay only for requests processed and compute time consumed.

The combination shines when:

- You want to deploy microservices without managing containers or VMs.
- Traffic is unpredictable and you need automatic scaling to zero.
- You prefer Infrastructure as Code over clicking through consoles.
- You need built-in features like throttling, caching, and authorization.

## REST API vs HTTP API

API Gateway offers two flavors: REST API (v1) and HTTP API (v2). Choosing the right one matters for cost, features, and latency.

| Feature | REST API | HTTP API |
| --- | --- | --- |
| **Cost** | ~$3.50 per million requests | ~$1.00 per million requests |
| **Latency** | Higher (more features) | Lower (~60% faster) |
| **Lambda proxy** | Yes | Yes |
| **Request validation** | Yes | No (use Lambda) |
| **API keys / usage plans** | Yes | No |
| **Resource policies** | Yes | Limited |
| **Private integrations** | Yes | Yes |
| **WebSocket** | REST API only | No |
| **JWT authorizers** | Requires Lambda | Native support |

**When to pick REST API:**

- You need request/response transformation templates.
- You require API keys, usage plans, or caching.
- You want fine-grained resource policies for cross-account access.
- You need WebSocket support.

**When to pick HTTP API:**

- Cost and latency are priorities.
- You only need Lambda proxy integration.
- JWT authorization is sufficient.
- You want simpler configuration.

```bash
# Check which API types exist in your account
aws apigateway get-rest-apis --query 'items[].name'
aws apigatewayv2 get-apis --query 'Items[].Name'
```

## Proxy Integration

Proxy integration is the simplest way to connect API Gateway to Lambda. The entire HTTP request (headers, query strings, body, path parameters) is passed to Lambda as a single event object. Lambda returns a response object that API Gateway translates back to HTTP.

### Lambda Proxy Event Structure

```javascript
// event object received by Lambda (Node.js)
{
  "resource": "/users/{userId}",
  "path": "/users/123",
  "httpMethod": "GET",
  "headers": {
    "Accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
  },
  "queryStringParameters": {
    "include": "profile"
  },
  "pathParameters": {
    "userId": "123"
  },
  "body": null,
  "isBase64Encoded": false,
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "user-uuid",
        "email": "user@example.com"
      }
    },
    "requestId": "abc-123-def",
    "stage": "prod"
  }
}
```

### Lambda Proxy Response Structure

```javascript
// handler.js - Lambda function with proxy integration
export const handler = async (event) => {
  // Extract path parameter
  const userId = event.pathParameters?.userId;

  // Extract query string parameter
  const includeProfile = event.queryStringParameters?.include === 'profile';

  try {
    // Your business logic here
    const user = await fetchUser(userId, { includeProfile });

    // Return success response
    // API Gateway expects this exact structure
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // CORS headers if needed
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        data: user,
        requestId: event.requestContext.requestId
      })
    };
  } catch (error) {
    // Return error response
    console.error('Error fetching user:', error);

    return {
      statusCode: error.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        requestId: event.requestContext.requestId
      })
    };
  }
};
```

### Python Example

```python
# handler.py - Lambda function with proxy integration
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda handler for API Gateway proxy integration.

    Args:
        event: API Gateway proxy event
        context: Lambda context object

    Returns:
        dict: API Gateway proxy response
    """
    # Extract path parameter safely
    user_id = event.get('pathParameters', {}).get('userId')

    # Extract query string parameters
    query_params = event.get('queryStringParameters') or {}
    include_profile = query_params.get('include') == 'profile'

    try:
        # Your business logic here
        user = fetch_user(user_id, include_profile=include_profile)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'data': user,
                'requestId': event['requestContext']['requestId']
            })
        }
    except UserNotFoundError as e:
        logger.warning(f'User not found: {user_id}')
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }
    except Exception as e:
        logger.error(f'Unexpected error: {e}')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
```

## Request and Response Mapping

REST API supports Velocity Template Language (VTL) for transforming requests and responses. This is useful when you want API Gateway to handle formatting before or after Lambda processes the request.

### Request Mapping Template

```velocity
## mapping-template.vtl
## Transform incoming request before sending to Lambda
#set($inputRoot = $input.path('$'))
{
  "userId": "$input.params('userId')",
  "action": "$context.httpMethod",
  "timestamp": "$context.requestTime",
  "sourceIp": "$context.identity.sourceIp",
  #if($inputRoot.email)
  "email": "$inputRoot.email",
  #end
  "metadata": {
    "stage": "$context.stage",
    "requestId": "$context.requestId"
  }
}
```

### Response Mapping Template

```velocity
## response-mapping.vtl
## Transform Lambda response before sending to client
#set($inputRoot = $input.path('$'))
{
  "status": "success",
  "data": $inputRoot.data,
  "meta": {
    "version": "v1",
    "timestamp": "$context.requestTime"
  }
}
```

### Configuring Mapping via AWS CLI

```bash
# Create request mapping template for a method
aws apigateway put-integration \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method POST \
  --type AWS \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789:function:MyFunction/invocations" \
  --request-templates '{"application/json": "{\"userId\": \"$input.params('\''userId'\'')\", \"body\": $input.json('\''$'\'')}"}'

# Create response mapping template
aws apigateway put-integration-response \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method POST \
  --status-code 200 \
  --response-templates '{"application/json": "{\"result\": $input.json('\''$.body'\'')}"}'
```

## Authorizers

API Gateway supports multiple authorization mechanisms to secure your APIs.

### Lambda Authorizer (Custom Authorizer)

Lambda authorizers let you implement custom authentication logic. They receive the authorization token and return an IAM policy.

```javascript
// authorizer.js - Token-based Lambda authorizer
export const handler = async (event) => {
  // Extract token from Authorization header
  const token = event.authorizationToken;

  // Extract the method ARN for policy generation
  const methodArn = event.methodArn;

  try {
    // Validate the token (JWT verification, database lookup, etc.)
    const decoded = await verifyToken(token);

    // Generate Allow policy
    return generatePolicy(decoded.sub, 'Allow', methodArn, {
      // Context values are passed to Lambda integration
      userId: decoded.sub,
      email: decoded.email,
      roles: decoded.roles.join(',')
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    // Return Deny policy or throw to return 401
    throw new Error('Unauthorized');
  }
};

// Helper function to generate IAM policy
function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    },
    // Context is available in event.requestContext.authorizer
    context
  };
}
```

### Request-Based Authorizer

For HTTP API, you can use request-based authorizers that have access to headers, query strings, and other request parameters.

```javascript
// request-authorizer.js - Request-based authorizer for HTTP API
export const handler = async (event) => {
  // Access headers, query strings, path parameters
  const apiKey = event.headers['x-api-key'];
  const clientId = event.queryStringParameters?.clientId;

  try {
    // Validate API key and client
    const client = await validateApiKey(apiKey, clientId);

    return {
      isAuthorized: true,
      context: {
        clientId: client.id,
        tier: client.tier,
        rateLimit: client.rateLimit.toString()
      }
    };
  } catch (error) {
    return {
      isAuthorized: false
    };
  }
};
```

### JWT Authorizer (HTTP API Native)

HTTP API has built-in JWT authorization without needing Lambda.

```yaml
# serverless.yml - JWT authorizer configuration
provider:
  httpApi:
    authorizers:
      jwtAuthorizer:
        type: jwt
        identitySource: $request.header.Authorization
        issuerUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx
        audience:
          - your-app-client-id

functions:
  getUser:
    handler: handler.getUser
    events:
      - httpApi:
          method: GET
          path: /users/{userId}
          authorizer:
            name: jwtAuthorizer
            scopes:
              - users:read
```

### Cognito User Pool Authorizer

```yaml
# CloudFormation snippet for Cognito authorizer
Resources:
  ApiGatewayAuthorizer:
    Type: AWS::ApiGateway::Authorizer
    Properties:
      Name: CognitoAuthorizer
      Type: COGNITO_USER_POOLS
      RestApiId: !Ref ApiGateway
      IdentitySource: method.request.header.Authorization
      ProviderARNs:
        - !GetAtt UserPool.Arn
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) must be configured when browsers call your API from a different domain.

### HTTP API CORS (Simple)

```yaml
# serverless.yml - HTTP API CORS
provider:
  httpApi:
    cors:
      allowedOrigins:
        - https://example.com
        - https://app.example.com
      allowedHeaders:
        - Content-Type
        - Authorization
        - X-Request-Id
      allowedMethods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      allowCredentials: true
      maxAge: 86400
```

### REST API CORS (Manual Setup)

REST API requires explicit OPTIONS method configuration.

```javascript
// handler.js - Include CORS headers in every response
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Request-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

// OPTIONS handler for preflight requests
export const options = async () => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: ''
  };
};

// Regular handler with CORS headers
export const handler = async (event) => {
  // Your logic here
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: 'response' })
  };
};
```

### SAM Template with CORS

```yaml
# template.yaml - SAM template with CORS configuration
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Api:
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization,X-Request-Id'"
      AllowOrigin: "'https://example.com'"
      AllowCredentials: true
      MaxAge: "'86400'"

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.handler
      Runtime: nodejs18.x
      Events:
        GetUsers:
          Type: Api
          Properties:
            Path: /users
            Method: GET
```

## Stages and Deployment

Stages let you manage multiple environments (dev, staging, prod) from a single API Gateway.

### Stage Variables

Stage variables are key-value pairs that act like environment variables for your API stages.

```yaml
# CloudFormation - Define stage with variables
Resources:
  ProdStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      StageName: prod
      RestApiId: !Ref ApiGateway
      DeploymentId: !Ref ApiDeployment
      Variables:
        lambdaAlias: prod
        tableName: users-prod
        logLevel: WARN

  DevStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      StageName: dev
      RestApiId: !Ref ApiGateway
      DeploymentId: !Ref ApiDeployment
      Variables:
        lambdaAlias: dev
        tableName: users-dev
        logLevel: DEBUG
```

### Using Stage Variables in Integration

```yaml
# Reference stage variable in Lambda ARN
Resources:
  ApiMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGateway
      ResourceId: !Ref UsersResource
      HttpMethod: GET
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        # Use stage variable to route to different Lambda aliases
        Uri: !Sub
          - "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:MyFunction:${!stageVariables.lambdaAlias}/invocations"
          - {}
```

### Canary Deployments

Gradually shift traffic to new deployments using canary settings.

```bash
# Create canary deployment via AWS CLI
aws apigateway create-deployment \
  --rest-api-id abc123 \
  --stage-name prod \
  --canary-settings '{
    "percentTraffic": 10,
    "useStageCache": false
  }'

# Promote canary to full deployment
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[
    {"op": "remove", "path": "/canarySettings"}
  ]'
```

## Custom Domains

Custom domains let you expose your API under your own domain name with TLS certificates.

### Setting Up Custom Domain

```yaml
# CloudFormation - Custom domain with Route 53
Resources:
  # ACM Certificate (must be in us-east-1 for edge-optimized)
  Certificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: api.example.com
      ValidationMethod: DNS
      DomainValidationOptions:
        - DomainName: api.example.com
          HostedZoneId: !Ref HostedZone

  # Custom domain name
  CustomDomain:
    Type: AWS::ApiGateway::DomainName
    Properties:
      DomainName: api.example.com
      RegionalCertificateArn: !Ref Certificate
      EndpointConfiguration:
        Types:
          - REGIONAL

  # Base path mapping
  BasePathMapping:
    Type: AWS::ApiGateway::BasePathMapping
    Properties:
      DomainName: !Ref CustomDomain
      RestApiId: !Ref ApiGateway
      Stage: prod
      BasePath: v1

  # DNS record
  DnsRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: api.example.com
      Type: A
      AliasTarget:
        DNSName: !GetAtt CustomDomain.RegionalDomainName
        HostedZoneId: !GetAtt CustomDomain.RegionalHostedZoneId
```

### Multiple API Versions

```bash
# Map different API versions to path prefixes
# api.example.com/v1 -> REST API v1
# api.example.com/v2 -> REST API v2

aws apigateway create-base-path-mapping \
  --domain-name api.example.com \
  --rest-api-id abc123-v1 \
  --stage prod \
  --base-path v1

aws apigateway create-base-path-mapping \
  --domain-name api.example.com \
  --rest-api-id xyz789-v2 \
  --stage prod \
  --base-path v2
```

## SAM (Serverless Application Model) Example

AWS SAM simplifies serverless application deployment with shorthand syntax.

```yaml
# template.yaml - Complete SAM template
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: User API with Lambda and API Gateway

# Global settings applied to all functions
Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: nodejs18.x
    Environment:
      Variables:
        TABLE_NAME: !Ref UsersTable
        LOG_LEVEL: INFO
    Tracing: Active

  Api:
    TracingEnabled: true
    Cors:
      AllowMethods: "'*'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'*'"

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod

Resources:
  # API Gateway
  UserApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub user-api-${Environment}
      StageName: !Ref Environment
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  # Lambda Functions
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub get-user-${Environment}
      CodeUri: src/
      Handler: users.getUser
      Description: Get user by ID
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref UsersTable
      Events:
        GetUser:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users/{userId}
            Method: GET

  CreateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub create-user-${Environment}
      CodeUri: src/
      Handler: users.createUser
      Description: Create new user
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable
      Events:
        CreateUser:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users
            Method: POST

  ListUsersFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub list-users-${Environment}
      CodeUri: src/
      Handler: users.listUsers
      Description: List all users with pagination
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref UsersTable
      Events:
        ListUsers:
          Type: Api
          Properties:
            RestApiId: !Ref UserApi
            Path: /users
            Method: GET

  # DynamoDB Table
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub users-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH

  # Cognito User Pool
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub user-pool-${Environment}
      AutoVerifiedAttributes:
        - email

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${UserApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}"

  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref UserPool
```

### SAM CLI Commands

```bash
# Build the application
sam build

# Run locally for testing
sam local start-api --port 3000

# Invoke single function locally
sam local invoke GetUserFunction --event events/get-user.json

# Deploy to AWS
sam deploy --guided

# View logs
sam logs --name GetUserFunction --stack-name user-api --tail

# Delete stack
sam delete --stack-name user-api
```

## CDK (Cloud Development Kit) Example

AWS CDK lets you define infrastructure using familiar programming languages.

```typescript
// lib/api-stack.ts - CDK TypeScript example
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // DynamoDB table for storing users
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `users-${environment}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `user-pool-${environment}`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    // User Pool Client
    const userPoolClient = userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Shared Lambda layer for common dependencies
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../layers/common')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common utilities and dependencies',
    });

    // Lambda function defaults
    const functionDefaults = {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      layers: [commonLayer],
      environment: {
        TABLE_NAME: usersTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
        LOG_LEVEL: environment === 'prod' ? 'WARN' : 'DEBUG',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    };

    // Get User Lambda
    const getUserFunction = new lambda.Function(this, 'GetUserFunction', {
      ...functionDefaults,
      functionName: `get-user-${environment}`,
      handler: 'users.getUser',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      description: 'Retrieve user by ID',
    });
    usersTable.grantReadData(getUserFunction);

    // Create User Lambda
    const createUserFunction = new lambda.Function(this, 'CreateUserFunction', {
      ...functionDefaults,
      functionName: `create-user-${environment}`,
      handler: 'users.createUser',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      description: 'Create new user',
    });
    usersTable.grantReadWriteData(createUserFunction);

    // List Users Lambda
    const listUsersFunction = new lambda.Function(this, 'ListUsersFunction', {
      ...functionDefaults,
      functionName: `list-users-${environment}`,
      handler: 'users.listUsers',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      description: 'List users with pagination',
    });
    usersTable.grantReadData(listUsersFunction);

    // API Gateway REST API
    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: `user-api-${environment}`,
      description: 'User management API',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API Resources and Methods
    const usersResource = api.root.addResource('users');

    // GET /users - List users
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(listUsersFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /users - Create user
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(createUserFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: new apigateway.RequestValidator(this, 'CreateUserValidator', {
        restApi: api,
        validateRequestBody: true,
      }),
    });

    // GET /users/{userId} - Get user by ID
    const userResource = usersResource.addResource('{userId}');
    userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Output the API URL
    this.apiUrl = new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
```

### CDK CLI Commands

```bash
# Install CDK
npm install -g aws-cdk

# Initialize new project
cdk init app --language typescript

# Synthesize CloudFormation template
cdk synth

# Compare deployed stack with current state
cdk diff

# Deploy stack
cdk deploy --context environment=dev

# Deploy with approval for security changes
cdk deploy --require-approval broadening

# Destroy stack
cdk destroy
```

## Best Practices Summary

**Architecture:**

- Use HTTP API for cost savings when you only need Lambda proxy integration.
- Use REST API when you need request validation, caching, or API keys.
- Keep Lambda functions focused on single responsibilities.
- Use Lambda layers for shared code and dependencies.

**Security:**

- Always use HTTPS via custom domains with ACM certificates.
- Implement authentication using Cognito, JWT authorizers, or Lambda authorizers.
- Apply least-privilege IAM roles to Lambda functions.
- Enable AWS WAF for protection against common web exploits.
- Use resource policies to restrict API access by IP or VPC.

**Performance:**

- Enable provisioned concurrency for latency-sensitive endpoints.
- Use API Gateway caching for read-heavy endpoints.
- Keep Lambda packages small for faster cold starts.
- Use Lambda SnapStart (Java) or optimize initialization code.

**Operations:**

- Enable X-Ray tracing for distributed tracing across services.
- Use structured logging with correlation IDs from requestContext.
- Set up CloudWatch alarms for error rates and latency.
- Use stage variables to manage environment-specific configuration.
- Implement canary deployments for gradual rollouts.

**Cost Optimization:**

- Right-size Lambda memory (more memory means faster CPU but higher cost).
- Use HTTP API instead of REST API when possible (70% cheaper).
- Set appropriate timeouts to avoid runaway functions.
- Enable API Gateway caching to reduce Lambda invocations.

**Testing:**

- Use SAM CLI for local testing before deployment.
- Write integration tests that hit the actual API Gateway endpoint.
- Test authorizer flows separately from business logic.
- Validate CORS configuration with actual browser requests.

## Monitoring with OneUptime

Serverless architectures distribute complexity across managed services. When something breaks, you need visibility across Lambda, API Gateway, and downstream services.

[OneUptime](https://oneuptime.com) provides:

- **Synthetic monitoring** to probe your API endpoints from multiple regions.
- **Alerting** when latency exceeds thresholds or error rates spike.
- **Status pages** to communicate incidents to your users.
- **Incident management** with on-call schedules and escalation policies.

Combine AWS X-Ray for tracing with OneUptime for external monitoring to get complete visibility into your serverless APIs.
