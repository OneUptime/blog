# How to Handle API Testing with Postman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postman, API Testing, REST API, Automation, Testing, Newman, CI/CD

Description: A practical guide to API testing with Postman, covering collections, environments, automated testing, and CI/CD integration with Newman.

---

API testing validates that your backend services work correctly before frontend integration. Postman has evolved from a simple HTTP client into a complete API testing platform. This guide covers practical patterns for building comprehensive API test suites that catch bugs early and integrate into your deployment pipeline.

## Setting Up Your Testing Environment

Postman organizes tests into collections. A collection groups related requests and can include tests, variables, and documentation.

```mermaid
flowchart TD
    subgraph Collection["API Collection"]
        Folder1[Auth Endpoints]
        Folder2[User Endpoints]
        Folder3[Product Endpoints]

        Folder1 --> R1[POST /login]
        Folder1 --> R2[POST /register]
        Folder1 --> R3[POST /logout]

        Folder2 --> R4[GET /users]
        Folder2 --> R5[GET /users/:id]
        Folder2 --> R6[PUT /users/:id]
    end

    subgraph Environments
        Dev[Development]
        Staging[Staging]
        Prod[Production]
    end

    Collection --> Environments
```

### Creating Environment Variables

Set up environments for different stages:

```json
// Development Environment
{
  "name": "Development",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "testUserEmail",
      "value": "test@dev.example.com",
      "enabled": true
    }
  ]
}

// Staging Environment
{
  "name": "Staging",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://staging-api.example.com",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "testUserEmail",
      "value": "test@staging.example.com",
      "enabled": true
    }
  ]
}
```

## Writing API Tests

### Basic Response Validation

Add tests in the "Tests" tab of each request:

```javascript
// Test status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response time
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Test response headers
pm.test("Content-Type is application/json", function () {
    pm.response.to.have.header("Content-Type", "application/json; charset=utf-8");
});

// Test response body structure
pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("id");
    pm.expect(jsonData).to.have.property("email");
    pm.expect(jsonData).to.have.property("createdAt");
});
```

### JSON Schema Validation

Validate response structure with JSON Schema:

```javascript
// Define expected schema
const userSchema = {
    "type": "object",
    "required": ["id", "email", "name", "role"],
    "properties": {
        "id": { "type": "integer" },
        "email": { "type": "string", "format": "email" },
        "name": { "type": "string", "minLength": 1 },
        "role": { "type": "string", "enum": ["user", "admin", "moderator"] },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
    }
};

pm.test("Response matches user schema", function () {
    const response = pm.response.json();
    pm.expect(tv4.validate(response, userSchema)).to.be.true;
});
```

### Chaining Requests with Variables

Store values from responses to use in subsequent requests:

```javascript
// In POST /auth/login Tests tab
pm.test("Login successful", function () {
    pm.response.to.have.status(200);

    const jsonData = pm.response.json();

    // Store token for subsequent requests
    pm.environment.set("authToken", jsonData.token);
    pm.environment.set("userId", jsonData.user.id);

    console.log("Token stored:", jsonData.token.substring(0, 20) + "...");
});

// In subsequent requests, use the variable in headers
// Authorization: Bearer {{authToken}}
```

## Pre-Request Scripts

Run JavaScript before requests execute:

```javascript
// Generate timestamp
pm.environment.set("timestamp", new Date().toISOString());

// Generate random data
pm.environment.set("randomEmail", `test_${Date.now()}@example.com`);
pm.environment.set("randomName", `User_${Math.random().toString(36).substring(7)}`);

// Calculate signature for authenticated APIs
const crypto = require('crypto-js');
const secretKey = pm.environment.get("apiSecretKey");
const timestamp = Date.now().toString();
const signature = crypto.HmacSHA256(timestamp, secretKey).toString();

pm.environment.set("requestTimestamp", timestamp);
pm.environment.set("requestSignature", signature);
```

## Complete Test Flow Example

### Authentication Flow

```javascript
// 1. PRE-REQUEST SCRIPT for Login
const testEmail = pm.environment.get("testUserEmail");
const testPassword = pm.environment.get("testUserPassword");

pm.environment.set("loginPayload", JSON.stringify({
    email: testEmail,
    password: testPassword
}));

// 2. REQUEST
// POST {{baseUrl}}/auth/login
// Body: {{loginPayload}}

// 3. TESTS
pm.test("Login returns 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("token");
    pm.expect(jsonData.token).to.be.a("string");
    pm.expect(jsonData.token.length).to.be.above(10);

    // Store for next requests
    pm.environment.set("authToken", jsonData.token);
});

pm.test("Response contains user data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user).to.have.property("id");
    pm.expect(jsonData.user).to.have.property("email");
    pm.expect(jsonData.user.email).to.equal(pm.environment.get("testUserEmail"));
});
```

### CRUD Operations Test Suite

