# How to Build Serverless API with Azure Functions and Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Functions, API Management, Serverless, REST API, Cloud, API Design

Description: Build a complete serverless REST API using Azure Functions for business logic and Azure API Management for routing, security, and documentation.

---

Building a REST API with Azure Functions gives you serverless scalability, but functions alone are not enough for a production-quality API. You need rate limiting, consistent error handling, authentication, versioning, and documentation. Azure API Management (APIM) provides all of this as a layer on top of your functions. Together, they form a complete serverless API platform where you pay only for what you use.

In this post, I will walk through building a complete serverless REST API from scratch, including the function implementations, the APIM configuration, and the patterns that make it production-ready.

## Designing the API

Let us build a task management API with these endpoints:

- `GET /tasks` - List all tasks
- `POST /tasks` - Create a task
- `GET /tasks/{id}` - Get a specific task
- `PUT /tasks/{id}` - Update a task
- `DELETE /tasks/{id}` - Delete a task

Each endpoint will be an Azure Function, and APIM will route requests to the appropriate function.

## Creating the Azure Functions

Start by setting up the Function App.

```bash
# Create a Function App
az functionapp create \
  --name tasks-api-functions \
  --resource-group rg-api \
  --storage-account tasksstorage \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4
```

### The Task Functions

Here are the function implementations. I am using Azure Cosmos DB as the data store, but you could use any database.

```javascript
// get-tasks.js - List all tasks
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database('tasks-db').container('tasks');

module.exports = async function (context, req) {
  try {
    // Support pagination through query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Query tasks with pagination
    const { resources: tasks } = await container.items
      .query({
        query: 'SELECT * FROM c ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      })
      .fetchAll();

    // Get total count for pagination metadata
    const { resources: countResult } = await container.items
      .query('SELECT VALUE COUNT(1) FROM c')
      .fetchAll();

    const total = countResult[0];

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        tasks: tasks,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (err) {
    context.log.error('Error listing tasks:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to retrieve tasks' }
    };
  }
};
```

```javascript
// create-task.js - Create a new task
const { v4: uuidv4 } = require('uuid');
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database('tasks-db').container('tasks');

module.exports = async function (context, req) {
  // Validate the request body
  const { title, description, priority, assignee } = req.body || {};

  if (!title || title.trim().length === 0) {
    context.res = {
      status: 400,
      body: { error: 'Title is required' }
    };
    return;
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (priority && !validPriorities.includes(priority)) {
    context.res = {
      status: 400,
      body: { error: `Priority must be one of: ${validPriorities.join(', ')}` }
    };
    return;
  }

  try {
    const task = {
      id: uuidv4(),
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      assignee: assignee || null,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { resource: created } = await container.items.create(task);

    context.res = {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Location': `/tasks/${created.id}`
      },
      body: created
    };
  } catch (err) {
    context.log.error('Error creating task:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to create task' }
    };
  }
};
```

```javascript
// get-task.js - Get a specific task by ID
module.exports = async function (context, req) {
  const taskId = context.bindingData.id;

  try {
    const { resource: task } = await container.item(taskId, taskId).read();

    if (!task) {
      context.res = {
        status: 404,
        body: { error: 'Task not found' }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: task
    };
  } catch (err) {
    if (err.code === 404) {
      context.res = {
        status: 404,
        body: { error: 'Task not found' }
      };
    } else {
      context.log.error('Error reading task:', err);
      context.res = {
        status: 500,
        body: { error: 'Failed to retrieve task' }
      };
    }
  }
};
```

```javascript
// update-task.js - Update an existing task
module.exports = async function (context, req) {
  const taskId = context.bindingData.id;
  const updates = req.body || {};

  try {
    // Read the existing task
    const { resource: existing } = await container.item(taskId, taskId).read();

    if (!existing) {
      context.res = { status: 404, body: { error: 'Task not found' } };
      return;
    }

    // Apply the updates
    const updatedTask = {
      ...existing,
      ...(updates.title && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.priority && { priority: updates.priority }),
      ...(updates.assignee !== undefined && { assignee: updates.assignee }),
      ...(updates.status && { status: updates.status }),
      updatedAt: new Date().toISOString()
    };

    const { resource: saved } = await container.item(taskId, taskId).replace(updatedTask);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: saved
    };
  } catch (err) {
    context.log.error('Error updating task:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to update task' }
    };
  }
};
```

