# Portainer Stack API Returns 404 After an Upgrade: Migrating to the New Create Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker Compose, Docker Swarm, Kubernetes, Migration, Troubleshooting

Description: Migrate Portainer automation from the removed POST /stacks route to the orchestrator- and source-specific stack creation endpoints without guesswork.

---

An automation that used to create a stack with a request like this can begin returning `404 Not Found` after Portainer is upgraded:

```text
POST /api/stacks?type=2&method=string&endpointId=3
```

The likely cause is not the stack name, authentication token, or Compose YAML. Portainer deprecated the generic `POST /stacks` operation and removed it after introducing explicit creation routes. `GET /api/stacks` still lists stacks, so a successful list request does not prove that the old create operation still exists.

The fix is to choose a route that encodes both the target orchestrator and the source of the definition.

## What Changed

The old create operation selected behavior with query parameters such as `type` and `method`. The replacement puts those choices in the path:

| Target | Definition source | New path after `/api` |
| --- | --- | --- |
| Docker Standalone | JSON string | `/stacks/create/standalone/string` |
| Docker Standalone | Uploaded file | `/stacks/create/standalone/file` |
| Docker Standalone | Git repository | `/stacks/create/standalone/repository` |
| Docker Swarm | JSON string | `/stacks/create/swarm/string` |
| Docker Swarm | Uploaded file | `/stacks/create/swarm/file` |
| Docker Swarm | Git repository | `/stacks/create/swarm/repository` |
| Kubernetes | Manifest in JSON string | `/stacks/create/kubernetes/string` |
| Kubernetes | Manifest URL | `/stacks/create/kubernetes/url` |
| Kubernetes | Git repository | `/stacks/create/kubernetes/repository` |

All of these routes require the destination Portainer environment as the `endpointId` query parameter. In Portainer terminology, older API fields and documentation may call this an endpoint; the UI generally calls it an environment.

Portainer's deprecation table records that `POST /stacks` was deprecated in 2.20 and removed in 2.27. Do not solve the resulting 404 by pinning old server software indefinitely. Change the client to the supported route and the current schema for your installed edition.

## Before Migrating, Record the Effective Old Request

Capture these inputs without logging secrets:

- full URL, including reverse-proxy subpath and `/api`;
- HTTP method;
- target environment ID and its orchestrator type;
- source type: inline text, multipart file, Git repository, or manifest URL;
- `Content-Type`;
- JSON or form field names; and
- response status, headers, and body.

That prevents several changes from being mixed into one test. First replace the route while preserving the deployment intent, then refactor credential handling or payload generation separately.

## Docker Standalone: Create from Inline Compose Content

For a JSON request, place the complete Compose document in `StackFileContent`. Let `jq` perform JSON escaping instead of replacing newlines manually:

```bash
set -euo pipefail

PORTAINER_URL='https://portainer.example.com'
ENDPOINT_ID='3'
STACK_NAME='example-api'
: "${PORTAINER_API_KEY:?Set PORTAINER_API_KEY}"

jq -n \
  --arg name "$STACK_NAME" \
  --rawfile compose compose.yaml \
  '{
    Name: $name,
    StackFileContent: $compose,
    Env: [],
    FromAppTemplate: false
  }' |
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  --header 'Content-Type: application/json' \
  --data-binary @- \
  "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID"
```

A minimal `compose.yaml` for testing is:

```yaml
services:
  web:
    image: nginx:alpine
    restart: unless-stopped
```

Do not carry the old `type=2&method=string` parameters onto the new endpoint. The path already expresses those choices.

## Docker Standalone: Upload a Compose File

The file endpoint consumes `multipart/form-data`, not JSON:

```bash
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  --form "Name=$STACK_NAME" \
  --form 'Env=[]' \
  --form 'file=@compose.yaml;type=application/x-yaml' \
  "$PORTAINER_URL/api/stacks/create/standalone/file?endpointId=$ENDPOINT_ID"
```

Let `curl --form` set the multipart boundary. Setting a bare `Content-Type: multipart/form-data` header yourself omits that generated boundary and can make an otherwise correct request impossible to parse.

The file and string routes are different APIs. A JSON object containing a local path does not upload that file, and multipart fields sent to the string route do not become `StackFileContent`.

## Docker Swarm: Include the Swarm ID

A Swarm deployment targets a Portainer environment and identifies the Swarm. Obtain the ID from the Docker API through that environment:

```bash
SWARM_ID="$({
  curl --fail-with-body --silent --show-error \
    --header "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/swarm"
} | jq -r '.ID')"

test -n "$SWARM_ID" && test "$SWARM_ID" != 'null'
```

Then use the Swarm string endpoint and its payload:

```bash
jq -n \
  --arg name "$STACK_NAME" \
  --arg swarmID "$SWARM_ID" \
  --rawfile compose compose.yaml \
  '{
    Name: $name,
    SwarmID: $swarmID,
    StackFileContent: $compose,
    Env: [],
    FromAppTemplate: false
  }' |
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  --header 'Content-Type: application/json' \
  --data-binary @- \
  "$PORTAINER_URL/api/stacks/create/swarm/string?endpointId=$ENDPOINT_ID"
```

