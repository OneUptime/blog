# How to Build GraphQL APIs with Hasura

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Hasura, API Development, PostgreSQL, Backend, DevOps

Description: A practical guide to building production-ready GraphQL APIs with Hasura - from database setup and auto-generated CRUD to custom business logic, permissions, and real-time subscriptions.

---

Building APIs by hand gets old fast. You write the same CRUD endpoints, handle the same authorization checks, and spend hours on boilerplate that adds zero business value. Hasura flips this around - point it at a database, and you get a full GraphQL API instantly.

## What Is Hasura?

Hasura is an open-source GraphQL engine that connects to your databases and services to give you a unified GraphQL API. Instead of writing resolvers manually, Hasura introspects your database schema and generates queries, mutations, and subscriptions automatically.

```mermaid
flowchart LR
    Client[Client App] --> Hasura[Hasura GraphQL Engine]
    Hasura --> DB[(PostgreSQL)]
    Hasura --> Actions[Custom Actions]
    Hasura --> Events[Event Triggers]
    Hasura --> Remote[Remote Schemas]

    Actions --> Service1[Microservice A]
    Events --> Service2[Microservice B]
    Remote --> Service3[Existing GraphQL API]
```

Why teams pick Hasura:
- **Instant APIs** - No resolver code for standard CRUD
- **Real-time** - Subscriptions work out of the box
- **Authorization built in** - Row-level security via declarative rules
- **Extensible** - Add custom logic through actions and remote schemas

## Setting Up Hasura

### Option 1: Docker Compose (Local Development)

Create a `docker-compose.yml` file with Hasura and PostgreSQL configured together.

```yaml
version: '3.6'
services:
  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_PASSWORD: postgrespassword
    volumes:
      - db_data:/var/lib/postgresql/data

  hasura:
    image: hasura/graphql-engine:v2.36.0
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    restart: always
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/postgres
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: myadminsecret

volumes:
  db_data:
```

Start Hasura with a single command.

```bash
docker-compose up -d
```

Open `http://localhost:8080/console` and enter your admin secret.

### Option 2: Hasura Cloud

For production workloads, Hasura Cloud handles scaling, caching, and monitoring. Sign up at cloud.hasura.io, create a project, and connect your database.

### Option 3: Kubernetes

Deploy using the official Helm chart for Kubernetes environments.

```bash
helm repo add hasura https://hasura.github.io/helm-charts
helm repo update

helm install hasura hasura/graphql-engine \
  --namespace hasura \
  --create-namespace \
  --set postgres.enabled=true \
  --set adminSecret=myadminsecret
```

## Connecting Your Database

Hasura supports PostgreSQL, SQL Server, MySQL, and BigQuery. Here is how to connect a PostgreSQL database through the console.

```mermaid
sequenceDiagram
    participant Console as Hasura Console
    participant Engine as GraphQL Engine
    participant DB as PostgreSQL

    Console->>Engine: Add database connection
    Engine->>DB: Connect and introspect
    DB-->>Engine: Schema metadata
    Engine->>Engine: Generate GraphQL types
    Engine-->>Console: Database tracked
```

Navigate to Data > Manage > Connect Database and enter your connection string.

```
postgresql://user:password@hostname:5432/database_name
```

For production, use environment variables instead of hardcoding credentials.

```yaml
# In docker-compose or Kubernetes
environment:
  PG_DATABASE_URL: ${DATABASE_URL}
```

Then reference it in Hasura.

```
{{PG_DATABASE_URL}}
```

## Auto-Generated CRUD Operations

Once you track a table, Hasura generates queries, mutations, and subscriptions automatically.

### Creating a Table

Use the console SQL tab or run migrations. Here is a simple users table.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  author_id INTEGER REFERENCES users(id),
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Click "Track" on both tables in the console.

### Query Data

Hasura generates flexible queries with filtering, sorting, and pagination.

```graphql
# Fetch users with filters
query GetUsers {
  users(
    where: { role: { _eq: "admin" } }
    order_by: { created_at: desc }
    limit: 10
  ) {
    id
    email
    name
    created_at
  }
}
```

### Insert Data

Mutations for insert, update, and delete are ready immediately.

```graphql
# Insert a new user
mutation CreateUser {
  insert_users_one(
    object: {
      email: "dev@example.com"
      name: "Dev User"
      role: "developer"
    }
  ) {
    id
    email
  }
}
```

### Update and Delete

Bulk operations work with where clauses.

```graphql
# Update users matching a condition
mutation UpdateUsers {
  update_users(
    where: { role: { _eq: "guest" } }
    _set: { role: "user" }
  ) {
    affected_rows
  }
}

# Delete a specific user
mutation DeleteUser {
  delete_users_by_pk(id: 5) {
    id
    email
  }
}
```

### Real-Time Subscriptions

Subscribe to changes without any extra configuration.

```graphql
# Watch for new posts in real-time
subscription WatchPosts {
  posts(
    where: { published: { _eq: true } }
    order_by: { created_at: desc }
    limit: 5
  ) {
    id
    title
    author {
      name
    }
    created_at
  }
}
```

## Setting Up Relationships

