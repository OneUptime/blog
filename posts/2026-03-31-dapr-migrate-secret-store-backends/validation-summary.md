# Validation Summary: How to Migrate Between Dapr Secret Store Backends

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (secret store components, sidecar API)
- Kubernetes (deployments, CRDs, kubectl)
- HashiCorp Vault (KV secrets engine, CLI)
- Python (httpx, asyncio)
- Go (net/http, encoding/json)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Kubernetes secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr annotations and arguments overview: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Go code missing `defer resp.Body.Close()`** — The `fetchFromDapr` function called `http.Get` but never closed the response body, which is a resource leak. Fixed by separating the `err != nil` check from the status code check and adding `defer resp.Body.Close()` after confirming the request succeeded (standard Go idiom).

2. **Incorrect use of `dapr.io/config` annotation in Step 4** — The original `kubectl patch` command set the `dapr.io/config` annotation to switch secret stores. This annotation controls Dapr Configuration resources (tracing, middleware, mTLS), not secret store selection. Secret store selection is determined by the store name passed in the application's API calls. Replaced with `kubectl set env` to update a `SECRET_STORE` environment variable, which is a more accurate way to switch which store name the application uses.

3. **Contradictory summary claim** — The summary stated "application code does not need to change - only the component YAML," but the article itself demonstrates application code changes (dual-read pattern in Step 3, different store names). Fixed the summary to accurately reflect that application code only needs to change the store name in API calls, with no vendor SDK swaps or authentication rewiring required.

## Review Notes
- The Python migration script places `import subprocess` inside a loop, which is poor style but not a technical error. Blog code examples should ideally demonstrate good practices, but this is a minor style issue.
- The Dapr component YAML, API endpoints, component types (`secretstores.kubernetes`, `secretstores.hashicorp.vault`), and Vault metadata field (`vaultAddr`) were all verified as correct against current Dapr documentation.
- The overall migration strategy (parallel stores, sync, dual-read, gradual cutover, decommission) is sound operational advice.
