# How to Implement API Testing with Postman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postman, API Testing, REST API, Test Automation, Newman, CI/CD

Description: A comprehensive guide to API testing with Postman, covering collections, environments, test scripts, and automation with Newman for CI/CD integration.

---

API testing is essential for ensuring your backend services work correctly. Postman has evolved from a simple API client to a complete testing platform. You can create collections of requests, write test scripts, and run them automatically in CI/CD pipelines using Newman.

## Setting Up Your First Collection

A collection is a group of related API requests. Create one for your project:

```
1. Open Postman
2. Click "Collections" in the sidebar
3. Click "+" to create a new collection
4. Name it "User API Tests"
```

Add your first request:

```
Method: GET
URL: {{baseUrl}}/api/users
```

## Configuring Environments

Environments store variables that change between development, staging, and production:

```json
{
  "id": "dev-environment",
  "name": "Development",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "apiKey",
      "value": "dev-api-key-12345",
      "enabled": true
    }
  ]
}
```

Create separate environments:

```json
{
  "id": "prod-environment",
  "name": "Production",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com",
      "enabled": true
    },
    {
      "key": "apiKey",
      "value": "{{$vault:production-api-key}}",
      "enabled": true
    }
  ]
}
```

## Writing Test Scripts

Postman uses JavaScript for test scripts. Add tests in the "Tests" tab:

```javascript
// Test status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response time
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Test response body structure
pm.test("Response has users array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('users');
    pm.expect(jsonData.users).to.be.an('array');
});

// Test specific data
pm.test("First user has required fields", function () {
    const jsonData = pm.response.json();
    const user = jsonData.users[0];

    pm.expect(user).to.have.property('id');
    pm.expect(user).to.have.property('email');
    pm.expect(user).to.have.property('name');
});

// Test header
pm.test("Content-Type is JSON", function () {
    pm.response.to.have.header("Content-Type", "application/json; charset=utf-8");
});
```

## Pre-request Scripts

Execute code before a request runs:

```javascript
// Generate timestamp
pm.environment.set("timestamp", Date.now());

// Generate random email for testing
const randomEmail = `test${Date.now()}@example.com`;
pm.environment.set("testEmail", randomEmail);

// Calculate signature for authenticated requests
const crypto = require('crypto-js');
const timestamp = Date.now().toString();
const secretKey = pm.environment.get("secretKey");
const signature = crypto.HmacSHA256(timestamp, secretKey).toString();

pm.environment.set("requestTimestamp", timestamp);
pm.environment.set("requestSignature", signature);
```

## Testing CRUD Operations

Create a complete test suite for user management:

### Create User (POST)

```javascript
// Request Body (raw JSON)
{
    "name": "{{testUserName}}",
    "email": "{{testEmail}}",
    "password": "SecurePass123!"
}

// Pre-request Script
pm.environment.set("testUserName", "Test User " + Date.now());
pm.environment.set("testEmail", `test${Date.now()}@example.com`);

// Tests
pm.test("User created successfully", function () {
    pm.response.to.have.status(201);
});

pm.test("Response contains user ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    // Save user ID for subsequent tests
    pm.environment.set("createdUserId", jsonData.id);
});

pm.test("Email matches request", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.email).to.equal(pm.environment.get("testEmail"));
});
```

### Read User (GET)

```javascript
// URL: {{baseUrl}}/api/users/{{createdUserId}}

// Tests
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Correct user returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.id).to.equal(pm.environment.get("createdUserId"));
});
```

### Update User (PUT)

```javascript
// Request Body
{
    "name": "Updated Name"
}

// Tests
pm.test("User updated successfully", function () {
    pm.response.to.have.status(200);
});

pm.test("Name was updated", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.name).to.equal("Updated Name");
});
```

### Delete User (DELETE)

