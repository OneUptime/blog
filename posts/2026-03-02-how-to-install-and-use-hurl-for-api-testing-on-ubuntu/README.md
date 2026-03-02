# How to Install and Use hurl for API Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, API Testing, hurl, HTTP, DevOps

Description: Learn how to install hurl on Ubuntu and use its plain-text format to write and run HTTP API tests with assertions, variables, and CI integration.

---

Hurl is a command-line tool that runs HTTP requests defined in plain text files. Unlike Postman or other GUI tools, hurl keeps your API tests as simple text files that sit comfortably in version control alongside your code. It handles request chaining, response assertions, variable substitution, and can produce JUnit or JSON output for CI systems. This guide covers installing hurl on Ubuntu and using it for real API testing scenarios.

## Installing hurl on Ubuntu

Hurl provides prebuilt packages for Ubuntu. The easiest installation path is through their official release packages.

```bash
# Download the latest hurl deb package (check https://github.com/Orange-OpenSource/hurl/releases for latest version)
HURL_VERSION="4.3.0"
curl -LO "https://github.com/Orange-OpenSource/hurl/releases/download/${HURL_VERSION}/hurl_${HURL_VERSION}_amd64.deb"

# Install the package
sudo dpkg -i "hurl_${HURL_VERSION}_amd64.deb"

# Verify installation
hurl --version
```

