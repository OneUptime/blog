# Validation Summary: How to Install and Configure the Dapr JavaScript SDK

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js
- TypeScript
- Dapr CLI

## Sources Consulted
- Dapr JavaScript SDK GitHub repository: https://github.com/dapr/js-sdk
- Dapr JS SDK source: `DaprClientOptions` type definition (`src/types/DaprClientOptions.ts`)
- Dapr JS SDK source: `Settings.util.ts` for default host/port values
- Dapr JS SDK source: `CommunicationProtocol.enum.ts` for enum values
- Dapr JS SDK source: `IClientState` interface for state store API signatures
- Dapr CLI documentation: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI install scripts: https://docs.dapr.io/getting-started/install-dapr-cli/
- npm registry: https://www.npmjs.com/package/@dapr/dapr

## Issues Found

### 1. Incorrect default DAPR_HOST value
- **What was wrong:** The post stated the default `DAPR_HOST` was `http://localhost` (with protocol prefix). The SDK's actual default is `127.0.0.1` (no protocol prefix).
- **What was changed:** Updated the fallback value in the code example from `"http://localhost"` to `"127.0.0.1"`, and updated the Environment Variables Reference table accordingly.
- **Why:** The `DaprClient` options expect a bare host string without a protocol prefix. The SDK default in `Settings.util.ts` is `127.0.0.1`.

### 2. Missing `-O -` flag in wget install command
- **What was wrong:** The Dapr CLI install command used `wget -q <url> | /bin/bash`, which is missing the `-O -` flag. Without `-O -`, `wget` saves the script to a file instead of writing to stdout, so nothing would be piped to bash.
- **What was changed:** Added the `-O -` flag: `wget -q <url> -O - | /bin/bash`.
- **Why:** This matches the official Dapr installation documentation and is required for the pipe to work correctly.

### 3. Deprecated `--components-path` flag
- **What was wrong:** The `dapr run` command used `--components-path`, which is deprecated.
- **What was changed:** Replaced `--components-path` with `--resources-path`.
- **Why:** The Dapr CLI has deprecated `--components-path` in favor of `--resources-path`, which supports loading multiple resource types (components, resiliency policies, subscriptions, etc.).

## Review Notes
- The DaprClient constructor API, CommunicationProtocolEnum, state store API method signatures, and default port values were all verified as correct against the SDK source code.
- TypeScript types are confirmed to be bundled in the `@dapr/dapr` package (declared as `"types": "./build/index.d.ts"` in package.json) -- the post's claim about no separate `@types` package is correct.
- The gRPC example correctly uses `"localhost"` (without protocol prefix) for the host, which is consistent with how gRPC clients typically connect.
