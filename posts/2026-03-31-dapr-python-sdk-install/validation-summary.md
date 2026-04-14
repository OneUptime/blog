# Validation Summary: How to Install and Configure the Dapr Python SDK

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr` package)
- Dapr CLI
- Python
- gRPC

## Sources Consulted
- Dapr CLI install docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr Python SDK docs: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Python SDK GitHub: https://github.com/dapr/python-sdk
- Dapr Python SDK on PyPI: https://pypi.org/project/dapr/
- Dapr environment variable reference: https://docs.dapr.io/reference/environment/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **Broken wget command (line 22)**: The Dapr CLI install command was `wget -q <url> | /bin/bash`, which is missing the `-O -` flag. Without it, wget saves to a file instead of piping to stdout, so bash receives no input. Fixed to `wget -q <url> -O - | /bin/bash`.

2. **Invalid pip extras syntax (line 46)**: `pip install dapr[grpc]` was listed as the install command "for async support." There is no evidence that the `dapr` package supports a `[grpc]` extras syntax — the gRPC extension is a separate package (`dapr-ext-grpc`). Additionally, the label "async support" was misleading since `dapr-ext-grpc` is for gRPC transport, not specifically async. Replaced with `pip install dapr-ext-fastapi` for FastAPI integration, which is a real and commonly used extension.

3. **Wrong port in custom endpoint example (line 79-81)**: The custom DaprClient configuration used `DAPR_HTTP_PORT` (default 3500) to construct the address, but `DaprClient` defaults to gRPC transport which uses port 50001. Passing the HTTP port to the gRPC client would cause a connection failure. Fixed to use `DAPR_GRPC_PORT` with default `50001`.

4. **Deprecated CLI flag (line 128)**: `--components-path` is deprecated in favor of `--resources-path`. Updated to `--resources-path`.

5. **Wrong Python version requirement (line 17)**: The post stated "Python 3.9 or later" but the actual `dapr` package on PyPI specifies `python_requires >= 3.10`. Fixed to "Python 3.10 or later."

## Review Notes
- The project structure shows a `dapr/components/` directory, which is a reasonable convention but users should be aware that Dapr's default components directory on local init is `~/.dapr/components/`.
- The state store examples assume a component named "statestore" is configured, which is the default name created by `dapr init` using Redis, so this is fine for a getting-started tutorial.
- The `result.data` field on `get_state` returns bytes, so `result.data.decode("utf-8")` and `json.loads(result.data)` are both correct usage patterns shown in the post.
