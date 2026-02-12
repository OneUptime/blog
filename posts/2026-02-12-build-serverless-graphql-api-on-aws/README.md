# How to Build a Serverless GraphQL API on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GraphQL, AppSync, Lambda, Serverless

Description: Build a serverless GraphQL API on AWS using AppSync and Lambda resolvers with DynamoDB, authentication, subscriptions, and real-time data capabilities.

---

GraphQL APIs solve a lot of problems that REST APIs struggle with - over-fetching, under-fetching, and the need for multiple round trips to get related data. AWS AppSync is a managed GraphQL service that takes this a step further by adding real-time subscriptions, offline sync, and built-in caching. If you're building a data-rich application, this is one of the most powerful combinations on AWS.

We'll also cover building a GraphQL API with Apollo Server on Lambda for teams that prefer more control over their GraphQL layer.

## Option 1: AWS AppSync (Managed GraphQL)

AppSync is the fastest path to a production GraphQL API on AWS. It connects directly to DynamoDB, Lambda, RDS, and HTTP endpoints.

### Define Your Schema

Create a GraphQL schema that AppSync will use:

```graphql
# schema.graphql
type Query {
  getPost(id: ID!): Post
  listPosts(limit: Int, nextToken: String): PostConnection!
  getUser(id: ID!): User
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
}

type Subscription {
  onCreatePost: Post @aws_subscribe(mutations: ["createPost"])
  onUpdatePost: Post @aws_subscribe(mutations: ["updatePost"])
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type PostConnection {
  items: [Post!]!
  nextToken: String
}

input CreatePostInput {
  title: String!
  content: String!
  authorId: ID!
}

input UpdatePostInput {
  title: String
  content: String
}
```

### Create the AppSync API

Use the CLI to create the API and data sources:

```bash
# Create the AppSync API
aws appsync create-graphql-api \
  --name my-graphql-api \
  --authentication-type API_KEY \
  --region us-east-1

# Upload the schema
aws appsync start-schema-creation \
  --api-id YOUR_API_ID \
  --definition fileb://schema.graphql
```

### DynamoDB Data Source

Create a DynamoDB table and connect it as a data source:

```bash
# Create the DynamoDB table
aws dynamodb create-table \
  --table-name Posts \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create an IAM role for AppSync to access DynamoDB
# (use CloudFormation or create manually)

# Add DynamoDB as a data source
aws appsync create-data-source \
  --api-id YOUR_API_ID \
  --name PostsTable \
  --type AMAZON_DYNAMODB \
  --dynamodb-config tableName=Posts,awsRegion=us-east-1 \
  --service-role-arn arn:aws:iam::ACCOUNT_ID:role/appsync-dynamodb-role
```

### VTL Resolvers

Create resolvers that map GraphQL operations to DynamoDB operations. Here's the resolver for creating a post:

```json
{
  "version": "2018-05-29",
  "operation": "PutItem",
  "key": {
    "id": { "S": "$util.autoId()" }
  },
  "attributeValues": {
    "title": { "S": "$ctx.args.input.title" },
    "content": { "S": "$ctx.args.input.content" },
    "authorId": { "S": "$ctx.args.input.authorId" },
    "createdAt": { "S": "$util.time.nowISO8601()" },
    "updatedAt": { "S": "$util.time.nowISO8601()" }
  }
}
```

For the list query with pagination:

```json
{
  "version": "2018-05-29",
  "operation": "Scan",
  "limit": $util.defaultIfNull($ctx.args.limit, 20),
  #if($ctx.args.nextToken)
    "nextToken": "$ctx.args.nextToken",
  #end
}
```

## Option 2: Apollo Server on Lambda

For more control over your GraphQL layer, run Apollo Server on Lambda.

Install the dependencies:

```bash
npm install @apollo/server graphql @as-integrations/aws-lambda
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Create your Apollo Server Lambda handler:

```javascript
// src/handler.js
const { ApolloServer } = require('@apollo/server');
const {
  startServerAndCreateLambdaHandler,
  handlers,
} = require('@as-integrations/aws-lambda');
const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

// Create the Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.STAGE !== 'production',
});

// Export the Lambda handler
exports.handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
```

Define your type definitions:

```javascript
// src/schema.js
const typeDefs = `#graphql
  type Query {
    getPost(id: ID!): Post
    listPosts(limit: Int, offset: Int): [Post!]!
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    authorId: ID!
    createdAt: String!
    updatedAt: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
    authorId: ID!
  }

  input UpdatePostInput {
    title: String
    content: String
  }
`;

module.exports = { typeDefs };
```

Implement the resolvers with DynamoDB:

```javascript
// src/resolvers.js
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.POSTS_TABLE || 'Posts';

const resolvers = {
  Query: {
    getPost: async (_, { id }) => {
      const result = await docClient.send(
        new GetCommand({ TableName: TABLE, Key: { id } })
      );
      return result.Item || null;
    },

    listPosts: async (_, { limit = 20, offset = 0 }) => {
      const result = await docClient.send(
        new ScanCommand({ TableName: TABLE, Limit: limit })
      );
      return result.Items || [];
    },
  },

  Mutation: {
    createPost: async (_, { input }) => {
      const post = {
        id: uuidv4(),
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({ TableName: TABLE, Item: post })
      );

      return post;
    },

    updatePost: async (_, { id, input }) => {
      const existing = await docClient.send(
        new GetCommand({ TableName: TABLE, Key: { id } })
      );

      if (!existing.Item) {
        throw new Error('Post not found');
      }

      const updated = {
        ...existing.Item,
        ...input,
        updatedAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({ TableName: TABLE, Item: updated })
      );

      return updated;
    },

    deletePost: async (_, { id }) => {
      await docClient.send(
        new DeleteCommand({ TableName: TABLE, Key: { id } })
      );
      return true;
    },
  },
};

module.exports = { resolvers };
```

### Serverless Configuration for Apollo

```yaml
# serverless.yml
service: graphql-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    POSTS_TABLE: !Ref PostsTable
    STAGE: ${self:provider.stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:*
          Resource:
            - !GetAtt PostsTable.Arn

functions:
  graphql:
    handler: src/handler.handler
    events:
      - httpApi:
          path: /graphql
          method: POST
      - httpApi:
          path: /graphql
          method: GET

resources:
  Resources:
    PostsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-posts-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

Deploy and test:

```bash
# Deploy
npx serverless deploy

# Test with a GraphQL query
curl -X POST YOUR_API_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ listPosts { id title content } }"}'
```

## Choosing Between AppSync and Apollo on Lambda

**Choose AppSync when:**
- You need real-time subscriptions
- You want direct DynamoDB integration without Lambda
- Offline sync is important (mobile apps)
- You prefer managed infrastructure

**Choose Apollo on Lambda when:**
- You need custom middleware or authentication logic
- You want more control over resolvers
- Your team is already familiar with Apollo
- You need to integrate with non-AWS data sources easily

## Monitoring

For AppSync, built-in CloudWatch metrics cover latency, errors, and request counts. For Apollo on Lambda, you get standard Lambda metrics plus whatever logging you add to your resolvers. For production APIs that need uptime monitoring and alerting, consider adding [external monitoring](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view) for end-to-end visibility.

## Summary

Building a serverless GraphQL API on AWS gives you the query flexibility of GraphQL with the scalability of serverless. AppSync is the quickest path if you're all-in on AWS, while Apollo on Lambda gives you more portability and control. Either way, you end up with an API that scales automatically and costs nothing when idle. For teams building data-heavy applications, serverless GraphQL is one of the best architecture choices available.
