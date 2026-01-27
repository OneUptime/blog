# How to Document REST APIs with OpenAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenAPI, REST API, API Documentation, Swagger, API Design, Developer Experience

Description: A comprehensive guide to documenting REST APIs using OpenAPI 3.0, covering specification structure, paths, schemas, authentication, and best practices for creating developer-friendly API documentation.

---

> "Good API documentation is the difference between developers adopting your API in hours versus abandoning it in minutes. OpenAPI makes that documentation machine-readable, testable, and always in sync with your actual implementation."

## What is OpenAPI?

OpenAPI (formerly known as Swagger) is the industry-standard specification for describing RESTful APIs. It provides a language-agnostic way to define your API's structure, making it possible to generate documentation, client SDKs, and server stubs automatically.

The OpenAPI Specification (OAS) defines a standard format that both humans and machines can understand, enabling:

- Interactive API documentation
- Automated code generation
- API testing and validation
- Contract-first development

## OpenAPI 3.0 Structure

An OpenAPI document consists of several key sections that together describe your entire API. Here is the basic structure:

```yaml
# OpenAPI 3.0 specification structure
# This is the root document that defines your entire API

openapi: "3.0.3"  # OpenAPI version - use 3.0.3 for latest stable features

# Info section - provides metadata about the API
info:
  title: "My Awesome API"  # Human-readable name of the API
  description: |
    This API provides endpoints for managing users and resources.

    ## Authentication
    All endpoints require Bearer token authentication.
  version: "1.0.0"  # API version (use semantic versioning)
  contact:
    name: "API Support"
    email: "api-support@example.com"
    url: "https://example.com/support"
  license:
    name: "MIT"
    url: "https://opensource.org/licenses/MIT"

# Servers section - defines where the API is hosted
servers:
  - url: "https://api.example.com/v1"
    description: "Production server"
  - url: "https://staging-api.example.com/v1"
    description: "Staging server"
  - url: "http://localhost:3000/v1"
    description: "Local development"

# Paths section - defines all API endpoints (detailed below)
paths:
  # Endpoints are defined here

# Components section - reusable schemas, parameters, responses
components:
  schemas:
    # Data models defined here
  securitySchemes:
    # Authentication methods defined here
  parameters:
    # Reusable parameters defined here
  responses:
    # Reusable responses defined here

# Security section - global security requirements
security:
  - bearerAuth: []

# Tags section - groups endpoints for documentation organization
tags:
  - name: "Users"
    description: "User management operations"
  - name: "Resources"
    description: "Resource CRUD operations"
```

## Paths and Operations

The paths section is the heart of your OpenAPI document. Each path defines an endpoint and its supported HTTP methods (operations).

