# Validation Summary: How to Test Dapr Node.js Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (`@dapr/dapr` Node.js SDK)
- Jest (unit testing framework)
- Supertest (HTTP handler testing)
- Testcontainers (integration testing with Docker containers)
- Express.js (HTTP framework)
- Node.js

## Sources Consulted
- Dapr JS SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK source (DaprClient constructor): https://github.com/dapr/js-sdk/blob/main/src/implementation/Client/DaprClient.ts
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr self-hosted Docker docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Docker Hub daprio/daprd tags: https://hub.docker.com/r/daprio/daprd/tags
- Jest Mock Functions documentation: https://jestjs.io/docs/mock-functions
- Testcontainers Node wait strategies: https://node.testcontainers.org/features/wait-strategies/

## Issues Found

### 1. Supertest mock pattern replaced the entire app module (breaking error)
**What was wrong:** The Supertest example used `jest.mock("./app", () => ({ app: require("express")(), ... }))` which replaces the entire `./app` module — including the Express app — with a brand new `express()` instance that has no routes registered. Any request to `POST /orders` would return 404 instead of 201, making the test always fail.

**What was changed:** Replaced the mock target from `./app` to `@dapr/dapr`, mocking the `DaprClient` constructor instead. This allows the real app module (with its routes) to load normally while the Dapr client it instantiates uses mock methods. The `app` and `daprClient` are then imported from the real `./app` module after the mock is set up.

**Why:** Mocking the SDK rather than the app module preserves the Express routes while still isolating the Dapr dependency. This is the standard pattern for testing Express apps that depend on external clients.

### 2. Incorrect npm install dependencies
**What was wrong:** The install command listed `@jest/globals` and `jest-mock` as dependencies, but neither is needed for the CommonJS examples shown. Meanwhile, `supertest` (used in the Supertest section) and `testcontainers` (used in the integration test section) were missing.

**What was changed:** Updated the install command from `npm install --save-dev jest @jest/globals jest-mock` to `npm install --save-dev jest supertest testcontainers`.

**Why:** The examples use `require("supertest")` and `require("testcontainers")`, so these must be installed. `jest-mock` is bundled with Jest and `@jest/globals` is for ESM usage patterns not demonstrated in the post.

## Review Notes
- The DaprClient constructor signature, state operations (`save`, `get`, `delete`), and pubsub `publish` method all match the current `@dapr/dapr` SDK API.
- The Testcontainers `Wait.forHttp("/v1.0/healthz", 3500)` usage is correct. Dapr's health endpoint returns 204 (not 200), and `Wait.forHttp()` accepts any 2xx status by default, so this works correctly without needing `.forStatusCode()`.
- `daprio/daprd:1.14.0` is a valid Docker image and tag (Dapr v1.14 released August 2024). Newer versions exist but 1.14.0 is not incorrect.
- The unit test mock pattern in the first section (manually constructing a mock client and injecting it via constructor) is clean and correct.
