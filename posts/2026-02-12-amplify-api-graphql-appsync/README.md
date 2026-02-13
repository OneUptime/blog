# How to Use Amplify API (GraphQL) with AppSync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, GraphQL, AppSync, Serverless

Description: Learn how to build a fully managed GraphQL API using AWS Amplify and AppSync, including schema design, resolvers, and real-time subscriptions.

---

If you've ever built a REST API and found yourself writing dozens of endpoints just to support different client needs, GraphQL probably caught your eye. AWS Amplify makes it surprisingly easy to spin up a GraphQL API backed by AppSync - and you don't need to manage any servers.

In this post, we'll walk through setting up Amplify's GraphQL API, defining a schema, working with resolvers, and enabling real-time subscriptions. By the end, you'll have a solid understanding of how all the pieces fit together.

## What Is AWS AppSync?

AppSync is Amazon's managed GraphQL service. It handles the heavy lifting of running a GraphQL endpoint at scale - connection management, caching, authorization, and real-time data synchronization. When you use Amplify's API category with GraphQL, AppSync is what runs under the hood.

The beauty of this combo is that Amplify abstracts away most of the AppSync configuration. You define your data model, and Amplify generates the resolvers, DynamoDB tables, and IAM roles for you.

## Getting Started

First, make sure you've got the Amplify CLI installed and an Amplify project initialized.

Here's how to add the API category to your project:

```bash
# Add a GraphQL API to your Amplify project
amplify add api

# When prompted, select these options:
# ? Select from one of the below mentioned services: GraphQL
# ? Here is the GraphQL API that we will create. Select a setting to edit or continue: Continue
# ? Choose a schema template: Single object with fields
```

This generates a schema file at `amplify/backend/api/<apiname>/schema.graphql`. That's where all the magic starts.

## Defining Your Schema

The schema is the contract between your client and your API. Amplify uses the `@model` directive to auto-generate CRUD operations and a backing DynamoDB table.

Here's a basic blog schema to illustrate:

```graphql
# Define a Post type with automatic CRUD operations
type Post @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  title: String!
  content: String!
  status: PostStatus!
  createdAt: AWSDateTime
  comments: [Comment] @hasMany
}

# Define a Comment type linked to Post
type Comment @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  postID: ID! @index(name: "byPost")
  content: String!
  post: Post @belongsTo
}

# Enum for post status
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

The `@model` directive tells Amplify to create a DynamoDB table and generate all the GraphQL resolvers for creating, reading, updating, and deleting records. The `@auth` directive controls who can access what. The `@hasMany` and `@belongsTo` directives set up the relationship between posts and comments.

After editing your schema, push it to the cloud:

```bash
# Deploy the API changes to AWS
amplify push
```

Amplify generates the DynamoDB tables, AppSync resolvers, and all the GraphQL operations you need.

## Querying Data from Your App

Once the API is deployed, you can start making queries from your frontend. Amplify generates TypeScript-friendly query and mutation files.

Here's how to fetch all posts in a React app:

```javascript
// Import the generated queries and the Amplify API client
import { API, graphqlOperation } from 'aws-amplify';
import { listPosts } from './graphql/queries';

async function fetchPosts() {
  try {
    // Execute the listPosts query
    const response = await API.graphql(graphqlOperation(listPosts));
    const posts = response.data.listPosts.items;
    console.log('Posts:', posts);
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
  }
}
```

Creating a new post is just as straightforward:

```javascript
// Import the generated mutation
import { createPost } from './graphql/mutations';

async function addPost(title, content) {
  // Build the input object matching the schema
  const input = {
    title: title,
    content: content,
    status: 'DRAFT'
  };

  try {
    const result = await API.graphql(
      graphqlOperation(createPost, { input })
    );
    console.log('Created post:', result.data.createPost);
    return result.data.createPost;
  } catch (error) {
    console.error('Error creating post:', error);
  }
}
```

## Real-Time Subscriptions

One of AppSync's killer features is real-time subscriptions over WebSockets. When data changes, connected clients get notified instantly.

Here's how to subscribe to new posts:

```javascript
// Import the subscription
import { onCreatePost } from './graphql/subscriptions';

function subscribeToNewPosts() {
  // Set up a subscription that fires when a new post is created
  const subscription = API.graphql(
    graphqlOperation(onCreatePost)
  ).subscribe({
    next: (event) => {
      const newPost = event.value.data.onCreatePost;
      console.log('New post created:', newPost.title);
    },
    error: (error) => {
      console.error('Subscription error:', error);
    }
  });

  // Return the subscription so it can be unsubscribed later
  return subscription;
}
```

In a React component, you'd typically set this up in a `useEffect` hook and clean up the subscription when the component unmounts.

## Custom Resolvers

Sometimes the auto-generated CRUD isn't enough. Maybe you need a custom query that joins data from multiple sources or calls an external API.

You can add custom resolvers by defining custom queries in your schema:

```graphql
# Custom query that returns posts by status
type Query {
  postsByStatus(status: PostStatus!): [Post]
    @function(name: "postsByStatusResolver-${env}")
}
```

Then create a Lambda function to handle the resolver logic:

```javascript
// Lambda resolver for postsByStatus
exports.handler = async (event) => {
  const { status } = event.arguments;

  // Use the DynamoDB DocumentClient to query
  const AWS = require('aws-sdk');
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: process.env.POST_TABLE,
    IndexName: 'byStatus',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
};
```

## Authorization Strategies

AppSync supports multiple auth modes, and Amplify makes it easy to configure them. The most common patterns are:

- **Cognito User Pools** - for authenticated users
- **API Key** - for public access (good for prototyping)
- **IAM** - for server-to-server communication
- **OIDC** - for third-party identity providers

You can mix auth modes on the same API. For example, you might want public read access but require authentication for writes:

```graphql
type Post @model
  @auth(rules: [
    { allow: public, operations: [read], provider: apiKey },
    { allow: owner, operations: [create, update, delete] }
  ]) {
  id: ID!
  title: String!
  content: String!
}
```

## Performance Tips

A few things to keep in mind as your API grows:

**Use indexes wisely.** The `@index` directive creates Global Secondary Indexes on DynamoDB. Every index you add increases storage and write costs. Only add indexes for access patterns you actually use.

**Enable caching.** AppSync supports server-side caching at the resolver level. For read-heavy workloads, this can drastically reduce DynamoDB reads and improve latency.

**Paginate queries.** Don't try to fetch everything at once. Use the `limit` and `nextToken` parameters that Amplify generates automatically.

```javascript
// Fetch posts with pagination
const response = await API.graphql(
  graphqlOperation(listPosts, {
    limit: 20,
    nextToken: previousNextToken  // null for first page
  })
);

const { items, nextToken } = response.data.listPosts;
```

## Monitoring Your API

Once your AppSync API is live, you'll want to monitor it. AppSync integrates with CloudWatch for metrics like latency, error rates, and request counts. For a more comprehensive monitoring setup, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to track your API health alongside your other infrastructure.

## Wrapping Up

Amplify's GraphQL API with AppSync is one of the fastest ways to get a production-grade API running on AWS. The schema-driven approach means you spend more time thinking about your data model and less time writing boilerplate. Real-time subscriptions come practically for free, and the authorization model is flexible enough for most use cases.

Start with the `@model` directive and auto-generated resolvers. As your needs grow, add custom resolvers and fine-tune your auth rules. The combination of Amplify and AppSync gives you a powerful foundation that scales without you having to think about servers.