```yaml
# Paths define your API endpoints and their operations
paths:
  # Path for a collection resource
  /users:
    # GET operation - retrieve a list of users
    get:
      tags:
        - "Users"  # Groups this endpoint under Users in docs
      summary: "List all users"  # Brief description shown in endpoint list
      description: |
        Retrieves a paginated list of all users in the system.
        Results can be filtered by status and sorted by creation date.
      operationId: "listUsers"  # Unique identifier for code generation

      # Query parameters for filtering and pagination
      parameters:
        - name: "page"
          in: "query"
          description: "Page number for pagination (1-indexed)"
          required: false
          schema:
            type: "integer"
            minimum: 1
            default: 1
        - name: "limit"
          in: "query"
          description: "Number of items per page"
          required: false
          schema:
            type: "integer"
            minimum: 1
            maximum: 100
            default: 20
        - name: "status"
          in: "query"
          description: "Filter users by status"
          required: false
          schema:
            type: "string"
            enum: ["active", "inactive", "pending"]

      # Possible responses
      responses:
        "200":
          description: "Successful response with list of users"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserList"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "500":
          $ref: "#/components/responses/InternalError"

    # POST operation - create a new user
    post:
      tags:
        - "Users"
      summary: "Create a new user"
      description: "Creates a new user account with the provided information."
      operationId: "createUser"

      # Request body definition
      requestBody:
        required: true
        description: "User data for creating a new account"
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateUserRequest"
            # Example request body
            example:
              email: "john.doe@example.com"
              name: "John Doe"
              role: "user"

      responses:
        "201":
          description: "User created successfully"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "400":
          $ref: "#/components/responses/BadRequest"
        "409":
          description: "User with this email already exists"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  # Path with a path parameter
  /users/{userId}:
    # Path parameter defined at path level (shared by all operations)
    parameters:
      - name: "userId"
        in: "path"
        required: true
        description: "Unique identifier of the user"
        schema:
          type: "string"
          format: "uuid"

    # GET operation - retrieve a single user
    get:
      tags:
        - "Users"
      summary: "Get user by ID"
      description: "Retrieves detailed information about a specific user."
      operationId: "getUserById"
      responses:
        "200":
          description: "User found"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          $ref: "#/components/responses/NotFound"

    # PUT operation - update a user
    put:
      tags:
        - "Users"
      summary: "Update user"
      description: "Updates an existing user's information."
      operationId: "updateUser"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateUserRequest"
      responses:
        "200":
          description: "User updated successfully"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          $ref: "#/components/responses/NotFound"

    # DELETE operation - remove a user
    delete:
      tags:
        - "Users"
      summary: "Delete user"
      description: "Permanently removes a user from the system."
      operationId: "deleteUser"
      responses:
        "204":
          description: "User deleted successfully"
        "404":
          $ref: "#/components/responses/NotFound"
```

## Schemas and Data Models

Schemas define the structure of your request and response data. OpenAPI uses JSON Schema to describe data types.

```yaml
# Components section contains reusable schemas
components:
  schemas:
    # Basic User schema
    User:
      type: "object"
      description: "Represents a user in the system"
      required:
        - "id"
        - "email"
        - "name"
        - "createdAt"
      properties:
        id:
          type: "string"
          format: "uuid"
          description: "Unique identifier for the user"
          example: "550e8400-e29b-41d4-a716-446655440000"
        email:
          type: "string"
          format: "email"
          description: "User's email address"
          example: "john.doe@example.com"
        name:
          type: "string"
          minLength: 1
          maxLength: 100
          description: "User's full name"
          example: "John Doe"
        role:
          type: "string"
          enum: ["admin", "user", "viewer"]
          default: "user"
          description: "User's role in the system"
        status:
          type: "string"
          enum: ["active", "inactive", "pending"]
          description: "Current account status"
        avatar:
          type: "string"
          format: "uri"
          nullable: true
          description: "URL to user's avatar image"
        metadata:
          type: "object"
          additionalProperties: true
          description: "Additional user metadata as key-value pairs"
        createdAt:
          type: "string"
          format: "date-time"
          description: "Timestamp when the user was created"
        updatedAt:
          type: "string"
          format: "date-time"
          description: "Timestamp of last update"

    # Request schema for creating users
    CreateUserRequest:
      type: "object"
      required:
        - "email"
        - "name"
      properties:
        email:
          type: "string"
          format: "email"
        name:
          type: "string"
          minLength: 1
          maxLength: 100
        role:
          type: "string"
          enum: ["admin", "user", "viewer"]
          default: "user"
        password:
          type: "string"
          format: "password"
          minLength: 8
          description: "Must contain at least one uppercase, one lowercase, and one number"

    # Request schema for updating users (all fields optional)
    UpdateUserRequest:
      type: "object"
      properties:
        name:
          type: "string"
          minLength: 1
          maxLength: 100
        role:
          type: "string"
          enum: ["admin", "user", "viewer"]
        status:
          type: "string"
          enum: ["active", "inactive"]

    # Paginated list response with composition
    UserList:
      type: "object"
      required:
        - "data"
        - "pagination"
      properties:
        data:
          type: "array"
          items:
            $ref: "#/components/schemas/User"
          description: "Array of user objects"
        pagination:
          $ref: "#/components/schemas/Pagination"

    # Reusable pagination schema
    Pagination:
      type: "object"
      required:
        - "page"
        - "limit"
        - "total"
        - "totalPages"
      properties:
        page:
          type: "integer"
          description: "Current page number"
          example: 1
        limit:
          type: "integer"
          description: "Items per page"
          example: 20
        total:
          type: "integer"
          description: "Total number of items"
          example: 150
        totalPages:
          type: "integer"
          description: "Total number of pages"
          example: 8
        hasNext:
          type: "boolean"
          description: "Whether there are more pages"
        hasPrevious:
          type: "boolean"
          description: "Whether there are previous pages"

    # Standard error response schema
    Error:
      type: "object"
      required:
        - "code"
        - "message"
      properties:
        code:
          type: "string"
          description: "Error code for programmatic handling"
          example: "USER_NOT_FOUND"
        message:
          type: "string"
          description: "Human-readable error message"
          example: "The requested user was not found"
        details:
          type: "array"
          items:
            type: "object"
            properties:
              field:
                type: "string"
              message:
                type: "string"
          description: "Additional error details for validation errors"

    # Using allOf for schema inheritance
    AdminUser:
      allOf:
        - $ref: "#/components/schemas/User"
        - type: "object"
          properties:
            permissions:
              type: "array"
              items:
                type: "string"
              description: "Admin-specific permissions"
            lastLogin:
              type: "string"
              format: "date-time"
```

