# Set Up AppSync GraphQL APIs with Lambda Resolvers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, AppSync, GraphQL, Lambda, Serverless

Description: Complete guide to building GraphQL APIs with AWS AppSync and Lambda resolvers for flexible data fetching and mutation handling.

---

REST APIs are great, but they have a fundamental problem: the server decides what data comes back, not the client. GraphQL flips this by letting clients request exactly the fields they need. AWS AppSync is a managed GraphQL service that handles the infrastructure side - connection management, caching, real-time subscriptions - while you focus on your schema and resolvers.

In this post, we'll build a GraphQL API using AppSync with Lambda resolvers for custom business logic.

## Why AppSync Over Building Your Own

You could run Apollo Server on Lambda or ECS, but AppSync gives you a few things for free: built-in caching, real-time subscriptions via WebSockets, offline support for mobile clients, and automatic connection management. If you need any of those, AppSync saves you weeks of work.

## Creating the GraphQL Schema

Every GraphQL API starts with a schema. This defines what clients can query and mutate.

This schema defines a simple product catalog API:

```graphql
# schema.graphql - Product catalog API
type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: String!
  inStock: Boolean!
  reviews: [Review]
}

type Review {
  id: ID!
  productId: ID!
  author: String!
  rating: Int!
  comment: String
  createdAt: String!
}

type ProductConnection {
  items: [Product]
  nextToken: String
}

type Query {
  getProduct(id: ID!): Product
  listProducts(category: String, limit: Int, nextToken: String): ProductConnection
  searchProducts(query: String!): [Product]
}

type Mutation {
  createProduct(input: CreateProductInput!): Product
  updateProduct(id: ID!, input: UpdateProductInput!): Product
  deleteProduct(id: ID!): Boolean
  addReview(input: AddReviewInput!): Review
}

input CreateProductInput {
  name: String!
  description: String
  price: Float!
  category: String!
}

input UpdateProductInput {
  name: String
  description: String
  price: Float
  category: String
  inStock: Boolean
}

input AddReviewInput {
  productId: ID!
  author: String!
  rating: Int!
  comment: String
}
```

## Creating the AppSync API

Create the API through the CLI or CloudFormation.

This creates the AppSync API and uploads the schema:

```bash
# Create the API
aws appsync create-graphql-api \
  --name ProductCatalogAPI \
  --authentication-type API_KEY

# Upload the schema
aws appsync start-schema-creation \
  --api-id YOUR_API_ID \
  --definition fileb://schema.graphql
```

## Writing Lambda Resolvers

Lambda resolvers handle the business logic for each GraphQL field. AppSync sends resolver requests to your Lambda, and the Lambda returns the data.

This Lambda function handles all product queries and mutations:

```javascript
// productResolver.js - Resolves GraphQL operations for products
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand,
        UpdateCommand, DeleteCommand, QueryCommand, ScanCommand }
  = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.PRODUCTS_TABLE;

exports.handler = async (event) => {
  console.log('Resolver event:', JSON.stringify(event));

  const { fieldName, arguments: args } = event.info
    ? { fieldName: event.info.fieldName, arguments: event.arguments }
    : { fieldName: event.field, arguments: event.arguments };

  switch (fieldName) {
    case 'getProduct':
      return getProduct(args.id);
    case 'listProducts':
      return listProducts(args);
    case 'createProduct':
      return createProduct(args.input);
    case 'updateProduct':
      return updateProduct(args.id, args.input);
    case 'deleteProduct':
      return deleteProduct(args.id);
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
};

async function getProduct(id) {
  const result = await ddbClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }));
  return result.Item || null;
}

async function listProducts({ category, limit = 20, nextToken }) {
  const params = {
    TableName: TABLE,
    Limit: limit
  };

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(nextToken, 'base64').toString()
    );
  }

  if (category) {
    params.IndexName = 'category-index';
    params.KeyConditionExpression = 'category = :cat';
    params.ExpressionAttributeValues = { ':cat': category };

    const result = await ddbClient.send(new QueryCommand(params));
    return {
      items: result.Items,
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null
    };
  }

  const result = await ddbClient.send(new ScanCommand(params));
  return {
    items: result.Items,
    nextToken: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null
  };
}

async function createProduct(input) {
  const product = {
    id: randomUUID(),
    ...input,
    inStock: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await ddbClient.send(new PutCommand({
    TableName: TABLE,
    Item: product
  }));

  return product;
}

async function updateProduct(id, input) {
  const updates = Object.entries(input).filter(([_, v]) => v !== undefined);
  const expressions = updates.map(([key], i) => `#f${i} = :v${i}`);
  const names = {};
  const values = {};

  updates.forEach(([key, value], i) => {
    names[`#f${i}`] = key;
    values[`:v${i}`] = value;
  });

  // Always update timestamp
  expressions.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  const result = await ddbClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes;
}

