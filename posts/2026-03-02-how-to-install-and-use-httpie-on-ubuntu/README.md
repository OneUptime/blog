# How to Install and Use HTTPie on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HTTPie, HTTP, API Testing, Development

Description: Learn how to install and use HTTPie on Ubuntu as a user-friendly alternative to curl for making HTTP requests, testing APIs, and working with web services from the command line.

---

HTTPie is a command-line HTTP client designed with API testing and interaction in mind. Where curl is a powerful Swiss Army knife that requires remembering many flags, HTTPie is designed to be readable: the commands read naturally, JSON is formatted and syntax-highlighted by default, and common operations like sending JSON data or authentication headers are simple one-liners. If you regularly test REST APIs or work with web services from the terminal, HTTPie is worth adding to your toolkit.

## Installing HTTPie

### From the Ubuntu Repository

```bash
sudo apt update
sudo apt install httpie

# Verify installation
http --version
```

### From pip (Latest Version)

The apt package may lag behind the latest HTTPie release. For the current version:

```bash
# Install pip if needed
sudo apt install python3-pip

# Install HTTPie
pip3 install httpie

# Or install for the current user only
pip3 install --user httpie

# Verify
http --version
```

### From the Official Installer (Recommended for Latest)

```bash
# Official installation script
curl -SsL https://packages.httpie.io/deb.gpg | sudo gpg --dearmor -o /usr/share/keyrings/httpie.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/httpie.gpg] https://packages.httpie.io/deb ./" | \
  sudo tee /etc/apt/sources.list.d/httpie.list > /dev/null

sudo apt update
sudo apt install httpie
```

## Basic Syntax

HTTPie's basic syntax is:

```text
http [FLAGS] METHOD URL [ITEM...]
```

If you omit the method, HTTPie infers it: GET for requests with no body, POST for requests with body items.

## Making GET Requests

```bash
# Simple GET request
http GET https://httpbin.org/get

# The output is automatically formatted and colorized
# Showing headers + body by default

# GET with query parameters using == syntax
http GET https://httpbin.org/get search==ubuntu page==2

# This produces: https://httpbin.org/get?search=ubuntu&page=2

# Show only the response body
http --body GET https://httpbin.org/get

# Show only the headers
http --headers GET https://httpbin.org/get

# Quiet mode - only output the response body, no formatting
http -b https://httpbin.org/get
```

## Making POST Requests with JSON

HTTPie sends JSON by default when you provide data items:

```bash
# POST with JSON body - key=value syntax
http POST https://httpbin.org/post name="John Doe" age:=30 active:=true

# The := syntax is used for JSON types (non-string values)
# = is for string values
# :=json reads the value as raw JSON
# =@ reads string value from a file
# :=@json reads JSON value from a file

# Output:
# {
#     "json": {
#         "active": true,
#         "age": 30,
#         "name": "John Doe"
#     }
# }
```

### Sending Raw JSON

```bash
# Send a JSON object directly
echo '{"name": "John", "role": "admin"}' | http POST https://httpbin.org/post

# Or from a file
http POST https://httpbin.org/post < /tmp/data.json

# Complex nested JSON
http POST https://api.example.com/users \
  name="Alice Smith" \
  email="alice@example.com" \
  roles:='["admin", "editor"]' \
  settings:='{"theme": "dark", "notifications": true}'
```

## Headers and Authentication

### Custom Headers

```bash
# Add custom headers using Header:Value syntax
http GET https://api.example.com/data \
  Authorization:"Bearer your-token-here" \
  Accept:application/json \
  X-Custom-Header:"custom value"

# Multiple headers
http POST https://api.example.com/endpoint \
  Content-Type:application/json \
  Accept:application/json \
  X-API-Version:2
```

### Built-in Authentication

```bash
# HTTP Basic Authentication
http -a username:password GET https://httpbin.org/basic-auth/user/pass

# Or
http --auth username:password GET https://api.example.com/protected

# Digest Authentication
http --auth-type=digest -a username:password GET https://api.example.com/protected

# Bearer Token (two equivalent ways)
http GET https://api.example.com/data \
  "Authorization: Bearer your-jwt-token"

# HTTPie session (stores and reuses auth and cookies)
http --session=myapi -a username:password GET https://api.example.com/data
```

## Working with APIs

### REST API Workflow

```bash
# Create a resource (POST)
http POST https://jsonplaceholder.typicode.com/posts \
  title="My New Post" \
  body="Post content here" \
  userId:=1

# Read resources (GET)
http GET https://jsonplaceholder.typicode.com/posts

# Read a specific resource
http GET https://jsonplaceholder.typicode.com/posts/1

# Update a resource (PUT)
http PUT https://jsonplaceholder.typicode.com/posts/1 \
  title="Updated Title" \
  body="Updated content" \
  userId:=1

# Partial update (PATCH)
http PATCH https://jsonplaceholder.typicode.com/posts/1 \
  title="Just Updating the Title"

# Delete a resource
http DELETE https://jsonplaceholder.typicode.com/posts/1
```

