# How to Access the Portainer API Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Swagger, REST API, Automation

Description: Learn how to find and navigate the Portainer API documentation to start automating your container management workflows.

## Where to Find the Portainer API Docs

Portainer publishes versioned API documentation. There are two ways to access it:

### 1. Official Documentation Landing Page

Navigate to `https://docs.portainer.io/api/docs` in your browser. This page links to the current API reference for both Portainer Community Edition (CE) and Business Edition (BE).

### 2. Versioned Online API Reference

The version-specific Portainer API reference is available at:
```text
https://api-docs.portainer.io/?edition=<ce-or-ee>&version=<your-portainer-version>
```

## Exploring the API Docs

The API reference groups endpoints by tag. Common groups include:

- **Auth** - JWT authentication
- **Users** - User management
- **Teams** - Team management
- **Endpoints** - Environment management
- **Stacks** - Stack deployment
- **Registries** - Registry management
- **Settings** - Global settings
- **Templates** - Application and custom templates

## Authenticating Against the API

To call authenticated endpoints, first get a JWT token:

```bash
# Get a JWT token from the API

curl -X POST "https://<your-portainer-host>/api/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "yourpassword"
  }'
# Response: {"jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

Then include the token in your requests as:

```text
Authorization: Bearer <your-jwt-token>
```

You can now make authenticated API calls against the Portainer API.

## API Base URL

All API endpoints are under:
```text
https://<your-portainer-host>/api/
```

## Key API Endpoints Quick Reference

```text
GET    /api/endpoints          - List all environments
GET    /api/endpoints/{id}     - Get environment details
GET    /api/stacks             - List stacks visible to the current user
POST   /api/stacks?type={1|2}&method={string|file|repository}&endpointId={endpointId} - Deploy a new stack
PUT    /api/stacks/{id}        - Update a stack
DELETE /api/stacks/{id}        - Delete a stack
GET    /api/users              - List users
POST   /api/users              - Create a user
GET    /api/registries         - List registries
```

## Downloading the OpenAPI Spec

```bash
# Download the OpenAPI spec that matches your Portainer edition and version
# Set EDITION="ee" for Portainer Business Edition
EDITION="ce"
PORTAINER_VERSION=$(curl -s "https://<your-portainer-host>/api/system/status" | jq -r '.Version')

SPEC_PATH=$(curl -s "https://api-docs.portainer.io/${EDITION}-versions.json" | jq -r --arg v "$PORTAINER_VERSION" '.[] | select(.id == $v) | .file')

curl -o portainer-openapi.yaml \
  "https://api-docs.portainer.io/${SPEC_PATH}"

# Use with OpenAPI generators
openapi-generator-cli generate \
  -i portainer-openapi.yaml \
  -g python \
  -o ./portainer-client
```

## Version-Specific Documentation

Portainer API versioning follows the Portainer release version. Ensure you're reading docs for your installed version:

```bash
# Check Portainer version
curl "https://<your-portainer-host>/api/system/status" | jq -r '.Version'
```

## Conclusion

The Portainer API documentation is your primary reference for automation. Start with `https://docs.portainer.io/api/docs` or the versioned reference at `api-docs.portainer.io`, then use the JWT authentication flow to test your scripts against the `/api/` endpoints.
