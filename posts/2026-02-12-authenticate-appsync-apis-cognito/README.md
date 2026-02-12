# Authenticate AppSync APIs with Cognito

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, AppSync, Cognito, Authentication, GraphQL

Description: Learn how to secure your AWS AppSync GraphQL APIs with Amazon Cognito for user authentication, group-based authorization, and fine-grained access control.

---

A GraphQL API without authentication is a public API. For most applications, you need to know who's making requests and what they're allowed to do. Amazon Cognito integrates tightly with AppSync, giving you user authentication, group-based authorization, and fine-grained field-level access control without writing authentication middleware.

## Authentication Modes

AppSync supports multiple authentication modes:

- **API_KEY** - Simple but insecure. Good for public data and development.
- **AMAZON_COGNITO_USER_POOLS** - User authentication with JWT tokens.
- **AWS_IAM** - AWS credentials. Good for server-to-server communication.
- **OPENID_CONNECT** - Any OIDC-compliant identity provider.
- **AWS_LAMBDA** - Custom authorization logic.

You can use multiple modes simultaneously, which is powerful. For example, public queries use API_KEY while mutations require Cognito authentication.

## Setting Up Cognito with AppSync

First, you need a Cognito User Pool with the right configuration.

This creates a user pool and app client suitable for AppSync:

```bash
# Create the user pool
aws cognito-idp create-user-pool \
  --pool-name AppSyncUsers \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }'

# Create an app client
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-name AppSyncClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

Now configure your AppSync API to use this pool:

```bash
aws appsync update-graphql-api \
  --api-id YOUR_API_ID \
  --name SecuredProductAPI \
  --authentication-type AMAZON_COGNITO_USER_POOLS \
  --user-pool-config '{
    "userPoolId": "us-east-1_ABC123",
    "awsRegion": "us-east-1",
    "defaultAction": "ALLOW"
  }'
```

The `defaultAction` of ALLOW means authenticated users can access all fields by default. Set it to DENY if you want to explicitly grant access to each field.

## Multiple Authentication Modes

Most real applications need at least two auth modes - one for public access and one for authenticated access.

This configures both API key and Cognito authentication:

```bash
aws appsync update-graphql-api \
  --api-id YOUR_API_ID \
  --name ProductAPI \
  --authentication-type API_KEY \
  --additional-authentication-providers '[
    {
      "authenticationType": "AMAZON_COGNITO_USER_POOLS",
      "userPoolConfig": {
        "userPoolId": "us-east-1_ABC123",
        "awsRegion": "us-east-1"
      }
    }
  ]'
```

Now you can use schema directives to control which auth mode each field requires.

## Schema Directives for Authorization

AppSync provides directives to control access at the type and field level.

This schema uses directives to enforce different access levels:

```graphql
# Public - anyone with API key can read products
type Query {
  # Anyone can view products
  getProduct(id: ID!): Product @aws_api_key @aws_cognito_user_pools

  # Anyone can list products
  listProducts(limit: Int, nextToken: String): ProductConnection
    @aws_api_key @aws_cognito_user_pools

  # Only authenticated users can see their orders
  myOrders: [Order] @aws_cognito_user_pools
}

type Mutation {
  # Only authenticated users can create products
  createProduct(input: CreateProductInput!): Product
    @aws_cognito_user_pools

  # Only admins can delete products
  deleteProduct(id: ID!): Product
    @aws_auth(cognito_groups: ["admin"])

  # Only the product owner can update
  updateProduct(id: ID!, input: UpdateProductInput!): Product
    @aws_cognito_user_pools
}

type Product @aws_api_key @aws_cognito_user_pools {
  id: ID!
  name: String!
  price: Float!
  category: String!
  inStock: Boolean!
  # Only authenticated users can see the cost
  costPrice: Float @aws_cognito_user_pools
  # Only admins can see internal notes
  internalNotes: String @aws_auth(cognito_groups: ["admin"])
}

type Order @aws_cognito_user_pools {
  id: ID!
  userId: String!
  items: [OrderItem]
  total: Float!
  status: String!
}
```

Notice how `Product` is accessible via both API key and Cognito, but specific fields like `costPrice` and `internalNotes` require higher authentication levels. Fields without explicit directives inherit from their parent type.

## Group-Based Authorization

Cognito groups let you implement role-based access control. Create groups in your user pool and use `@aws_auth` to restrict access.

Create groups in Cognito:

```bash
# Create admin group
aws cognito-idp create-group \
  --user-pool-id YOUR_POOL_ID \
  --group-name admin \
  --description "Administrator users"

# Create editor group
aws cognito-idp create-group \
  --user-pool-id YOUR_POOL_ID \
  --group-name editor \
  --description "Content editors"

# Add a user to a group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_POOL_ID \
  --username user@example.com \
  --group-name admin
