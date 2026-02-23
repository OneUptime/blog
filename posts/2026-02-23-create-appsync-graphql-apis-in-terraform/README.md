# How to Create AppSync GraphQL APIs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, AppSync, GraphQL, API, Serverless, Infrastructure as Code

Description: A hands-on guide to building AWS AppSync GraphQL APIs with Terraform, covering schema definition, resolvers, data sources, authentication, and real-time subscriptions.

---

AWS AppSync is a managed GraphQL service that simplifies building APIs by handling the heavy lifting of connecting to data sources, real-time subscriptions, and offline synchronization. If you have worked with GraphQL before, you know that the schema is only half the story - you also need resolvers that map queries and mutations to your actual data. AppSync provides this resolver layer as a managed service, connecting your GraphQL schema to DynamoDB tables, Lambda functions, RDS databases, and HTTP endpoints.

Defining all of this in Terraform means your entire API - schema, resolvers, data sources, and authentication - lives in version control and deploys consistently across environments. This post walks through building a complete AppSync API in Terraform.

## The GraphQL API Resource

Start with the API itself:

```hcl
# The AppSync GraphQL API
resource "aws_appsync_graphql_api" "main" {
  name                = "my-graphql-api"
  authentication_type = "AMAZON_COGNITO_USER_POOLS"

  # Cognito authentication configuration
  user_pool_config {
    aws_region     = data.aws_region.current.name
    default_action = "ALLOW"
    user_pool_id   = aws_cognito_user_pool.main.id
  }

  # Add API key as an additional auth provider for public queries
  additional_authentication_provider {
    authentication_type = "API_KEY"
  }

  # Enable CloudWatch logging
  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_logging.arn
    field_log_level          = "ERROR"
  }

  # Enable X-Ray tracing for debugging
  xray_enabled = true

  # Define the GraphQL schema inline
  schema = file("${path.module}/schema.graphql")

  tags = {
    ManagedBy = "terraform"
  }
}

data "aws_region" "current" {}

# API key for public access (expires after 365 days)
resource "aws_appsync_api_key" "public" {
  api_id  = aws_appsync_graphql_api.main.id
  expires = timeadd(timestamp(), "8760h")  # 365 days

  lifecycle {
    ignore_changes = [expires]
  }
}
```

The `schema` parameter accepts your GraphQL schema as a string. You can inline it or load it from a file. Here is what the schema file might look like:

```graphql
# schema.graphql
type Query {
  getPost(id: ID!): Post
  listPosts(limit: Int, nextToken: String): PostConnection
  getUser(id: ID!): User
}

type Mutation {
  createPost(input: CreatePostInput!): Post
  updatePost(input: UpdatePostInput!): Post
  deletePost(id: ID!): Boolean
}

type Subscription {
  onCreatePost: Post @aws_subscribe(mutations: ["createPost"])
  onUpdatePost: Post @aws_subscribe(mutations: ["updatePost"])
}

type Post {
  id: ID!
  title: String!
  content: String!
  authorId: String!
  author: User
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post]
}

type PostConnection {
  items: [Post]
  nextToken: String
}

input CreatePostInput {
  title: String!
  content: String!
  authorId: String!
}

input UpdatePostInput {
  id: ID!
  title: String
  content: String
}
```

## DynamoDB Data Source

Most AppSync APIs use DynamoDB as the primary data source. Here is how to set up the table and connect it:

```hcl
# DynamoDB table for posts
resource "aws_dynamodb_table" "posts" {
  name         = "Posts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "authorId"
    type = "S"
  }

  # GSI for querying posts by author
  global_secondary_index {
    name            = "byAuthor"
    hash_key        = "authorId"
    projection_type = "ALL"
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# IAM role for AppSync to access DynamoDB
resource "aws_iam_role" "appsync_dynamodb" {
  name = "appsync-dynamodb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role_policy" "appsync_dynamodb" {
  name = "appsync-dynamodb-policy"
  role = aws_iam_role.appsync_dynamodb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.posts.arn,
          "${aws_dynamodb_table.posts.arn}/index/*"
        ]
      }
    ]
  })
}

# Register DynamoDB as an AppSync data source
resource "aws_appsync_datasource" "posts_table" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "PostsTable"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_dynamodb.arn

  dynamodb_config {
    table_name = aws_dynamodb_table.posts.name
    region     = data.aws_region.current.name
  }
}
```

## Resolvers

Resolvers connect your GraphQL operations to data sources. AppSync uses VTL (Velocity Template Language) or JavaScript for resolver mapping templates:

