# How to Set Up Insomnia REST Client on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Insomnia, REST Client, API Testing, Development

Description: Learn how to install and use Insomnia REST client on Ubuntu to test and debug REST APIs, GraphQL endpoints, and WebSocket connections with a graphical interface.

---

Insomnia is an open-source desktop application for testing APIs. It supports REST, GraphQL, gRPC, and WebSockets, and provides a graphical interface for organizing requests into collections, managing environments with variables, and viewing formatted responses. For developers who prefer a GUI to command-line tools like curl or HTTPie, Insomnia is one of the most capable free options available.

## Installing Insomnia on Ubuntu

### Method 1: Download the .deb Package (Recommended)

```bash
# Download the latest .deb package from the Insomnia releases page
# Check https://github.com/Kong/insomnia/releases for the current version
INSOMNIA_VERSION="9.3.2"

wget https://github.com/Kong/insomnia/releases/download/core@${INSOMNIA_VERSION}/Insomnia.Core-${INSOMNIA_VERSION}.deb \
  -O /tmp/insomnia.deb

# Install the package
sudo dpkg -i /tmp/insomnia.deb

# Fix any dependency issues
sudo apt install -f

# Launch Insomnia
insomnia
```

### Method 2: Snap Package

```bash
# Install via Snap
sudo snap install insomnia

# Launch
insomnia
```

### Method 3: AppImage

The AppImage format runs without installation:

```bash
# Download the AppImage
wget https://github.com/Kong/insomnia/releases/download/core@9.3.2/Insomnia.Core-9.3.2.AppImage \
  -O ~/Applications/Insomnia.AppImage

chmod +x ~/Applications/Insomnia.AppImage

# Run
~/Applications/Insomnia.AppImage
```

## First Launch and Basic Setup

When Insomnia starts, you can either create an account (for cloud sync and sharing) or use it locally without an account. For local-only use, choose "Continue without an account."

The main interface has:
- **Left sidebar** - Collections, environments, and plugins
- **Request builder** - URL, method, headers, body configuration
- **Response viewer** - Formatted response output

## Creating Your First Collection

Collections organize related API requests:

1. Click "+" in the sidebar
2. Select "New Collection"
3. Give it a name (e.g., "My API Testing")

Inside a collection, you can create folders and individual requests to organize your workspace.

## Making Basic Requests

### GET Request

1. Click "+" next to your collection name
2. Select "HTTP Request"
3. Enter the URL: `https://jsonplaceholder.typicode.com/posts`
4. Keep the method as GET
5. Click "Send"

The response panel shows:
- Status code and time
- Response headers
- Formatted JSON body with syntax highlighting

### POST Request with JSON Body

1. Create a new request and set method to POST
2. URL: `https://jsonplaceholder.typicode.com/posts`
3. Click the "Body" tab
4. Select "JSON" from the dropdown
5. Enter the body:

```json
{
  "title": "My New Post",
  "body": "Post content",
  "userId": 1
}
```

6. Click Send

Insomnia automatically adds the `Content-Type: application/json` header when you select JSON body type.

## Environment Variables

Environments are one of Insomnia's most useful features. They let you switch between development, staging, and production configurations with one click.

### Creating Environments

1. Click the gear icon or Environment dropdown at the top
2. Click "Manage Environments"
3. Click "+" to create a new environment

```json
{
  "base_url": "https://dev-api.example.com",
  "api_key": "dev-key-12345",
  "timeout": 30000
}
```

Create a second environment for production:

```json
{
  "base_url": "https://api.example.com",
  "api_key": "prod-key-99999",
  "timeout": 15000
}
```

### Using Environment Variables in Requests

In any request field, use `{{ variable_name }}` to reference environment variables:

- URL: `{{ base_url }}/users`
- Header value: `{{ api_key }}`
- Body: `"timeout": {{ timeout }}`

Switch between environments from the dropdown, and all requests instantly update to use the new values.

## Authentication

Insomnia supports common authentication methods via the "Auth" tab:

### Bearer Token

1. Click the "Auth" tab in the request builder
2. Select "Bearer Token"
3. Enter your token