```javascript
// delete-task.js - Delete a task
module.exports = async function (context, req) {
  const taskId = context.bindingData.id;

  try {
    await container.item(taskId, taskId).delete();

    context.res = {
      status: 204 // No content
    };
  } catch (err) {
    if (err.code === 404) {
      context.res = { status: 404, body: { error: 'Task not found' } };
    } else {
      context.log.error('Error deleting task:', err);
      context.res = { status: 500, body: { error: 'Failed to delete task' } };
    }
  }
};
```

## Configuring API Management

Now set up APIM to expose these functions as a unified API.

### Define the API

```bash
# Create the APIM instance (Consumption tier)
az apim create \
  --name tasks-api-gateway \
  --resource-group rg-api \
  --location eastus \
  --publisher-name "Task API" \
  --publisher-email "api@example.com" \
  --sku-name Consumption

# Create the API definition
az apim api create \
  --resource-group rg-api \
  --service-name tasks-api-gateway \
  --api-id "tasks-api-v1" \
  --display-name "Tasks API" \
  --path "v1" \
  --protocols https \
  --service-url "https://tasks-api-functions.azurewebsites.net/api"
```

### Set Up Global Policies

Apply policies that affect all operations in the API.

```xml
<!-- Global API policy -->
<policies>
    <inbound>
        <base />
        <!-- CORS for browser clients -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://myapp.com</origin>
            </allowed-origins>
            <allowed-methods preflight-result-max-age="300">
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
            </allowed-methods>
            <allowed-headers>
                <header>Content-Type</header>
                <header>Authorization</header>
            </allowed-headers>
        </cors>
        <!-- Rate limiting per subscription key -->
        <rate-limit calls="1000" renewal-period="3600" />
        <!-- JWT validation -->
        <validate-jwt header-name="Authorization" require-scheme="Bearer"
                      failed-validation-httpcode="401"
                      failed-validation-error-message="Invalid or missing token">
            <openid-config url="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration" />
            <audiences>
                <audience>api://tasks-api</audience>
            </audiences>
        </validate-jwt>
        <!-- Add function key for backend auth -->
        <set-header name="x-functions-key" exists-action="override">
            <value>{{functions-host-key}}</value>
        </set-header>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
        <!-- Standardize error responses -->
        <choose>
            <when condition="@(context.Response.StatusCode >= 500)">
                <set-body>@{
                    return new JObject(
                        new JProperty("error", "Internal server error"),
                        new JProperty("requestId", context.RequestId)
                    ).ToString();
                }</set-body>
            </when>
        </choose>
        <!-- Remove internal headers -->
        <set-header name="X-Powered-By" exists-action="delete" />
    </outbound>
    <on-error>
        <base />
        <set-body>@{
            return new JObject(
                new JProperty("error", context.LastError.Message),
                new JProperty("requestId", context.RequestId)
            ).ToString();
        }</set-body>
    </on-error>
</policies>
```

## OpenAPI Specification

Generate an OpenAPI spec for documentation and client generation.

```yaml
# openapi.yaml - OpenAPI spec for the Tasks API
openapi: 3.0.1
info:
  title: Tasks API
  version: '1.0'
  description: A serverless task management API
paths:
  /tasks:
    get:
      summary: List all tasks
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: List of tasks with pagination
    post:
      summary: Create a new task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTask'
      responses:
        '201':
          description: Task created
  /tasks/{id}:
    get:
      summary: Get a task by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Task details
        '404':
          description: Task not found
```

Import this spec into APIM for automatic documentation on the developer portal.

## Testing the Complete API

```bash
# Create a task
curl -X POST "https://tasks-api-gateway.azure-api.net/v1/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Ocp-Apim-Subscription-Key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write blog post","priority":"high"}'

# List tasks
curl "https://tasks-api-gateway.azure-api.net/v1/tasks?page=1&limit=10" \
  -H "Authorization: Bearer <token>" \
  -H "Ocp-Apim-Subscription-Key: <key>"

# Get a specific task
curl "https://tasks-api-gateway.azure-api.net/v1/tasks/task-id-here" \
  -H "Authorization: Bearer <token>" \
  -H "Ocp-Apim-Subscription-Key: <key>"
```

## Wrapping Up

Building a serverless API with Azure Functions and API Management gives you a production-quality API without managing any servers. Functions handle the business logic and scale automatically. APIM handles the cross-cutting concerns: authentication, rate limiting, CORS, versioning, and documentation. The Consumption tiers of both services mean you pay per request, making this architecture cost-effective for APIs of any size. Start with the function implementations, layer APIM on top for operational features, and you have a complete API platform that scales from zero to millions of requests.
