# Validation Summary: How to Use Dapr Python SDK with gRPC Extension

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Python
- gRPC
- dapr-ext-grpc (Dapr Python gRPC extension)
- CloudEvents SDK for Python
- Dapr CLI

## Sources Consulted
- Dapr Python SDK source code on GitHub: https://github.com/dapr/python-sdk
- Official Dapr Python SDK examples (invoke-simple, pubsub-simple): https://github.com/dapr/python-sdk/tree/master/examples
- `dapr.ext.grpc` module `__init__.py` and `app.py` for App class, decorator signatures, and public exports
- `dapr.clients.grpc._response` and `dapr.clients.grpc._request` for InvokeMethodResponse/InvokeMethodRequest class signatures
- Dapr CLI source code (`dapr/cli` repo) for `dapr run` and `dapr invoke` flag verification
- Official Dapr Kubernetes deployment manifests for annotation verification

## Issues Found

### 1. Missing `InvokeMethodRequest` import (Bug)
- **What was wrong:** The "Handling Service Invocations" section used `InvokeMethodRequest` as a type hint in the handler function, but it was never imported. The code would raise a `NameError` at runtime.
- **What was changed:** Consolidated imports in the "Creating a gRPC Service" section to `from dapr.ext.grpc import App, InvokeMethodRequest, InvokeMethodResponse`, which adds the missing import.
- **Why:** This is the public API surface for these classes, as shown in the official Dapr Python SDK examples.

### 2. Non-idiomatic private import path (Fixed alongside #1)
- **What was wrong:** `InvokeMethodResponse` was imported from `dapr.clients.grpc._response`, which is a private/internal module path (underscore-prefixed). While functional, this is not the recommended import path.
- **What was changed:** Changed to import from `dapr.ext.grpc`, which is the public re-export path used in all official examples.
- **Why:** Private module paths may change without notice across versions. The public API at `dapr.ext.grpc` is stable and documented.

## Review Notes
- `DaprClient.invoke_method()` carries a deprecation warning in the SDK source code in favor of gRPC proxying. The blog does not mention this. This is not incorrect for current usage but may warrant a note in a future update.
- All decorator signatures (`@app.method`, `@app.subscribe`, `@app.binding`), parameter names, CloudEvents handling (`v1.Event` with `.Data()`), `app.run()` usage, CLI commands, and Kubernetes annotations were verified as correct.
- The `cloudevents.sdk.event.v1` import and `event.Data()` (capital D) usage matches the official Dapr examples.
