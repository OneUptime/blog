# How to Build a GraphQL API Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, GraphQL, AWS AppSync, API, Serverless

Description: Learn how to build a production-ready GraphQL API infrastructure using Terraform with AWS AppSync, DynamoDB resolvers, authentication, caching, and real-time subscriptions.

---

GraphQL has become the go-to choice for APIs that serve complex frontend applications. Instead of maintaining dozens of REST endpoints, you define a schema and let clients request exactly what they need. AWS AppSync makes running GraphQL in production straightforward, and Terraform lets you define the entire setup as infrastructure as code. In this post, we will build a complete GraphQL API infrastructure from the ground up.

## Why AppSync with Terraform?

Setting up AppSync through the console involves clicking through schema editors, resolver configurations, and data source connections. It works for prototyping, but production setups need version control, repeatability, and code review. Terraform gives you all of that while keeping the schema, resolvers, and infrastructure in one place.

## Architecture Overview

Our GraphQL infrastructure will include:

- AWS AppSync API with schema definition
- DynamoDB data sources with resolvers
- Lambda data sources for complex logic
- Cognito authentication
- API key access for public endpoints
- Caching for performance
- CloudWatch logging and monitoring

## Setting Up AppSync

Start with the API definition and schema.

```hcl
# AppSync GraphQL API
resource "aws_appsync_graphql_api" "main" {
  name                = "main-graphql-api"
  authentication_type = "AMAZON_COGNITO_USER_POOLS"
  schema              = file("${path.module}/schema.graphql")

  user_pool_config {
    aws_region     = var.region
    default_action = "ALLOW"
    user_pool_id   = aws_cognito_user_pool.main.id
  }

  # Additional auth for API key access (public queries)
  additional_authentication_provider {
    authentication_type = "API_KEY"
  }

  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_logs.arn
    field_log_level          = "ERROR"
    exclude_verbose_content  = false
  }

  xray_enabled = true

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# API key for public access
resource "aws_appsync_api_key" "public" {
  api_id  = aws_appsync_graphql_api.main.id
  expires = timeadd(timestamp(), "8760h")  # 1 year

  lifecycle {
    ignore_changes = [expires]
  }
}
```

The schema file defines your API contract.

```graphql
# schema.graphql
type Query {
  getUser(id: ID!): User
  listUsers(limit: Int, nextToken: String): UserConnection
  getProduct(id: ID!): Product
  listProducts(category: String, limit: Int): ProductConnection
  # Public query accessible via API key
  getPublicProduct(id: ID!): Product @aws_api_key @aws_cognito_user_pools
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): ID
  createProduct(input: CreateProductInput!): Product
  createOrder(input: CreateOrderInput!): Order
}

type Subscription {
  onCreateOrder(userId: ID): Order
    @aws_subscribe(mutations: ["createOrder"])
  onUpdateProduct(id: ID): Product
    @aws_subscribe(mutations: ["updateProduct"])
}

type User {
  id: ID!
  email: String!
  name: String!
  orders: [Order]
  createdAt: AWSDateTime!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: String!
  inventory: Int!
}

type Order {
  id: ID!
  userId: ID!
  products: [OrderItem]
  total: Float!
  status: OrderStatus!
  createdAt: AWSDateTime!
}

type OrderItem {
  productId: ID!
  quantity: Int!
  price: Float!
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

type UserConnection {
  items: [User]
  nextToken: String
}

type ProductConnection {
  items: [Product]
  nextToken: String
}

input CreateUserInput {
  email: String!
  name: String!
}

input UpdateUserInput {
  email: String
  name: String
}

input CreateProductInput {
  name: String!
  description: String
  price: Float!
  category: String!
  inventory: Int!
}

input CreateOrderInput {
  userId: ID!
  products: [OrderItemInput!]!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}
```

## DynamoDB Data Sources

Connect AppSync to DynamoDB tables for simple CRUD operations.

```hcl
# Users table
resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Products table
resource "aws_dynamodb_table" "products" {
  name         = "Products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# IAM role for AppSync to access DynamoDB
resource "aws_iam_role" "appsync_dynamodb" {
  name = "appsync-dynamodb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "appsync.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "appsync_dynamodb" {
  name = "appsync-dynamodb-policy"
  role = aws_iam_role.appsync_dynamodb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ]
      Resource = [
        aws_dynamodb_table.users.arn,
        "${aws_dynamodb_table.users.arn}/index/*",
        aws_dynamodb_table.products.arn,
        "${aws_dynamodb_table.products.arn}/index/*",
      ]
    }]
  })
}

# AppSync data source for Users table
resource "aws_appsync_datasource" "users" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "UsersTable"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_dynamodb.arn

  dynamodb_config {
    table_name = aws_dynamodb_table.users.name
    region     = var.region
  }
}

# AppSync data source for Products table
resource "aws_appsync_datasource" "products" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "ProductsTable"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_dynamodb.arn

  dynamodb_config {
    table_name = aws_dynamodb_table.products.name
    region     = var.region
  }
}
```