```

Use group-based directives in your schema:

```graphql
type Mutation {
  # Admins and editors can create
  createProduct(input: CreateProductInput!): Product
    @aws_auth(cognito_groups: ["admin", "editor"])

  # Only admins can delete
  deleteProduct(id: ID!): Product
    @aws_auth(cognito_groups: ["admin"])

  # Editors can update but not delete
  updateProduct(id: ID!, input: UpdateProductInput!): Product
    @aws_auth(cognito_groups: ["admin", "editor"])
}
```

## Owner-Based Authorization in Resolvers

Sometimes you need to ensure users can only access or modify their own data. Handle this in your resolver logic.

This resolver checks that the requesting user owns the resource:

```javascript
// updateProduct resolver with owner check
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // Get the authenticated user's identity
  const userId = ctx.identity.sub; // Cognito user ID
  const groups = ctx.identity.groups || [];

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.id })
  };
}

export function response(ctx) {
  const product = ctx.result;
  const userId = ctx.identity.sub;
  const groups = ctx.identity.groups || [];

  // Admins can update anything
  if (groups.includes('admin')) {
    return product;
  }

  // Regular users can only update their own products
  if (product.ownerId !== userId) {
    util.unauthorized();
  }

  return product;
}
```

For mutations, you can embed the owner ID during creation:

```javascript
// createProduct resolver - automatically sets owner
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = util.autoId();
  const now = util.time.nowISO8601();

  const item = {
    id: id,
    ...ctx.args.input,
    ownerId: ctx.identity.sub, // Automatically set owner
    ownerEmail: ctx.identity.claims.email,
    inStock: true,
    createdAt: now,
    updatedAt: now
  };

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ id }),
    attributeValues: util.dynamodb.toMapValues(item)
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

## Client-Side Authentication

Here's how to authenticate with Cognito and make AppSync requests.

This shows the sign-in flow and authenticated API calls:

```javascript
// auth.js - Client-side authentication with Cognito and AppSync
import { Amplify } from 'aws-amplify';
import { signIn, signUp, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_ABC123',
      userPoolClientId: 'your-client-id'
    }
  },
  API: {
    GraphQL: {
      endpoint: 'https://YOUR_API_ID.appsync-api.us-east-1.amazonaws.com/graphql',
      defaultAuthMode: 'userPool'
    }
  }
});

const client = generateClient();

// Sign up
async function register(email, password, name) {
  const result = await signUp({
    username: email,
    password: password,
    options: {
      userAttributes: { email, name }
    }
  });
  return result;
}

// Sign in
async function login(email, password) {
  const result = await signIn({
    username: email,
    password: password
  });
  return result;
}

// Make authenticated GraphQL request
async function createProduct(productData) {
  const result = await client.graphql({
    query: `
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
          price
          category
        }
      }
    `,
    variables: {
      input: productData
    }
  });

  return result.data.createProduct;
}

// Make public request with API key
async function listProducts() {
  const result = await client.graphql({
    query: `
      query ListProducts {
        listProducts {
          items { id name price category inStock }
        }
      }
    `,
    authMode: 'apiKey' // Override default auth mode
  });

  return result.data.listProducts.items;
}
```

## SAM Template

This SAM template configures AppSync with dual authentication:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: AppSyncUsers
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true

  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref UserPool
      ClientName: AppSyncClient
      GenerateSecret: false
      ExplicitAuthFlows:
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH

  AdminGroup:
    Type: AWS::Cognito::UserPoolGroup
    Properties:
      GroupName: admin
      UserPoolId: !Ref UserPool

  ProductApi:
    Type: AWS::AppSync::GraphQLApi
    Properties:
      Name: SecuredProductAPI
      AuthenticationType: API_KEY
      AdditionalAuthenticationProviders:
        - AuthenticationType: AMAZON_COGNITO_USER_POOLS
          UserPoolConfig:
            UserPoolId: !Ref UserPool
            AwsRegion: !Ref AWS::Region

  ApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt ProductApi.ApiId

Outputs:
  GraphQLEndpoint:
    Value: !GetAtt ProductApi.GraphQLUrl
  UserPoolId:
    Value: !Ref UserPool
  UserPoolClientId:
    Value: !Ref UserPoolClient
```

## Testing Authentication

Test your authenticated endpoints with curl by first getting a token:

```bash
# Get auth tokens
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id YOUR_CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=YourPassword1 \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Make authenticated GraphQL request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"query": "mutation { createProduct(input: { name: \"Test\", price: 9.99, category: \"test\" }) { id name } }"}' \
  https://YOUR_API_ID.appsync-api.us-east-1.amazonaws.com/graphql
```

## Wrapping Up

Cognito authentication with AppSync gives you a production-ready auth system without writing auth middleware. Use schema directives for declarative access control, groups for role-based authorization, and resolver logic for owner-based access. The combination of API key for public access and Cognito for authenticated access covers most application needs. For more on building the underlying auth flow, see our post on [building serverless authentication with Lambda and Cognito](https://oneuptime.com/blog/post/serverless-authentication-flow-lambda-cognito/view).
