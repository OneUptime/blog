# How to Use Amplify API (REST) with API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, API Gateway, Lambda, REST

Description: A practical guide to building REST APIs with AWS Amplify and API Gateway, including CRUD operations, Lambda handlers, authentication, custom middleware, and error handling patterns.

---

Amplify's REST API module gives you a quick way to create API Gateway endpoints backed by Lambda functions. You define your routes, Amplify provisions the API Gateway, Lambda functions, and IAM roles, and you get a client-side SDK to call your APIs with automatic authentication.

It's a solid choice when you want a traditional REST API without the overhead of setting up API Gateway, Lambda, and their permissions manually.

## Adding a REST API

Start by adding an API to your Amplify project.

Configure the REST API:

```bash
amplify add api

# ? Select from one of the below mentioned services: REST
# ? Provide a friendly name for your resource: itemsapi
# ? Provide a path (e.g., /items): /items
# ? Choose a Lambda source: Create a new Lambda function
# ? Provide an AWS Lambda function name: itemsHandler
# ? Choose the runtime: NodeJS
# ? Choose the function template: CRUD function for DynamoDB
# ? Do you want to configure advanced settings? Yes
# ? Do you want to access other resources in this project from your Lambda function? Yes
# ? Select the categories you want this function to have access to: storage

# Add more paths
# ? Do you want to add another path? Yes
# ? Provide a path: /items/{id}
# ? Choose a Lambda source: Use a Lambda function already added
# ? Choose the Lambda function to invoke: itemsHandler

# ? Restrict API access? Yes
# ? Who should have access? Authenticated users only
# ? What kind of access do you want for Authenticated users? read, create, update, delete

amplify push
```

## Lambda Function Handler

Amplify generates a Lambda function template. Let's build a proper CRUD handler.

Here's a complete REST handler for an items API:

```javascript
// amplify/backend/function/itemsHandler/src/index.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.STORAGE_ITEMS_NAME || 'Items';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, body, requestContext } = event;

    // Get the authenticated user's ID from the Cognito authorizer
    const userId = requestContext?.authorizer?.claims?.sub || 'anonymous';

    try {
        let response;

        switch (httpMethod) {
            case 'GET':
                if (pathParameters?.id) {
                    response = await getItem(pathParameters.id, userId);
                } else {
                    response = await listItems(userId, event.queryStringParameters);
                }
                break;

            case 'POST':
                response = await createItem(JSON.parse(body), userId);
                break;

            case 'PUT':
                if (!pathParameters?.id) {
                    return errorResponse(400, 'Item ID is required');
                }
                response = await updateItem(pathParameters.id, JSON.parse(body), userId);
                break;

            case 'DELETE':
                if (!pathParameters?.id) {
                    return errorResponse(400, 'Item ID is required');
                }
                response = await deleteItem(pathParameters.id, userId);
                break;

            default:
                return errorResponse(405, `Method ${httpMethod} not allowed`);
        }

        return response;
    } catch (error) {
        console.error('Handler error:', error);
        return errorResponse(500, 'Internal server error');
    }
};

async function createItem(data, userId) {
    const item = {
        id: randomUUID(),
        userId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
    }));

    return successResponse(201, item);
}

async function getItem(id, userId) {
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
    }));

    if (!result.Item) {
        return errorResponse(404, 'Item not found');
    }

    // Ensure user can only access their own items
    if (result.Item.userId !== userId) {
        return errorResponse(403, 'Access denied');
    }

    return successResponse(200, result.Item);
}

async function listItems(userId, queryParams) {
    const limit = parseInt(queryParams?.limit || '20', 10);

    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
        Limit: limit,
        ScanIndexForward: false, // Newest first
    }));

    return successResponse(200, {
        items: result.Items,
        count: result.Count,
        lastKey: result.LastEvaluatedKey,
    });
}

async function updateItem(id, data, userId) {
    // First check ownership
    const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
    }));

    if (!existing.Item) {
        return errorResponse(404, 'Item not found');
    }
    if (existing.Item.userId !== userId) {
        return errorResponse(403, 'Access denied');
    }

    const updated = {
        ...existing.Item,
        ...data,
        id, // Don't allow changing the ID
        userId, // Don't allow changing the owner
        updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: updated,
    }));

    return successResponse(200, updated);
}

async function deleteItem(id, userId) {
    const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
    }));

    if (!existing.Item) {
        return errorResponse(404, 'Item not found');
    }
    if (existing.Item.userId !== userId) {
        return errorResponse(403, 'Access denied');
    }

    await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
    }));

    return successResponse(200, { deleted: true, id });
}

function successResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify(body),
    };
}

function errorResponse(statusCode, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ error: message }),
    };
}
```

## Calling the API from Your App

Amplify's REST API client automatically attaches the Cognito token to requests.

Here's how to use the API client:

```javascript
import { get, post, put, del } from 'aws-amplify/api';

const API_NAME = 'itemsapi'; // The name you gave when running amplify add api

// List items
async function fetchItems() {
    try {
        const response = await get({
            apiName: API_NAME,
            path: '/items',
            options: {
                queryParams: {
                    limit: '10',
                },
            },
        }).response;

        const data = await response.body.json();
        return data.items;
    } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
    }
}

// Get a single item
async function fetchItem(id) {
    const response = await get({
        apiName: API_NAME,
        path: `/items/${id}`,
    }).response;

    return response.body.json();
}

// Create an item
async function createItem(item) {
    const response = await post({
        apiName: API_NAME,
        path: '/items',
        options: {
            body: {
                name: item.name,
                description: item.description,
                status: 'active',
            },
        },
    }).response;

    return response.body.json();
}

// Update an item
async function updateItem(id, updates) {
    const response = await put({
        apiName: API_NAME,
        path: `/items/${id}`,
        options: {
            body: updates,
        },
    }).response;

    return response.body.json();
}

// Delete an item
async function deleteItem(id) {
    const response = await del({
        apiName: API_NAME,
        path: `/items/${id}`,
    }).response;

    return response.body.json();
}
```

## React Component Example

Here's a React component that uses the API:

```jsx
import { useState, useEffect } from 'react';
import { get, post, del } from 'aws-amplify/api';

const API_NAME = 'itemsapi';

function ItemManager() {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadItems();
    }, []);

    async function loadItems() {
        setLoading(true);
        setError(null);
        try {
            const response = await get({
                apiName: API_NAME,
                path: '/items',
            }).response;
            const data = await response.body.json();
            setItems(data.items || []);
        } catch (err) {
            setError('Failed to load items');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (!newItemName.trim()) return;

        try {
            const response = await post({
                apiName: API_NAME,
                path: '/items',
                options: {
                    body: { name: newItemName },
                },
            }).response;
            const item = await response.body.json();
            setItems([item, ...items]);
            setNewItemName('');
        } catch (err) {
            setError('Failed to create item');
        }
    }

    async function handleDelete(id) {
        try {
            await del({
                apiName: API_NAME,
                path: `/items/${id}`,
            }).response;
            setItems(items.filter(item => item.id !== id));
        } catch (err) {
            setError('Failed to delete item');
        }
    }

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2>Items</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleCreate}>
                <input
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="New item name"
                />
                <button type="submit">Add Item</button>
            </form>

            <ul>
                {items.map(item => (
                    <li key={item.id}>
                        {item.name}
                        <button onClick={() => handleDelete(item.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

## Adding Multiple Paths

You can add more paths to your API for different resources:

```bash
amplify update api

# ? Select from one of the below mentioned services: REST
# ? What would you like to do? Add another path
# ? Provide a path: /users/profile
# ? Choose a Lambda source: Create a new Lambda function
```

## Error Handling Middleware Pattern

For cleaner Lambda code, use a middleware pattern:

```javascript
// middleware.js - reusable handler wrapper
function withMiddleware(handler) {
    return async (event) => {
        // Parse body
        if (event.body && typeof event.body === 'string') {
            try {
                event.parsedBody = JSON.parse(event.body);
            } catch {
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ error: 'Invalid JSON body' }),
                };
            }
        }

        // Extract user info
        event.userId = event.requestContext?.authorizer?.claims?.sub;

        try {
            const result = await handler(event);
            return {
                ...result,
                headers: { ...corsHeaders(), ...result.headers },
            };
        } catch (error) {
            console.error('Unhandled error:', error);
            return {
                statusCode: error.statusCode || 500,
                headers: corsHeaders(),
                body: JSON.stringify({
                    error: error.message || 'Internal server error',
                }),
            };
        }
    };
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
    };
}

// Usage
exports.handler = withMiddleware(async (event) => {
    const { httpMethod, pathParameters, parsedBody, userId } = event;

    if (httpMethod === 'POST') {
        const item = await createItem(parsedBody, userId);
        return { statusCode: 201, body: JSON.stringify(item) };
    }

    // ... other methods
});
```

For securing these APIs with Cognito tokens, see [integrating Cognito with API Gateway for authorization](https://oneuptime.com/blog/post/cognito-api-gateway-authorization/view). And for the broader Amplify ecosystem, check out [getting started with AWS Amplify](https://oneuptime.com/blog/post/aws-amplify-getting-started/view).

## Wrapping Up

Amplify's REST API module takes the plumbing out of building API Gateway + Lambda backends. You define routes, write handler logic, and the infrastructure is managed for you. The client-side SDK handles authentication automatically, so your frontend code stays clean. For simple CRUD APIs, it's hard to beat the speed of development. When you need more control - custom authorizers, VPC connections, or complex API Gateway configurations - you can always eject to CDK or Terraform while keeping the Amplify client libraries for your frontend.
