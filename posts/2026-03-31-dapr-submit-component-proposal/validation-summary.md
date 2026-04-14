# Validation Summary: How to Submit a Dapr Component Proposal

## Status
validated

## Post Type
Tutorial / Contribution Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr components-contrib repository (Go)
- Go programming language
- GitHub CLI (`gh`)
- Git

## Sources Consulted
- [dapr/components-contrib repository](https://github.com/dapr/components-contrib)
- [Dapr state package documentation (pkg.go.dev)](https://pkg.go.dev/github.com/dapr/components-contrib/state)
- [Dapr conformance tests README](https://github.com/dapr/components-contrib/blob/main/tests/conformance/README.md)
- [Dapr kit/logger package](https://pkg.go.dev/github.com/dapr/kit/logger)
- [Redis state store implementation (reference component)](https://github.com/dapr/components-contrib/blob/main/state/redis/redis.go)
- [Dapr pluggable component registration docs](https://docs.dapr.io/operations/components/pluggable-components-registration/)

## Issues Found

1. **Default branch is `main`, not `master`**: The `gh api` command and the browse URL both referenced `master`. The dapr/components-contrib default branch is `main`. Fixed both occurrences.

2. **Missing `context` import in Go code**: The component implementation used `context.Context` in method signatures but did not include `"context"` in the import block. Added the missing import.

3. **Missing `Close()` method**: The `state.Store` interface embeds `io.Closer`, requiring a `Close() error` method. The example implementation omitted this. Added the method.

4. **Incorrect conformance test command**: The original command used a non-existent `-component` flag and was missing the required `-tags=conftests` build tag. Fixed to use the correct format: `go test -v -tags=conftests -count=1 ./tests/conformance -run="TestStateConformance/mynewdb"`.

5. **Misleading component registration section**: The post implied registration happens within `components-contrib` via a `stateRegistry` type. In practice, component registration happens in the `dapr/dapr` runtime repository under `cmd/daprd/components/`. Rewrote the section with the correct repository context and registration pattern.

## Review Notes
- The proposal issue template shown is a reasonable approximation but may not match the exact GitHub issue template in the repository. Since templates evolve over time, this is acceptable as illustrative guidance.
- The post does not mention that `BulkStore` operations (BulkGet, BulkSet, BulkDelete) are also part of the full state store contract; the base methods shown are sufficient for a minimal implementation since default bulk implementations are provided.
- The commit message convention (`feat(state): ...`) and signed commits (`-s` flag) align with Dapr's contribution practices.