```hcl
# Resolver for getPost query
resource "aws_appsync_resolver" "get_post" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Query"
  field       = "getPost"
  data_source = aws_appsync_datasource.posts_table.name

  # Request mapping template - translates GraphQL to DynamoDB
  request_template = <<-EOT
    {
      "version": "2018-05-29",
      "operation": "GetItem",
      "key": {
        "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
      }
    }
  EOT

  # Response mapping template - returns the DynamoDB result
  response_template = <<-EOT
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    $util.toJson($ctx.result)
  EOT
}

# Resolver for listPosts query with pagination
resource "aws_appsync_resolver" "list_posts" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Query"
  field       = "listPosts"
  data_source = aws_appsync_datasource.posts_table.name

  request_template = <<-EOT
    {
      "version": "2018-05-29",
      "operation": "Scan",
      "limit": $util.defaultIfNull($ctx.args.limit, 20),
      #if($ctx.args.nextToken)
        "nextToken": "$ctx.args.nextToken",
      #end
    }
  EOT

  response_template = <<-EOT
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    {
      "items": $util.toJson($ctx.result.items),
      "nextToken": $util.toJson($ctx.result.nextToken)
    }
  EOT
}

# Resolver for createPost mutation
resource "aws_appsync_resolver" "create_post" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "createPost"
  data_source = aws_appsync_datasource.posts_table.name

  request_template = <<-EOT
    {
      "version": "2018-05-29",
      "operation": "PutItem",
      "key": {
        "id": $util.dynamodb.toDynamoDBJson($util.autoId())
      },
      "attributeValues": {
        "title": $util.dynamodb.toDynamoDBJson($ctx.args.input.title),
        "content": $util.dynamodb.toDynamoDBJson($ctx.args.input.content),
        "authorId": $util.dynamodb.toDynamoDBJson($ctx.args.input.authorId),
        "createdAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
        "updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
      }
    }
  EOT

  response_template = <<-EOT
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    $util.toJson($ctx.result)
  EOT
}

# Resolver for deletePost mutation
resource "aws_appsync_resolver" "delete_post" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "deletePost"
  data_source = aws_appsync_datasource.posts_table.name

  request_template = <<-EOT
    {
      "version": "2018-05-29",
      "operation": "DeleteItem",
      "key": {
        "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
      }
    }
  EOT

  response_template = <<-EOT
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    true
  EOT
}
```

## Lambda Data Source

For more complex business logic, use a Lambda function as a data source:

```hcl
# Lambda function for complex operations
resource "aws_lambda_function" "graphql_resolver" {
  function_name = "graphql-resolver"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_exec.arn
  filename      = "lambda/resolver.zip"

  environment {
    variables = {
      POSTS_TABLE = aws_dynamodb_table.posts.name
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# IAM role for AppSync to invoke Lambda
resource "aws_iam_role" "appsync_lambda" {
  name = "appsync-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "appsync_lambda" {
  name = "appsync-lambda-invoke"
  role = aws_iam_role.appsync_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.graphql_resolver.arn
      }
    ]
  })
}

# Register Lambda as a data source
resource "aws_appsync_datasource" "lambda" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "LambdaResolver"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_lambda.arn

  lambda_config {
    function_arn = aws_lambda_function.graphql_resolver.arn
  }
}

# Use Lambda for the updatePost resolver
resource "aws_appsync_resolver" "update_post" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "updatePost"
  data_source = aws_appsync_datasource.lambda.name

  request_template = <<-EOT
    {
      "version": "2018-05-29",
      "operation": "Invoke",
      "payload": {
        "field": "updatePost",
        "arguments": $util.toJson($ctx.args)
      }
    }
  EOT

  response_template = <<-EOT
    #if($ctx.error)
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    $util.toJson($ctx.result)
  EOT
}
```

## CloudWatch Logging

Set up the logging role for debugging:

```hcl
# IAM role for AppSync CloudWatch logging
resource "aws_iam_role" "appsync_logging" {
  name = "appsync-logging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "appsync_logging" {
  role       = aws_iam_role.appsync_logging.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"
}
```

## Outputs

```hcl
output "graphql_url" {
  value       = aws_appsync_graphql_api.main.uris["GRAPHQL"]
  description = "The GraphQL endpoint URL"
}

output "api_key" {
  value       = aws_appsync_api_key.public.key
  description = "API key for public access"
  sensitive   = true
}

output "realtime_url" {
  value       = aws_appsync_graphql_api.main.uris["REALTIME"]
  description = "The WebSocket URL for real-time subscriptions"
}
```

## Wrapping Up

AppSync in Terraform involves four key pieces: the API resource with authentication, data sources that connect to your backend services, resolvers that map GraphQL operations to data source operations, and the schema that defines your API contract.

The VTL mapping templates are the trickiest part. They are powerful but the syntax takes getting used to. For complex resolvers, consider using Lambda data sources where you can write your logic in a familiar programming language instead.

Start with DynamoDB data sources for simple CRUD operations and add Lambda data sources when you need business logic that goes beyond basic data access. Enable CloudWatch logging and X-Ray tracing from the start so you can debug resolver issues when they inevitably come up.

For related reading, check out our guides on [creating API Gateway with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-api-gateway-with-terraform/view) and [Cognito user pools with Terraform](https://oneuptime.com/blog/post/2026-02-12-cognito-terraform/view) for authentication integration.