## Resolvers

Resolvers connect your schema fields to data sources.

```hcl
# Get User resolver
resource "aws_appsync_resolver" "get_user" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Query"
  field       = "getUser"
  data_source = aws_appsync_datasource.users.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}
EOF

  response_template = "$util.toJson($ctx.result)"
}

# List Users resolver with pagination
resource "aws_appsync_resolver" "list_users" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Query"
  field       = "listUsers"
  data_source = aws_appsync_datasource.users.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "Scan",
  "limit": $util.defaultIfNull($ctx.args.limit, 20),
  #if($ctx.args.nextToken)
    "nextToken": "$ctx.args.nextToken",
  #end
}
EOF

  response_template = <<EOF
{
  "items": $util.toJson($ctx.result.items),
  "nextToken": $util.toJson($ctx.result.nextToken)
}
EOF
}

# Create User resolver
resource "aws_appsync_resolver" "create_user" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "createUser"
  data_source = aws_appsync_datasource.users.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($util.autoId())
  },
  "attributeValues": {
    "email": $util.dynamodb.toDynamoDBJson($ctx.args.input.email),
    "name": $util.dynamodb.toDynamoDBJson($ctx.args.input.name),
    "createdAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
  }
}
EOF

  response_template = "$util.toJson($ctx.result)"
}
```

## Lambda Data Source for Complex Logic

Some operations need more than simple DynamoDB operations. Use Lambda for complex business logic.

```hcl
# Lambda function for order processing
resource "aws_lambda_function" "create_order" {
  filename         = "create_order.zip"
  function_name    = "graphql-create-order"
  role             = aws_iam_role.order_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30

  environment {
    variables = {
      ORDERS_TABLE   = aws_dynamodb_table.orders.name
      PRODUCTS_TABLE = aws_dynamodb_table.products.name
    }
  }
}

# AppSync Lambda data source
resource "aws_appsync_datasource" "order_lambda" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "OrderLambda"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_lambda.arn

  lambda_config {
    function_arn = aws_lambda_function.create_order.arn
  }
}

# Resolver using Lambda
resource "aws_appsync_resolver" "create_order" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "createOrder"
  data_source = aws_appsync_datasource.order_lambda.name

  request_template  = <<EOF
{
  "version": "2018-05-29",
  "operation": "Invoke",
  "payload": $util.toJson($ctx.args)
}
EOF

  response_template = "$util.toJson($ctx.result)"
}
```

## Caching

Enable caching to reduce DynamoDB reads and improve latency.

```hcl
# AppSync caching
resource "aws_appsync_api_cache" "main" {
  api_id               = aws_appsync_graphql_api.main.id
  api_caching_behavior = "PER_RESOLVER_CACHING"
  type                 = "SMALL"
  ttl                  = 300  # 5 minutes
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

## Monitoring

Track your GraphQL API performance and errors.

```hcl
# CloudWatch log group for AppSync
resource "aws_cloudwatch_log_group" "appsync" {
  name              = "/aws/appsync/apis/${aws_appsync_graphql_api.main.id}"
  retention_in_days = 30
}

# Alarm for GraphQL errors
resource "aws_cloudwatch_metric_alarm" "graphql_errors" {
  alarm_name          = "graphql-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/AppSync"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.api_alerts.arn]

  dimensions = {
    GraphQLAPIId = aws_appsync_graphql_api.main.id
  }
}

# Alarm for high latency
resource "aws_cloudwatch_metric_alarm" "graphql_latency" {
  alarm_name          = "graphql-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Latency"
  namespace           = "AWS/AppSync"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 1000  # 1 second
  alarm_actions       = [aws_sns_topic.api_alerts.arn]

  dimensions = {
    GraphQLAPIId = aws_appsync_graphql_api.main.id
  }
}
```

## Wrapping Up

Building a GraphQL API with Terraform and AppSync gives you a serverless, scalable API layer with minimal operational overhead. The schema is your contract, DynamoDB handles simple operations, Lambda handles the complex ones, and AppSync ties it all together with authentication, caching, and real-time subscriptions.

The key advantage of managing this in Terraform is that your entire API - schema, resolvers, data sources, and monitoring - lives in version control. Pull requests become API reviews. Deploys are repeatable. And spinning up a new environment takes minutes, not days.

For monitoring your GraphQL API performance, tracking resolver latency, and getting alerted on errors, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-graphql-api-infrastructure-with-terraform/view) for complete API observability.