## Authentication and Security

OpenAPI supports multiple authentication schemes. Define them in the components section and apply them globally or per-operation.

```yaml
components:
  securitySchemes:
    # Bearer token authentication (JWT)
    bearerAuth:
      type: "http"
      scheme: "bearer"
      bearerFormat: "JWT"
      description: |
        JWT token authentication. Include the token in the Authorization header:
        `Authorization: Bearer <token>`

    # API Key authentication (in header)
    apiKeyHeader:
      type: "apiKey"
      in: "header"
      name: "X-API-Key"
      description: "API key passed in the X-API-Key header"

    # API Key authentication (in query parameter)
    apiKeyQuery:
      type: "apiKey"
      in: "query"
      name: "api_key"
      description: "API key passed as query parameter"

    # Basic authentication
    basicAuth:
      type: "http"
      scheme: "basic"
      description: "HTTP Basic authentication with username and password"

    # OAuth 2.0 with multiple flows
    oauth2:
      type: "oauth2"
      description: "OAuth 2.0 authentication"
      flows:
        # Authorization code flow (for web apps)
        authorizationCode:
          authorizationUrl: "https://auth.example.com/authorize"
          tokenUrl: "https://auth.example.com/token"
          refreshUrl: "https://auth.example.com/refresh"
          scopes:
            "read:users": "Read user information"
            "write:users": "Create and update users"
            "delete:users": "Delete users"
            "admin": "Full administrative access"

        # Client credentials flow (for server-to-server)
        clientCredentials:
          tokenUrl: "https://auth.example.com/token"
          scopes:
            "read:users": "Read user information"
            "write:users": "Create and update users"

# Apply security globally (applies to all operations)
security:
  - bearerAuth: []

# Or apply different security to specific operations
paths:
  /public/health:
    get:
      summary: "Health check endpoint"
      # Override global security - this endpoint requires no auth
      security: []
      responses:
        "200":
          description: "Service is healthy"

  /admin/users:
    get:
      summary: "List all users (admin)"
      # Require OAuth with specific scopes
      security:
        - oauth2: ["read:users", "admin"]
      responses:
        "200":
          description: "List of users"

  /users/{userId}:
    delete:
      summary: "Delete user"
      # Require either bearer token OR oauth with delete scope
      security:
        - bearerAuth: []
        - oauth2: ["delete:users"]
      responses:
        "204":
          description: "User deleted"
```

## Request and Response Examples

Providing examples helps developers understand how to use your API correctly. OpenAPI supports examples at multiple levels.