```javascript
// CREATE - POST /users
pm.test("Create user returns 201", function () {
    pm.response.to.have.status(201);

    const user = pm.response.json();
    pm.environment.set("createdUserId", user.id);

    pm.expect(user.email).to.equal(pm.environment.get("randomEmail"));
});

// READ - GET /users/{{createdUserId}}
pm.test("Get user returns correct data", function () {
    pm.response.to.have.status(200);

    const user = pm.response.json();
    pm.expect(user.id).to.equal(parseInt(pm.environment.get("createdUserId")));
});

// UPDATE - PUT /users/{{createdUserId}}
pm.test("Update user returns 200", function () {
    pm.response.to.have.status(200);

    const user = pm.response.json();
    pm.expect(user.name).to.equal("Updated Name");
});

// DELETE - DELETE /users/{{createdUserId}}
pm.test("Delete user returns 204", function () {
    pm.response.to.have.status(204);
});

// VERIFY DELETE - GET /users/{{createdUserId}}
pm.test("Deleted user returns 404", function () {
    pm.response.to.have.status(404);
});
```

## API Testing Flow

```mermaid
sequenceDiagram
    participant R as Runner
    participant P as Pre-Request
    participant A as API Server
    participant T as Tests

    R->>P: Execute Pre-Request Script
    P->>P: Set Variables
    R->>A: Send HTTP Request
    A->>R: Return Response
    R->>T: Execute Tests
    T->>T: Validate Response
    T->>R: Report Results
    R->>R: Next Request
```

## Advanced Testing Patterns

### Data-Driven Testing

Use CSV or JSON data files for parameterized tests:

```json
// test-data.json
[
    {
        "email": "valid@example.com",
        "password": "validPassword123",
        "expectedStatus": 200
    },
    {
        "email": "invalid@example.com",
        "password": "wrongPassword",
        "expectedStatus": 401
    },
    {
        "email": "",
        "password": "password123",
        "expectedStatus": 400
    }
]
```

Test script using iteration data:

```javascript
pm.test(`Login with ${pm.iterationData.get("email")} returns ${pm.iterationData.get("expectedStatus")}`, function () {
    pm.response.to.have.status(pm.iterationData.get("expectedStatus"));
});
```

### Error Response Validation

```javascript
// Test 400 Bad Request
pm.test("Invalid request returns proper error", function () {
    pm.response.to.have.status(400);

    const error = pm.response.json();
    pm.expect(error).to.have.property("error");
    pm.expect(error).to.have.property("message");
    pm.expect(error.error).to.equal("ValidationError");
});

// Test 401 Unauthorized
pm.test("Unauthorized request returns 401", function () {
    pm.response.to.have.status(401);

    const error = pm.response.json();
    pm.expect(error.message).to.include("authentication");
});

// Test 404 Not Found
pm.test("Missing resource returns 404", function () {
    pm.response.to.have.status(404);

    const error = pm.response.json();
    pm.expect(error.error).to.equal("NotFound");
});
```

### Retry Logic for Flaky Tests

```javascript
// Collection-level pre-request script
const maxRetries = 3;
const currentRetry = pm.environment.get("currentRetry") || 0;

if (pm.response && pm.response.code >= 500 && currentRetry < maxRetries) {
    pm.environment.set("currentRetry", currentRetry + 1);
    postman.setNextRequest(pm.info.requestName);
} else {
    pm.environment.set("currentRetry", 0);
}
```

## CI/CD Integration with Newman

Newman is Postman's command-line runner for automated testing.

### Installation and Basic Usage

```bash
# Install Newman
npm install -g newman

# Run a collection
newman run collection.json -e environment.json

# Run with detailed output
newman run collection.json -e environment.json --reporters cli,html

# Run with specific folder
newman run collection.json --folder "Authentication" -e environment.json
```

### GitHub Actions Integration

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  api-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          npm install -g newman newman-reporter-htmlextra

      - name: Start API server
        run: npm run start &
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

      - name: Wait for API
        run: npx wait-on http://localhost:3000/health

      - name: Run API tests
        run: |
          newman run tests/api-collection.json \
            -e tests/environments/ci.json \
            --reporters cli,htmlextra \
            --reporter-htmlextra-export reports/api-test-report.html

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-test-report
          path: reports/api-test-report.html
```

### Newman Configuration File

```json
// newman.config.json
{
  "collection": "./tests/api-collection.json",
  "environment": "./tests/environments/staging.json",
  "reporters": ["cli", "htmlextra", "json"],
  "reporter": {
    "htmlextra": {
      "export": "./reports/api-report.html",
      "title": "API Test Report"
    },
    "json": {
      "export": "./reports/api-results.json"
    }
  },
  "iterationCount": 1,
  "timeoutRequest": 30000,
  "delayRequest": 100
}
```

Run with config:

```bash
newman run --config newman.config.json
```

## Best Practices

1. **Organize collections logically**: Group by resource or feature
2. **Use environments**: Never hardcode URLs or credentials
3. **Test both success and failure**: Validate error responses too
4. **Chain requests properly**: Use variables to pass data between requests
5. **Add meaningful assertions**: Check structure, not just status codes
6. **Document your tests**: Add descriptions to requests and folders
7. **Version control collections**: Export and commit JSON files
8. **Run tests in CI/CD**: Automate with Newman

## Conclusion

Postman transforms API testing from manual checking into automated validation. Start by organizing requests into logical collections with proper environments. Write comprehensive tests that validate status codes, response structure, and business logic. Use pre-request scripts to handle authentication and dynamic data. Finally, integrate tests into your CI/CD pipeline with Newman to catch API issues before they reach production. Well-maintained API tests give confidence that your backend services work correctly across deployments.