Hasura tracks foreign keys automatically, but you can also define relationships manually for more control.

### Object Relationships (Many-to-One)

A post belongs to one author.

```mermaid
erDiagram
    USERS ||--o{ POSTS : "has many"
    USERS {
        int id PK
        string email
        string name
        string role
    }
    POSTS {
        int id PK
        string title
        text content
        int author_id FK
        boolean published
    }
```

In the console, go to Data > posts > Relationships and add an object relationship named `author` pointing to `users.id` via `author_id`.

### Array Relationships (One-to-Many)

A user has many posts.

Add an array relationship named `posts` on the users table pointing to `posts.author_id`.

### Querying Relationships

Now you can nest queries across tables.

```graphql
# Get users with their posts
query UsersWithPosts {
  users {
    id
    name
    posts(where: { published: { _eq: true } }) {
      id
      title
      created_at
    }
  }
}

# Get posts with author details
query PostsWithAuthor {
  posts {
    id
    title
    author {
      id
      name
      email
    }
  }
}
```

## Role-Based Permissions

Hasura handles authorization through declarative permission rules. No middleware code needed.

### How Permissions Work

```mermaid
flowchart TD
    Request[GraphQL Request] --> Headers{Check x-hasura-role}
    Headers --> |admin| AdminRules[Full access]
    Headers --> |user| UserRules[Apply user permissions]
    Headers --> |anonymous| AnonRules[Public access only]

    UserRules --> RowLevel[Row-level checks]
    UserRules --> ColumnLevel[Column-level access]

    RowLevel --> Execute[Execute query]
    ColumnLevel --> Execute
```

### Setting Up Roles

Define permissions per table, per role. Here is a setup for the `user` role on the posts table.

**Select (Read) Permission:**

Allow users to see their own posts and all published posts.

```json
{
  "_or": [
    { "author_id": { "_eq": "X-Hasura-User-Id" } },
    { "published": { "_eq": true } }
  ]
}
```

**Insert Permission:**

Users can only create posts for themselves.

```json
{
  "author_id": { "_eq": "X-Hasura-User-Id" }
}
```

Column presets ensure author_id is set automatically.

```json
{
  "author_id": "X-Hasura-User-Id"
}
```

**Update Permission:**

Users can only edit their own posts.

```json
{
  "author_id": { "_eq": "X-Hasura-User-Id" }
}
```

### Sending Role Headers

Your application must send session variables with each request.

```javascript
// Example using fetch
const response = await fetch('https://your-hasura-endpoint/v1/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': 'your-admin-secret',
    // Or use JWT with claims
    'x-hasura-role': 'user',
    'x-hasura-user-id': '123'
  },
  body: JSON.stringify({
    query: `query { posts { id title } }`
  })
});
```

### JWT Authentication

For production, configure JWT mode so Hasura validates tokens directly.

```yaml
environment:
  HASURA_GRAPHQL_JWT_SECRET: '{"type":"RS256","jwk_url":"https://your-auth-provider/.well-known/jwks.json"}'
```

Your JWT should include Hasura claims.

```json
{
  "sub": "user-123",
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": ["user", "admin"],
    "x-hasura-default-role": "user",
    "x-hasura-user-id": "123"
  }
}
```

## Actions for Custom Business Logic

Not everything fits into CRUD. Actions let you extend Hasura with custom resolvers backed by your own services.

### Creating an Action

Define the GraphQL interface in Hasura, then point it at your webhook.

```graphql
# Action definition
type Mutation {
  signup(email: String!, password: String!, name: String!): SignupOutput
}

type SignupOutput {
  id: Int!
  email: String!
  token: String!
}
```

Set the handler URL to your service endpoint.

```
https://your-api.com/actions/signup
```

### Implementing the Handler

Your handler receives a JSON payload and returns the expected shape.

```javascript
// Node.js Express handler
app.post('/actions/signup', async (req, res) => {
  const { input, session_variables } = req.body;
  const { email, password, name } = input;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const user = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email',
      [email, hashedPassword, name]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user'],
          'x-hasura-default-role': 'user',
          'x-hasura-user-id': user.rows[0].id.toString()
        }
      },
      process.env.JWT_SECRET
    );

    res.json({
      id: user.rows[0].id,
      email: user.rows[0].email,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
```

### Action Permissions

Restrict who can call your action.

```yaml
# Allow anonymous users to sign up
- role: anonymous
  permission: {}

# Restrict admin actions
- role: admin
  permission: {}
```

## Event Triggers for Background Processing

Event triggers fire webhooks when data changes. Use them for sending emails, syncing systems, or processing data asynchronously.

### Event Trigger Flow

```mermaid
sequenceDiagram
    participant Client
    participant Hasura
    participant DB as PostgreSQL
    participant Handler as Webhook Handler
    participant Email as Email Service

    Client->>Hasura: mutation { insert_users_one }
    Hasura->>DB: INSERT INTO users
    DB-->>Hasura: Success
    Hasura-->>Client: User created

    Note over Hasura,Handler: Async trigger fires
    Hasura->>Handler: POST /events/user-created
    Handler->>Email: Send welcome email
    Email-->>Handler: Sent
    Handler-->>Hasura: 200 OK
```