Alternatively, if you have cargo (Rust's package manager) installed:

```bash
# Install via cargo
cargo install hurl

# Or install Rust first if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
cargo install hurl
```

## Basic Hurl File Format

Hurl files use a straightforward format. Each request block starts with an HTTP method and URL, followed by optional headers, body, and assertions.

```hurl
# basic-test.hurl - Test a public API endpoint
GET https://api.example.com/health

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.version" isString
```

Run it:

```bash
# Run a hurl file
hurl basic-test.hurl

# Run with verbose output to see request/response details
hurl --verbose basic-test.hurl
```

## Writing Meaningful Tests

### Testing JSON Responses

```hurl
# api-tests.hurl - Test user API endpoints

# Create a user
POST https://api.example.com/users
Content-Type: application/json
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}

HTTP 201
[Asserts]
jsonpath "$.id" isInteger
jsonpath "$.name" == "Alice"
jsonpath "$.email" == "alice@example.com"
header "Content-Type" contains "application/json"
duration < 2000  # Response must be under 2 seconds

# Capture the created user ID for subsequent requests
[Captures]
user_id: jsonpath "$.id"


# Get the created user using the captured ID
GET https://api.example.com/users/{{user_id}}
Authorization: Bearer my-token-here

HTTP 200
[Asserts]
jsonpath "$.name" == "Alice"
jsonpath "$.active" == true


# Delete the user
DELETE https://api.example.com/users/{{user_id}}

HTTP 204
```

This demonstrates three key hurl features: posting JSON, capturing values from responses, and using those captured values in subsequent requests.

### Authentication Flows

```hurl
# auth-test.hurl - Test login and authenticated requests

# Login to get a token
POST https://api.example.com/auth/login
Content-Type: application/json
{
  "username": "testuser",
  "password": "testpassword"
}

HTTP 200
[Asserts]
jsonpath "$.token" isString
jsonpath "$.expires_in" > 0

# Capture the auth token
[Captures]
auth_token: jsonpath "$.token"


# Use the token to access a protected endpoint
GET https://api.example.com/me
Authorization: Bearer {{auth_token}}

HTTP 200
[Asserts]
jsonpath "$.username" == "testuser"
jsonpath "$.email" isString


# Test that invalid token returns 401
GET https://api.example.com/me
Authorization: Bearer invalid-token-here

HTTP 401
[Asserts]
jsonpath "$.error" == "Unauthorized"
```

## Using Variables

Variables let you parameterize hurl files for different environments without modifying the files themselves.

```hurl
# parameterized-test.hurl - Uses variables for environment-specific values
GET {{base_url}}/api/products
Authorization: Bearer {{api_token}}

HTTP 200
[Asserts]
jsonpath "$.products" isCollection
jsonpath "$.total" >= 0
```

Pass variables at runtime:

```bash
# Run with variables for staging environment
hurl parameterized-test.hurl \
  --variable base_url=https://staging.example.com \
  --variable api_token=your-staging-token

# Or use a variables file
cat > staging.env << 'EOF'
base_url=https://staging.example.com
api_token=your-staging-token
db_name=testdb
EOF

hurl parameterized-test.hurl --variables-file staging.env
```

### Loading Variables from Environment

```bash
# Export variables to environment, hurl picks them up with HURL_ prefix
export HURL_base_url="https://staging.example.com"
export HURL_api_token="your-token"

hurl parameterized-test.hurl
```

## Organizing Multiple Test Files

For larger projects, organize tests into directories and run them together:

```bash
tests/
  auth/
    login.hurl
    logout.hurl
    token-refresh.hurl
  users/
    create.hurl
    read.hurl
    update.hurl
    delete.hurl
  products/
    list.hurl
    search.hurl
```

Run all tests in a directory:

```bash
# Run all hurl files in the tests directory recursively
hurl --test tests/**/*.hurl --variables-file production.env

# Run a specific subdirectory
hurl --test tests/users/*.hurl --variables-file staging.env
```

The `--test` flag changes hurl's output to a test report format showing pass/fail per file.

## Generating Reports for CI

### JUnit XML Output

```bash
# Generate JUnit XML for Jenkins, GitLab, or similar CI systems
hurl --test \
  --variables-file staging.env \
  --report-junit /tmp/hurl-results/junit.xml \
  tests/**/*.hurl
```

### JSON Report

```bash
# JSON report with full request/response details
hurl --test \
  --variables-file staging.env \
  --report-json /tmp/hurl-results/report.json \
  tests/**/*.hurl
```

### HTML Report

```bash
# HTML report viewable in a browser
hurl --test \
  --variables-file staging.env \
  --report-html /tmp/hurl-results/ \
  tests/**/*.hurl
```

## CI/CD Integration

### GitLab CI

```yaml
# .gitlab-ci.yml
api-tests:
  image: ubuntu:22.04
  stage: test
  before_script:
    - apt-get update -qq
    - HURL_VERSION="4.3.0"
    - apt-get install -y curl
    - curl -LO "https://github.com/Orange-OpenSource/hurl/releases/download/${HURL_VERSION}/hurl_${HURL_VERSION}_amd64.deb"
    - dpkg -i "hurl_${HURL_VERSION}_amd64.deb"
  script:
    - hurl --test
        --variables-file environments/staging.env
        --variable api_token="${API_TOKEN}"
        --report-junit results/junit.xml
        tests/**/*.hurl
  artifacts:
    reports:
      junit: results/junit.xml
    expire_in: 1 week
  variables:
    HURL_base_url: "https://staging.example.com"
```

### GitHub Actions

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Install hurl
        run: |
          HURL_VERSION="4.3.0"
          curl -LO "https://github.com/Orange-OpenSource/hurl/releases/download/${HURL_VERSION}/hurl_${HURL_VERSION}_amd64.deb"
          sudo dpkg -i "hurl_${HURL_VERSION}_amd64.deb"

      - name: Run API tests
        env:
          HURL_base_url: "https://staging.example.com"
          HURL_api_token: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          hurl --test \
            --report-junit results/junit.xml \
            --report-html results/html/ \
            tests/**/*.hurl

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: hurl-test-results
          path: results/
```

## Useful Assertions Reference

Hurl supports a variety of assertion types that cover most testing needs:

```hurl
# assertions-reference.hurl - Common assertion patterns

GET https://api.example.com/data

HTTP 200
[Asserts]
# Status
status == 200

# Headers
header "Content-Type" contains "application/json"
header "Cache-Control" == "no-store"

# JSON values
jsonpath "$.count" == 42
jsonpath "$.name" == "Alice"
jsonpath "$.active" == true
jsonpath "$.score" > 9.5
jsonpath "$.tags" isCollection
jsonpath "$.tags" count == 3
jsonpath "$.description" matches "^[A-Z].*"  # Regex match

# Response timing
duration < 3000  # Must respond within 3 seconds

# Body content
body contains "success"
```

## Troubleshooting

**Certificate errors with internal services:**

```bash
# Ignore SSL certificate errors (use only for internal dev environments)
hurl --insecure api-tests.hurl
```

**Debugging unexpected failures:**

```bash
# Very verbose output showing full headers and body
hurl --very-verbose api-tests.hurl 2>&1 | tee debug.log
```

**Check hurl file syntax without running:**

```bash
# Validate hurl file syntax
hurl --dry-run api-tests.hurl
```

Hurl's plain-text format makes API tests easy to review in code reviews, diff clearly in git, and run anywhere Node.js or Docker aren't available. For teams that want API testing without heavy tooling overhead, it's a practical choice.
