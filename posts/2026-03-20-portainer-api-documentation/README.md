# How to Access the Portainer API Documentation - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Documentation, DevOps, Automation

Description: Learn how to access and navigate the Portainer API documentation, including the built-in Swagger UI, API versioning, and how to explore available endpoints.

## Introduction

Portainer exposes a comprehensive REST API that allows you to automate virtually every operation available in the UI. Before writing API scripts, it is important to know how to find and navigate the API documentation. Portainer publishes versioned API documentation online. Current official API docs are hosted on `api-docs.portainer.io`.

## Prerequisites

- Portainer CE or BE installed and running
- Access to the Portainer web interface
- A Portainer user account and either an API access token or username/password if you want to make authenticated requests
- A web browser

## Accessing the Official API Documentation

Portainer publishes versioned API documentation online rather than exposing a built-in `/api/documentation` route:

### URL Format

```text
https://api-docs.portainer.io/?edition=ce&version=2.39.1
```

or for Business Edition:

```text
https://api-docs.portainer.io/?edition=ee&version=2.39.1
```

This opens the official versioned API reference for the selected Portainer edition and published release.

## Navigating the API Documentation

The Portainer API documentation organizes endpoints by **tags** (resource categories). Common tags include:

| Tag | Description |
|-----|-------------|
| `auth` | Authentication (login and logout) |
| `users` | User management |
| `teams` | Team management |
| `endpoints` | Environment management |
| `endpoint_groups` | Environment group management |
| `stacks` | Stack (Compose) management |
| `docker` | Docker resource operations |
| `registries` | Registry management |
| `kubernetes` | Kubernetes-specific operations |
| `helm` | Helm release operations |
| `system` | Portainer system and status operations |
| `webhooks` | Webhook management |

### Authenticating API Requests

1. Generate a user access token in Portainer under **My account**, or authenticate with `POST /api/auth` to obtain a JWT.
2. For API access tokens, send the token in the `X-API-Key` header.
3. For JWTs returned by `POST /api/auth`, send `Authorization: Bearer your-jwt-token`.
4. Use the API documentation to inspect the request and response schemas, then run the request with `curl`, HTTPie, Postman, or another API client.

## Accessing the Official Online Documentation

Portainer publishes API documentation online:

```text
https://api-docs.portainer.io/
```

Check your Portainer version first:

```bash
# Check your Portainer version

curl -s https://portainer.example.com/api/system/status | jq -r .Version
```

For current releases, select the matching edition and version from the dropdowns on `https://api-docs.portainer.io/`.

Example direct link for current CE docs:

```bash
PORTAINER_VERSION="$(curl -s https://portainer.example.com/api/system/status | jq -r .Version)"
echo "Running Portainer: ${PORTAINER_VERSION}"
echo "Current docs portal: https://api-docs.portainer.io/"
```

## Understanding API Versioning

Portainer's API does not use separate version prefixes (like `/v1/`, `/v2/`). All endpoints are under `/api/`. Breaking changes are documented in release notes.

Key API URL patterns:

```bash
# Global operations
POST   /api/auth                         # Get JWT token
GET    /api/users                         # List users (requires appropriate permissions)
GET    /api/endpoints                     # List environments

# Endpoint-scoped Docker operations
GET    /api/endpoints/{id}/docker/containers/json   # List containers
POST   /api/endpoints/{id}/docker/containers/create # Create container
GET    /api/endpoints/{id}/docker/volumes           # List volumes

# Kubernetes and Helm operations
GET    /api/kubernetes/{id}/namespaces
GET    /api/endpoints/{id}/kubernetes/helm

# Stack operations
GET    /api/stacks
POST   /api/stacks/create/standalone/string
```

## Downloading the OpenAPI Spec

Download the raw OpenAPI spec for use with code generators:

```bash
# Download the published Portainer CE OpenAPI specification
PORTAINER_VERSION="2.39.1"
curl -sSL "https://api-docs.portainer.io/versions/ce/${PORTAINER_VERSION}.yaml" -o portainer-openapi.yaml

# Review the beginning of the spec
head -20 portainer-openapi.yaml
```

## Generating Client SDKs from the API Spec

Use OpenAPI Generator to create a client library:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate a Python client
openapi-generator-cli generate \
  -i portainer-openapi.yaml \
  -g python \
  -o portainer-python-client \
  --package-name portainer_client

# Generate a JavaScript/TypeScript client
openapi-generator-cli generate \
  -i portainer-openapi.yaml \
  -g typescript-fetch \
  -o portainer-ts-client
```

## Using the API with curl Examples

```bash
# Quick reference: common API calls using a JWT from /api/auth

# 1. Authenticate
curl -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 2. List environments
curl -H "Authorization: Bearer TOKEN" \
  https://portainer.example.com/api/endpoints

# 3. List stacks
curl -H "Authorization: Bearer TOKEN" \
  https://portainer.example.com/api/stacks

# 4. List users (requires appropriate permissions)
curl -H "Authorization: Bearer TOKEN" \
  https://portainer.example.com/api/users
```

## Conclusion

The Portainer API documentation is published online through Portainer's versioned docs portal at `api-docs.portainer.io`. Use the API docs to inspect endpoints and schemas, authenticate with either an API access token or a JWT, download the published OpenAPI spec for client generation, and match the documentation to your Portainer edition and release for accuracy.