### GraphQL

```bash
http POST https://api.example.com/graphql \
  query='{ users { id name email } }'

# With variables
http POST https://api.example.com/graphql \
  query='query GetUser($id: ID!) { user(id: $id) { name email } }' \
  variables:='{"id": "123"}'
```

## Sessions

HTTPie's session feature persists cookies, authentication, and custom headers across requests:

```bash
# Create a session (stored in ~/.config/httpie/sessions/)
http --session=myapi POST https://api.example.com/login \
  username=admin password=secret

# Subsequent requests with the same session name reuse cookies/auth
http --session=myapi GET https://api.example.com/dashboard
http --session=myapi GET https://api.example.com/users
http --session=myapi POST https://api.example.com/logout

# List saved sessions
ls ~/.config/httpie/sessions/
```

## Downloading Files

```bash
# Download a file and save it
http --download GET https://example.com/file.tar.gz

# Save to a specific filename
http --download GET https://example.com/file.tar.gz -o /tmp/myfile.tar.gz

# Resume an interrupted download
http --download --continue GET https://example.com/largefile.tar.gz
```

## Working with Form Data

```bash
# Submit a form (application/x-www-form-urlencoded)
http --form POST https://httpbin.org/post \
  username=admin \
  password=secret

# Or using the explicit flag
http -f POST https://httpbin.org/post \
  field1=value1 field2=value2

# Multipart form (file upload)
http --multipart POST https://httpbin.org/post \
  name=Alice \
  file@/path/to/file.txt
```

## SSL and Certificates

```bash
# Skip SSL certificate verification (only for testing)
http --verify=no GET https://self-signed-cert.example.com

# Use a custom CA certificate
http --verify=/path/to/ca.crt GET https://internal-service.company.com

# Use client certificate (mutual TLS)
http --cert=client.crt --cert-key=client.key GET https://mtls-required.example.com
```

## Proxies

```bash
# Use an HTTP proxy
http --proxy=http:http://proxy.company.com:8080 GET https://api.example.com

# Use SOCKS5 proxy
http --proxy=https:socks5://127.0.0.1:1080 GET https://api.example.com

# Set proxy via environment variable
export http_proxy=http://proxy.company.com:8080
http GET https://api.example.com
```

## Output Control

```bash
# Show only response headers
http --print=h GET https://httpbin.org/get

# Show only request headers
http --print=H GET https://httpbin.org/get

# Show everything (request headers, request body, response headers, response body)
http --print=HhBb GET https://httpbin.org/post name=test

# Show request body only (useful for debugging what you're sending)
http --print=B POST https://httpbin.org/post name=test

# Save response to file while still seeing it
http GET https://httpbin.org/get | tee /tmp/response.json

# Offline mode (only print the request, don't send it)
http --offline POST https://api.example.com/data \
  name="Test" age:=25
```

## Practical Examples

### Test an API with Authentication and Pagination

```bash
# Set up a session with API key authentication
http --session=github \
  "Authorization: token your-github-token" \
  GET https://api.github.com/user

# List repositories (reuses the token from session)
http --session=github GET https://api.github.com/user/repos per_page==5 page==1
```

### Debugging a Failing Request

```bash
# Show full request and response including all headers
http -v POST https://api.example.com/endpoint \
  Content-Type:application/json \
  Authorization:"Bearer token" \
  name="debug test"

# The -v flag (verbose) is equivalent to --print=HhBb
```

### Testing Webhook Endpoints

```bash
# Simulate a GitHub webhook push event
http POST https://your-webhook-handler.example.com/webhook \
  X-GitHub-Event:push \
  X-Hub-Signature:"sha1=yourhmacsig" \
  Content-Type:application/json \
  < github-push-payload.json
```

## Comparing to curl

The same request in both tools:

```bash
# curl
curl -X POST https://api.example.com/data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{"name": "test", "value": 42}'

# HTTPie
http POST https://api.example.com/data \
  Authorization:"Bearer token123" \
  name=test value:=42
```

HTTPie's syntax is more concise for the common API testing patterns, while curl remains more flexible for edge cases and better supported in shell scripting contexts.

HTTPie's formatted, colorized output and intuitive syntax make it significantly faster to use interactively than curl for REST API work. For production scripts and automation, curl is still the better choice due to its ubiquity and predictable flag behavior, but for day-to-day API exploration from the command line, HTTPie is hard to beat.