async function deleteProduct(id) {
  await ddbClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id }
  }));
  return true;
}
```

## Connecting Lambda to AppSync

You need to create a data source and attach resolvers to your schema fields.

This attaches the Lambda function as a data source:

```bash
# Create the Lambda data source
aws appsync create-data-source \
  --api-id YOUR_API_ID \
  --name ProductLambda \
  --type AWS_LAMBDA \
  --lambda-config '{"lambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789:function:productResolver"}' \
  --service-role-arn arn:aws:iam::123456789:role/AppSyncLambdaRole
```

Then create resolvers for each field:

```bash
# Resolver for getProduct query
aws appsync create-resolver \
  --api-id YOUR_API_ID \
  --type-name Query \
  --field-name getProduct \
  --data-source-name ProductLambda \
  --runtime '{"name": "APPSYNC_JS", "runtimeVersion": "1.0.0"}' \
  --code '
    export function request(ctx) {
      return {
        operation: "Invoke",
        payload: {
          field: ctx.info.fieldName,
          arguments: ctx.arguments,
          source: ctx.source
        }
      };
    }
    export function response(ctx) {
      return ctx.result;
    }
  '
```

## SAM Template

Here's a SAM template that puts everything together.

This creates the full AppSync API with Lambda resolver:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ProductApi:
    Type: AWS::AppSync::GraphQLApi
    Properties:
      Name: ProductCatalogAPI
      AuthenticationType: API_KEY

  ProductSchema:
    Type: AWS::AppSync::GraphQLSchema
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      DefinitionS3Location: schema.graphql

  ApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      Expires: 1740787200

  ProductDataSource:
    Type: AWS::AppSync::DataSource
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      Name: ProductLambda
      Type: AWS_LAMBDA
      LambdaConfig:
        LambdaFunctionArn: !GetAtt ProductResolverFunction.Arn
      ServiceRoleArn: !GetAtt AppSyncRole.Arn

  GetProductResolver:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      TypeName: Query
      FieldName: getProduct
      DataSourceName: !GetAtt ProductDataSource.Name

  ListProductsResolver:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      TypeName: Query
      FieldName: listProducts
      DataSourceName: !GetAtt ProductDataSource.Name

  CreateProductResolver:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt ProductApi.ApiId
      TypeName: Mutation
      FieldName: createProduct
      DataSourceName: !GetAtt ProductDataSource.Name

  ProductResolverFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: productResolver.handler
      Runtime: nodejs20.x
      Environment:
        Variables:
          PRODUCTS_TABLE: !Ref ProductsTable

  ProductsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: Products
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
        - AttributeName: category
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: category-index
          KeySchema:
            - AttributeName: category
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      BillingMode: PAY_PER_REQUEST

  AppSyncRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: appsync.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: LambdaInvoke
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: !GetAtt ProductResolverFunction.Arn
```

## Testing Your GraphQL API

Once deployed, test with curl or a GraphQL client.

This queries a product by ID:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query": "query { getProduct(id: \"123\") { id name price category inStock } }"}' \
  https://YOUR_API_ID.appsync-api.us-east-1.amazonaws.com/graphql
```

This creates a new product:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query": "mutation { createProduct(input: { name: \"Widget\", price: 9.99, category: \"tools\" }) { id name price } }"}' \
  https://YOUR_API_ID.appsync-api.us-east-1.amazonaws.com/graphql
```

## Monitoring

AppSync publishes CloudWatch metrics including `4XXError`, `5XXError`, `Latency`, and request counts. Set up alarms on error rates and latency. For DynamoDB direct resolvers without Lambda, see our post on [AppSync with DynamoDB direct resolvers](https://oneuptime.com/blog/post/appsync-dynamodb-direct-resolvers/view).

## Wrapping Up

AppSync with Lambda resolvers gives you a fully managed GraphQL API where you only write the business logic. The schema defines your contract, Lambda handles the implementation, and AppSync manages everything in between. Start with Lambda resolvers for flexibility, and as you identify simple CRUD patterns, consider switching those to DynamoDB direct resolvers to reduce Lambda invocations.