```javascript
// URL: {{baseUrl}}/api/users/{{createdUserId}}

// Tests
pm.test("User deleted successfully", function () {
    pm.response.to.have.status(204);
});

// Verify deletion
pm.test("User no longer exists", function () {
    // This would be a separate request to verify
    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/api/users/" + pm.environment.get("createdUserId"),
        method: 'GET'
    }, function (err, response) {
        pm.expect(response.code).to.equal(404);
    });
});
```

## Testing Authentication Flows

Test login and token-based authentication:

```javascript
// Login Request
// POST {{baseUrl}}/api/auth/login
// Body: { "email": "user@example.com", "password": "password123" }

// Tests
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
});

pm.test("Token returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('accessToken');
    pm.expect(jsonData).to.have.property('refreshToken');

    // Save tokens for authenticated requests
    pm.environment.set("accessToken", jsonData.accessToken);
    pm.environment.set("refreshToken", jsonData.refreshToken);
});

pm.test("Token is valid JWT", function () {
    const token = pm.response.json().accessToken;
    const parts = token.split('.');
    pm.expect(parts.length).to.equal(3);
});
```

Use the token in subsequent requests:

```javascript
// In the Authorization header
Authorization: Bearer {{accessToken}}
```

## Data-Driven Testing

Use CSV or JSON files to run tests with multiple data sets:

```csv
email,password,expectedStatus
valid@example.com,ValidPass123,200
invalid@example.com,wrongpassword,401
,ValidPass123,400
valid@example.com,,400
```

Configure the collection runner to use the data file:

```javascript
// Access data variables in tests
pm.test("Response status matches expected", function () {
    pm.response.to.have.status(parseInt(pm.iterationData.get("expectedStatus")));
});
```

## Running Tests with Newman

Newman is the command-line companion for Postman:

```bash
# Install Newman globally
npm install -g newman

# Run a collection
newman run user-api-tests.postman_collection.json \
  --environment development.postman_environment.json

# Run with data file
newman run user-api-tests.postman_collection.json \
  --environment development.postman_environment.json \
  --iteration-data test-data.csv

# Generate HTML report
npm install -g newman-reporter-htmlextra

newman run user-api-tests.postman_collection.json \
  --environment development.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export ./reports/api-test-report.html
```

## CI/CD Integration

Add Newman to your GitHub Actions workflow:

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  api-tests:
    runs-on: ubuntu-latest

    services:
      api:
        image: your-api-image:latest
        ports:
          - 3000:3000

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Newman
        run: |
          npm install -g newman
          npm install -g newman-reporter-htmlextra

      - name: Wait for API
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:3000/health; do sleep 2; done'

      - name: Run API Tests
        run: |
          newman run tests/api-collection.json \
            --environment tests/ci-environment.json \
            --reporters cli,htmlextra,junit \
            --reporter-htmlextra-export reports/api-report.html \
            --reporter-junit-export reports/junit-report.xml

      - name: Upload Test Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-test-report
          path: reports/

      - name: Publish Test Results
        uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: 'reports/junit-report.xml'
```

## Contract Testing with Postman

Validate API responses against JSON Schema:

```javascript
// Define expected schema
const userSchema = {
    "type": "object",
    "required": ["id", "email", "name", "createdAt"],
    "properties": {
        "id": { "type": "string", "format": "uuid" },
        "email": { "type": "string", "format": "email" },
        "name": { "type": "string", "minLength": 1 },
        "createdAt": { "type": "string", "format": "date-time" }
    }
};

// Validate response
pm.test("Response matches schema", function () {
    const jsonData = pm.response.json();
    pm.expect(tv4.validate(jsonData, userSchema)).to.be.true;
});
```

## Best Practices

1. Organize requests in folders by feature or resource
2. Use environment variables for configuration
3. Chain requests using saved variables
4. Write independent tests that clean up after themselves
5. Include negative test cases
6. Document your API with examples in Postman
7. Version your collections with Git
8. Run tests in CI/CD on every commit

---

Postman transforms API testing from a manual process into an automated workflow. Start by documenting your API with requests and gradually add test scripts. Once your collection is solid, integrate it into CI/CD with Newman to catch regressions before they reach production.