Do not send a Compose deployment to the Swarm route merely because the environment contains more than one Docker host. The Portainer environment's orchestrator type must match the route.

## Kubernetes: Use the Kubernetes Payload Names

The Kubernetes string endpoint accepts Kubernetes manifests. Its payload is not the same as the Docker string payload:

```bash
KUBE_ENDPOINT_ID='8'
STACK_NAME='example-web'
NAMESPACE='apps'

jq -n \
  --arg name "$STACK_NAME" \
  --arg namespace "$NAMESPACE" \
  --rawfile manifest app.yaml \
  '{
    StackName: $name,
    Namespace: $namespace,
    StackFileContent: $manifest,
    ComposeFormat: false,
    FromAppTemplate: false
  }' |
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  --header 'Content-Type: application/json' \
  --data-binary @- \
  "$PORTAINER_URL/api/stacks/create/kubernetes/string?endpointId=$KUBE_ENDPOINT_ID"
```

For example, `app.yaml` can contain multiple YAML documents:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example-web
  template:
    metadata:
      labels:
        app: example-web
    spec:
      containers:
        - name: web
          image: nginx:alpine
          ports:
            - name: http
              containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: example-web
spec:
  selector:
    app: example-web
  ports:
    - name: http
      port: 80
      targetPort: http
```

The namespace must exist and the Portainer user must have access to deploy there. An authorization failure after route migration is a separate issue from the old route's 404.

## Repository Endpoints Need Their Own Current Schema

For Git-backed stacks, select the `repository` route for the target orchestrator. Repository payloads include source location or a reference to stored source credentials, the file path within the repository, its Git reference, deployment environment variables, and optional update settings.

Those fields have evolved independently from the route migration. In particular, do not copy a password-bearing example from an old blog and assume it matches the current API. Open Portainer's API reference for the exact server edition and release, find the operation for the chosen `.../repository` path, and generate the payload from that schema. Prefer stored Git credentials or source references where the current API provides them.

## Why a 404 Can Still Happen on the New Route

If the supported path still returns 404, inspect the response before changing the JSON.

### The `/api` Prefix Is Missing

Portainer's documented routes are shown as `/stacks/...` in the API schema, but clients call them under the server API prefix:

```text
https://portainer.example.com/api/stacks/create/standalone/string
```

Without `/api`, the request is usually handled as a UI route.

### A Reverse-Proxy Subpath Is Missing or Duplicated

If Portainer is published at `https://example.com/portainer`, the public request may need:

```text
https://example.com/portainer/api/stacks/create/standalone/string
```

The reverse proxy must strip the public subpath consistently with Portainer's `--base-url` configuration. Test the exact URL that the browser uses rather than bypassing the proxy and comparing unlike paths.

### The Client Is Not Sending POST

`GET /api/stacks` is valid for listing. The create routes are `POST` operations. A redirect can also change request behavior in some clients, so use the final HTTPS URL and inspect redirects instead of relying on an HTTP-to-HTTPS hop.

### The Server Is Older Than the Client Assumes

The generic route was replaced before it was removed. During a mixed-version rollout, a request may reach a different Portainer server than expected. Check the running server release and its own API schema; do not infer the API version from the UI assets in a cache.

### The 404 Comes from the Proxy

Capture headers and the response body:

```bash
curl --silent --show-error \
  --dump-header response.headers \
  --output response.body \
  --write-out 'status=%{http_code} type=%{content_type}\n' \
  --request POST \
  --header "X-API-Key: $PORTAINER_API_KEY" \
  --header 'Content-Type: application/json' \
  --data-binary @payload.json \
  "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID"
```

An HTML error branded by Nginx, an identity-aware proxy, or a load balancer means the request may never have reached Portainer. A Portainer JSON error means the route was more likely handled by the application.

## Treat the Migration as an API Contract Change

A robust client should model the choices explicitly:

```text
orchestrator = standalone | swarm | kubernetes
source       = string | file | repository | url (Kubernetes only)
```

Map only supported pairs to routes, generate the correct content type and payload for each route, and reject unknown combinations before making the HTTP request. Add an integration test against the Portainer release you plan to deploy, including:

1. authenticate with a least-privilege test user;
2. create a uniquely named disposable stack;
3. inspect the returned stack and deployed resources;
4. delete the disposable stack; and
5. fail the upgrade gate on unexpected status codes or schemas.

This catches removed operations before production automation discovers them during a real deployment.

## Official Documentation

- [Portainer: Deprecated and removed features](https://docs.portainer.io/advanced/deprecated)
- [Portainer: Current API documentation](https://docs.portainer.io/api/docs)
- [Portainer: Accessing the API](https://docs.portainer.io/api/access)
- [Portainer: API usage examples](https://docs.portainer.io/api/examples)
- [Portainer: Release notes and REST API changes](https://docs.portainer.io/release-notes)
- [Portainer Community Edition: Generated API specification](https://github.com/portainer/portainer/blob/develop/api/docs/swagger.yaml)