### Creating an Event Trigger

In the console, go to Events > Create and configure the trigger.

- **Name:** `user_created`
- **Table:** `users`
- **Operations:** Insert
- **Webhook URL:** `https://your-api.com/events/user-created`

### Handling Events

Process events asynchronously in your service.

```javascript
// Event trigger handler
app.post('/events/user-created', async (req, res) => {
  const { event } = req.body;
  const { new: newUser } = event.data;

  try {
    // Send welcome email
    await sendEmail({
      to: newUser.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: newUser.name }
    });

    // Log for observability
    console.log(`Welcome email sent to ${newUser.email}`);

    res.status(200).json({ success: true });
  } catch (error) {
    // Hasura will retry on non-200 responses
    console.error('Failed to process event:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Retry Configuration

Events retry automatically on failure. Configure retry behavior per trigger.

```json
{
  "num_retries": 5,
  "retry_interval_seconds": 10,
  "timeout_seconds": 60
}
```

## Remote Schemas for Federation

Connect existing GraphQL services to create a unified API.

### Adding a Remote Schema

If you have an existing GraphQL API for payments or search, stitch it into Hasura.

```
https://payments.your-api.com/graphql
```

Add custom headers if your service requires authentication.

```json
{
  "Authorization": "Bearer {{PAYMENTS_SERVICE_TOKEN}}"
}
```

### Remote Schema Architecture

```mermaid
flowchart TB
    Client[Client Application] --> Hasura[Hasura GraphQL Engine]

    subgraph Hasura Engine
        Hasura --> Local[Local Database]
        Hasura --> Remote1[Remote Schema: Payments]
        Hasura --> Remote2[Remote Schema: Search]
    end

    Remote1 --> PaymentService[Payment Service]
    Remote2 --> SearchService[Search Service]
```

### Querying Across Schemas

Now clients query both Hasura tables and your remote service in one request.

```graphql
query OrderWithPayment {
  # From local database
  orders(where: { user_id: { _eq: 123 } }) {
    id
    total
    created_at
  }
  # From remote schema
  payment_methods(user_id: 123) {
    id
    type
    last_four
  }
}
```

### Remote Relationships

Link remote schema types to your database tables.

```graphql
# On the orders table, add a remote relationship
# pointing to payment_details(order_id) in the remote schema

query OrderWithPaymentDetails {
  orders {
    id
    total
    payment_details {  # Resolved from remote schema
      transaction_id
      status
      paid_at
    }
  }
}
```

## Migrations and CI/CD

Manage schema changes with Hasura CLI for reproducible deployments.

### Install CLI

```bash
# macOS
brew install hasura-cli

# Linux
curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
```

### Initialize Project

Create a Hasura project linked to your instance.

```bash
hasura init my-project --endpoint http://localhost:8080 --admin-secret myadminsecret
cd my-project
```

### Apply Migrations

Export your current schema, then apply changes through migrations.

```bash
# Create a new migration
hasura migrate create add_comments_table \
  --up-sql "CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INT REFERENCES posts(id), body TEXT);" \
  --down-sql "DROP TABLE comments;"

# Apply migrations
hasura migrate apply

# Export metadata (permissions, relationships, etc.)
hasura metadata export

# Apply metadata
hasura metadata apply
```

### CI/CD Pipeline

Automate deployments in your pipeline.

```yaml
# .github/workflows/deploy-hasura.yml
name: Deploy Hasura

on:
  push:
    branches: [main]
    paths:
      - 'hasura/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Hasura CLI
        run: curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash

      - name: Apply Migrations
        run: hasura migrate apply --endpoint ${{ secrets.HASURA_ENDPOINT }} --admin-secret ${{ secrets.HASURA_ADMIN_SECRET }}
        working-directory: ./hasura

      - name: Apply Metadata
        run: hasura metadata apply --endpoint ${{ secrets.HASURA_ENDPOINT }} --admin-secret ${{ secrets.HASURA_ADMIN_SECRET }}
        working-directory: ./hasura
```

## Performance Tips

### Use Query Allow Lists

In production, restrict which queries can run to prevent expensive operations.

```bash
# Export current allow list
hasura metadata export

# Add allowed queries to metadata/allow_list.yaml
```

### Enable Caching

Hasura Cloud and Enterprise support response caching.

```graphql
query GetPosts @cached(ttl: 60) {
  posts(where: { published: { _eq: true } }) {
    id
    title
  }
}
```

### Optimize Database

Add indexes for common query patterns.

```sql
-- Index for filtering by author
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- Index for published posts ordered by date
CREATE INDEX idx_posts_published_created ON posts(published, created_at DESC)
  WHERE published = true;
```

---

Hasura takes the grunt work out of API development. You get instant CRUD, real-time subscriptions, and fine-grained permissions without writing boilerplate. When you need custom logic, actions and event triggers integrate cleanly with your existing services. Remote schemas let you federate multiple GraphQL APIs into one endpoint. Start with the basics, add complexity only where your business logic demands it, and let Hasura handle the rest.