```yaml
paths:
  /orders:
    post:
      summary: "Create a new order"
      operationId: "createOrder"
      requestBody:
        required: true
        content:
          application/json:
            # Schema defines the structure
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"

            # Multiple examples for different scenarios
            examples:
              simpleOrder:
                summary: "Simple single-item order"
                description: "A basic order with one product"
                value:
                  customerId: "cust_123"
                  items:
                    - productId: "prod_456"
                      quantity: 1
                  shippingAddress:
                    street: "123 Main St"
                    city: "San Francisco"
                    state: "CA"
                    zipCode: "94102"
                    country: "US"

              bulkOrder:
                summary: "Bulk order with multiple items"
                description: "An order with multiple products and special instructions"
                value:
                  customerId: "cust_789"
                  items:
                    - productId: "prod_111"
                      quantity: 5
                    - productId: "prod_222"
                      quantity: 3
                    - productId: "prod_333"
                      quantity: 10
                  shippingAddress:
                    street: "456 Business Park"
                    city: "New York"
                    state: "NY"
                    zipCode: "10001"
                    country: "US"
                  notes: "Please deliver to loading dock B"
                  priority: "express"

      responses:
        "201":
          description: "Order created successfully"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
              examples:
                createdOrder:
                  summary: "Successfully created order"
                  value:
                    id: "order_abc123"
                    customerId: "cust_123"
                    status: "pending"
                    items:
                      - productId: "prod_456"
                        quantity: 1
                        unitPrice: 29.99
                        totalPrice: 29.99
                    subtotal: 29.99
                    tax: 2.55
                    shipping: 5.00
                    total: 37.54
                    createdAt: "2024-01-15T10:30:00Z"

        "400":
          description: "Invalid request data"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                invalidProduct:
                  summary: "Invalid product ID"
                  value:
                    code: "INVALID_PRODUCT"
                    message: "One or more products are invalid"
                    details:
                      - field: "items[0].productId"
                        message: "Product not found"

                invalidAddress:
                  summary: "Invalid shipping address"
                  value:
                    code: "INVALID_ADDRESS"
                    message: "Shipping address is incomplete"
                    details:
                      - field: "shippingAddress.zipCode"
                        message: "Invalid ZIP code format"

components:
  # Reusable examples can be defined in components
  examples:
    UserExample:
      summary: "Standard user"
      value:
        id: "550e8400-e29b-41d4-a716-446655440000"
        email: "jane.smith@example.com"
        name: "Jane Smith"
        role: "user"
        status: "active"
        createdAt: "2024-01-10T08:00:00Z"

    AdminUserExample:
      summary: "Administrator user"
      value:
        id: "660e8400-e29b-41d4-a716-446655440001"
        email: "admin@example.com"
        name: "System Admin"
        role: "admin"
        status: "active"
        permissions: ["manage_users", "view_reports", "system_config"]
        createdAt: "2023-06-01T00:00:00Z"
```

## Code Generation

One of the most powerful features of OpenAPI is the ability to generate code automatically. This ensures consistency between your specification and implementation.

```bash
# Install OpenAPI Generator CLI
npm install -g @openapitools/openapi-generator-cli

# Generate a TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./generated/typescript-client \
  --additional-properties=supportsES6=true,npmName=my-api-client

# Generate a Python client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client \
  --additional-properties=packageName=my_api_client

# Generate a Go server stub
openapi-generator-cli generate \
  -i openapi.yaml \
  -g go-server \
  -o ./generated/go-server

# Generate a Node.js Express server
openapi-generator-cli generate \
  -i openapi.yaml \
  -g nodejs-express-server \
  -o ./generated/express-server
```

Here is an example of using a generated TypeScript client:

