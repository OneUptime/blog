# Validation Summary: How to Use Dapr with React Frontend and .NET Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, state management)
- React (with TypeScript, Create React App)
- .NET (ASP.NET Core Web API)
- Docker Compose (sidecar pattern)
- Axios (HTTP client)

## Sources Consulted
- Dapr .NET SDK source code on GitHub (master branch) — `DaprMvcBuilderExtensions.cs`, `DaprServiceCollectionExtensions.cs`, `DaprClient.cs`
- Dapr service invocation HTTP API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr self-hosted with Docker documentation — https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr samples: hello-docker-compose — https://github.com/dapr/samples/blob/master/hello-docker-compose/docker-compose.yml
- daprio/daprd Docker Hub image — https://hub.docker.com/r/daprio/daprd

## Issues Found
- **Docker Compose: Port 3500 not exposed to host.** The React frontend runs in the browser and calls `http://localhost:3500/...` to reach the Dapr sidecar. However, the Docker Compose configuration only exposed port `5000:80` on the `task-api` service. Since the Dapr sidecar uses `network_mode: "service:task-api"` (sharing the task-api network namespace), port 3500 lives inside that namespace but was never mapped to the host. Added `"3500:3500"` to the `task-api` service ports so the browser can reach the Dapr HTTP API.

## Review Notes
- **`AddDaprClient()` is redundant:** `AddControllers().AddDapr()` internally calls `AddDaprClient()`, so the explicit `builder.Services.AddDaprClient()` call is unnecessary. However, calling both is harmless (uses `TryAdd` to avoid duplicates) and is a common pattern, so no change was made.
- **`create-react-app` is deprecated:** As of 2024, Create React App is no longer maintained. The React team recommends Vite or framework-based setups (Next.js, Remix). The command still works but is outdated for a 2026 blog post. Consider updating to `npm create vite@latest task-frontend -- --template react-ts` in a future revision.
- **`REACT_APP_DAPR_HTTP_PORT` as Docker Compose runtime env var:** CRA environment variables prefixed with `REACT_APP_` are embedded at build time, not read at runtime. The Docker Compose `environment` setting would only apply if the build step runs inside the container. Since the code defaults to `3500` anyway (`|| '3500'`), the app works correctly, but the env var in docker-compose is misleading.
- **CORS not addressed:** The browser making requests from `localhost:3000` to `localhost:3500` is a cross-origin request. Dapr's HTTP server supports a `--allowed-origins` flag on `daprd`, but this is not configured. In a real deployment, CORS would need to be handled (or a reverse proxy / BFF pattern used).
- **Browser-to-sidecar is an anti-pattern:** The architecture has the browser calling the Dapr sidecar directly. In production, a BFF or API gateway should sit between the browser and Dapr. The blog does mention this ("In production, React makes API calls to a BFF"), but the tutorial code demonstrates the direct approach for simplicity.
- **`version: '3.8'` in Docker Compose:** In Docker Compose v2 (the current default), the `version` field is obsolete and ignored with a warning. Not an error, but unnecessary.
- **`TaskItem` model not defined:** The C# code references a `TaskItem` class that is never defined. This is a common omission in tutorials — the reader is expected to create it — but could cause confusion for beginners.