```text
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Insomnia adds the `Authorization: Bearer <token>` header automatically.

### Basic Authentication

1. Auth tab > "Basic Auth"
2. Enter username and password

### API Key

1. Auth tab > "API Key"
2. Set the key name (e.g., `X-API-Key`) and value
3. Choose whether to add as header or query parameter

### OAuth 2.0

Insomnia handles the OAuth 2.0 flow for you:

1. Auth tab > "OAuth 2.0"
2. Select the grant type (Authorization Code, Client Credentials, etc.)
3. Fill in the token URL, client ID, client secret
4. Click "Fetch Tokens"

## Working with GraphQL

Insomnia has native GraphQL support:

1. Create a new request, set method to POST
2. Set URL to your GraphQL endpoint
3. Click Body tab
4. Select "GraphQL Query"

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
      createdAt
    }
  }
}
```

In the "Query Variables" section:

```json
{
  "id": "123"
}
```

Insomnia fetches and displays the GraphQL schema automatically, enabling autocomplete in the query editor.

## WebSocket Testing

1. Create a new request, set method to "WebSocket"
2. URL: `ws://your-websocket-server.example.com/ws`
3. Click "Connect"

Once connected, you can:
- Send messages in the message input
- View incoming messages in the timeline
- Disconnect when done

## Request Chaining

Insomnia can extract values from one response and use them in subsequent requests using template tags.

First, make a login request that returns a token:

```text
POST {{ base_url }}/auth/login
Body: { "username": "admin", "password": "secret" }
```

In a subsequent request, reference the response:

```text
Authorization: Bearer {% response 'body', 'req_login', '$.token' %}
```

This runs the login request first and extracts `.token` from the JSON response using JSONPath.

## Importing API Specifications

Insomnia can import API definitions and generate request collections automatically:

1. File > Import > From File/URL
2. Supported formats:
   - OpenAPI (Swagger) 2.0 and 3.0
   - Postman Collection v2
   - HAR (HTTP Archive)
   - curl commands

Import an OpenAPI spec:

```bash
# Example: import the Swagger Petstore API
# In Insomnia: File > Import > From URL
# URL: https://petstore3.swagger.io/api/v3/openapi.json
```

This creates a complete collection with all the API's endpoints pre-configured.

## Using Plugins

Insomnia supports plugins that add functionality:

1. Settings (gear icon) > Plugins
2. Browse available plugins or enter a plugin name to install

Useful plugins:
- `insomnia-plugin-kong-declarative-config` - Kong API Gateway configuration
- `insomnia-plugin-aws-iam-auth` - AWS Signature authentication
- `insomnia-plugin-timestamp` - Insert current timestamp into requests
- `insomnia-plugin-base64` - Encode/decode base64 in request fields

```bash
# Install a plugin from npm (alternative method)
# Plugins directory on Linux
ls ~/.config/Insomnia/plugins/
```

## Exporting and Sharing

### Export a Collection

Right-click a collection > "Export" to save as JSON. This can be committed to version control alongside your application code.

### Export as curl

For any request, right-click > "Copy as Curl" to get the equivalent curl command:

```bash
# Generated output example
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

This is useful when you need to share a request with someone who prefers command-line tools or when scripting.

## Testing and Response Validation

Insomnia supports basic response testing in the "Tests" tab:

```javascript
// Test that the response status is 200
const response = await insomnia.send();
expect(response.status).to.equal(200);

// Test that the response body has expected fields
const body = JSON.parse(response.body);
expect(body).to.have.property('id');
expect(body.name).to.equal('Alice');
```

## Keyboard Shortcuts

Common shortcuts to speed up your workflow:

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Send request |
| `Ctrl+K` | Quick search |
| `Ctrl+E` | Switch environment |
| `Ctrl+D` | Duplicate request |
| `Ctrl+/` | Toggle sidebar |
| `Ctrl+Shift+E` | Manage environments |

## Troubleshooting

### SSL Certificate Errors

For internal APIs with self-signed certificates:

1. Settings > Request/Response
2. Toggle off "Validate certificates"

Or add a custom CA certificate:

1. Settings > Request/Response > Client Certificates
2. Add your CA certificate

### Proxy Configuration

If you're behind a corporate proxy:

1. Settings > Network
2. Enable HTTP Proxy
3. Enter proxy URL: `http://proxy.company.com:8080`

Insomnia's strength is in its organization features - environments, collections, and folders - combined with support for multiple API protocols in one tool. For teams that need to share API documentation and test collections, it's one of the more practical options available on Ubuntu.