```typescript
// Import the generated client
import { Configuration, UsersApi } from './generated/typescript-client';

// Configure the client with your API key or token
const config = new Configuration({
  basePath: 'https://api.example.com/v1',
  accessToken: 'your-jwt-token-here',
});

// Create an instance of the Users API
const usersApi = new UsersApi(config);

// List users with pagination and filtering
async function listUsers() {
  try {
    const response = await usersApi.listUsers({
      page: 1,
      limit: 20,
      status: 'active',
    });

    console.log('Users:', response.data);
    console.log('Total:', response.pagination.total);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

// Create a new user
async function createUser() {
  try {
    const newUser = await usersApi.createUser({
      createUserRequest: {
        email: 'new.user@example.com',
        name: 'New User',
        role: 'user',
      },
    });

    console.log('Created user:', newUser);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}
```

## Swagger UI Integration

Swagger UI provides interactive documentation that lets developers explore and test your API directly in the browser.

```javascript
// Express.js integration with swagger-ui-express
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();

// Load your OpenAPI specification
const swaggerDocument = YAML.load('./openapi.yaml');

// Swagger UI options for customization
const swaggerOptions = {
  // Custom site title
  customSiteTitle: 'My API Documentation',

  // Custom favicon
  customfavIcon: '/assets/favicon.ico',

  // Custom CSS for branding
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #333 }
  `,

  // Enable "Try it out" by default
  swaggerOptions: {
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
};

// Serve Swagger UI at /docs endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve the raw OpenAPI spec as JSON
app.get('/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

app.listen(3000, () => {
  console.log('API documentation available at http://localhost:3000/docs');
});
```

For a Python FastAPI application, Swagger UI is built in:

```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="My Awesome API",
    description="API for managing users and resources",
    version="1.0.0",
    docs_url="/docs",           # Swagger UI endpoint
    redoc_url="/redoc",         # ReDoc endpoint
    openapi_url="/openapi.json" # OpenAPI spec endpoint
)

# Customize the OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="My Awesome API",
        version="1.0.0",
        description="API for managing users and resources",
        routes=app.routes,
    )

    # Add custom server information
    openapi_schema["servers"] = [
        {"url": "https://api.example.com/v1", "description": "Production"},
        {"url": "https://staging-api.example.com/v1", "description": "Staging"},
    ]

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

## Best Practices Summary

Following these best practices will help you create API documentation that developers love:

**1. Use Descriptive Names and Descriptions**
- Write clear, concise summaries for each endpoint
- Provide detailed descriptions for complex operations
- Document all parameters, including edge cases

**2. Define Reusable Components**
- Create schemas for all data models in the components section
- Use `$ref` to reference common schemas and avoid duplication
- Define reusable responses for common error codes

**3. Provide Comprehensive Examples**
- Include examples for all request bodies and responses
- Cover both success cases and common error scenarios
- Use realistic data that demonstrates actual usage

**4. Document Authentication Clearly**
- Specify security requirements at both global and operation levels
- Explain how to obtain and use authentication tokens
- Document any scopes or permissions required

**5. Version Your API**
- Include the version in the info section
- Consider versioning in the URL path (e.g., /v1/users)
- Document breaking changes between versions

**6. Validate Your Specification**
- Use tools like Spectral or swagger-cli to lint your OpenAPI document
- Ensure all `$ref` references are valid
- Test that examples match their schemas

**7. Keep Documentation in Sync**
- Generate OpenAPI specs from code annotations when possible
- Use contract testing to verify implementation matches specification
- Automate documentation deployment in your CI/CD pipeline

**8. Organize with Tags**
- Group related endpoints using tags
- Provide descriptions for each tag
- Order tags logically in your documentation

## Conclusion

OpenAPI provides a powerful, standardized way to document your REST APIs. By investing time in comprehensive API documentation, you enable developers to integrate with your services quickly and confidently. The ability to generate client SDKs, interactive documentation, and server stubs from a single specification makes OpenAPI an essential tool in modern API development.

Whether you are building a new API or documenting an existing one, following the patterns and best practices outlined in this guide will help you create documentation that serves your users well.

---

Looking for a platform that embraces open standards? [OneUptime](https://oneuptime.com) provides a complete OpenAPI 3.0 specification for our entire API, enabling seamless integrations and empowering developers to build on top of our observability platform.
