# Validation Summary: How to Use Dapr Secrets Management with Environment Variables

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr Secrets Management API
- Dapr local environment variable secret store (`secretstores.local.env`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes (Pod specs, Deployments, init containers, Secrets)
- HashiCorp Vault (referenced as upstream secret source)
- Node.js / ES modules
- Docker (container images)

## Sources Consulted
- Dapr local environment variable secret store docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/envvar-secret-store/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK GitHub / quickstarts: https://github.com/dapr/quickstarts/tree/master/secrets_management/javascript/sdk
- curlimages/curl Docker image: https://hub.docker.com/r/curlimages/curl
- curl/curl-container GitHub: https://github.com/curl/curl-container
- Kubernetes Pod spec documentation (envFrom, secretKeyRef, volumes)

## Issues Found

### 1. `curlimages/curl:latest` does not include `jq`
**What was wrong:** The init container section used the `curlimages/curl:latest` image and piped curl output to `jq`, but this image does not include `jq`. The command would fail at runtime with "jq: not found".
**What was changed:** Replaced the image with `alpine:latest` and added `apk add --no-cache curl jq` to the command to install both required tools.

### 2. Incorrect `envFrom.secretRef` in main container
**What was wrong:** The main container used `envFrom.secretRef` referencing a Kubernetes Secret named `app-env-file`. However, the init container wrote a `.env` file to a shared volume — it did not create a Kubernetes Secret object. `envFrom.secretRef` reads from Kubernetes Secrets, not from files on disk. These are entirely different mechanisms, and the YAML as written would fail (the Secret `app-env-file` does not exist).
**What was changed:** Replaced the `envFrom.secretRef` with a `command` that sources the `.env` file from the shared volume before executing the app (`set -a && . /shared/app.env && set +a && exec my-app`). This correctly loads the file written by the init container into the process environment.

### 3. Missing `volumes` definition in Deployment spec
**What was wrong:** The init container and main container both referenced a volume named `shared-env`, but the pod spec did not include a `volumes` section defining it. Kubernetes would reject this spec.
**What was changed:** Added a `volumes` section with an `emptyDir` volume named `shared-env`.

### 4. CommonJS `require()` mixed with top-level `await`
**What was wrong:** The dotenv bootstrap example used `const { DaprClient } = require('@dapr/dapr')` (CommonJS syntax) but then used top-level `await bootstrapEnv()`. Top-level `await` is only available in ES modules, not CommonJS. This code would throw a SyntaxError.
**What was changed:** Changed `require()` to `import { DaprClient } from '@dapr/dapr'` (ES module syntax), which is compatible with top-level `await`.

## Review Notes
- The init container example calls `http://dapr-api:3500/...`, implying Dapr is running as a separate Kubernetes service rather than as a sidecar. In standard Dapr deployments, the sidecar runs on `localhost:3500` alongside the main container, but init containers execute before sidecars start. The `dapr-api` hostname suggests an external Dapr API endpoint, which is a valid but uncommon pattern. Readers deploying with the standard sidecar model should be aware that the Dapr sidecar will not be available during init container execution.
- The Dapr component YAML, secrets API endpoints, Kubernetes secret injection pattern, and JavaScript SDK usage are all correct and current.
- The `@dapr/dapr` SDK supports both CommonJS and ESM imports. The example was changed to ESM for consistency with top-level `await`.
