# Validation Summary: How to Use Dapr with CloudNativePG on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management component)
- PostgreSQL (state store backend)
- CloudNativePG (CNPG) Kubernetes operator
- Kubernetes
- Go (Dapr Go SDK)

## Sources Consulted
- Dapr PostgreSQL state store component documentation (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/)
- Dapr Go SDK source code (https://github.com/dapr/go-sdk)
- CloudNativePG official documentation (https://cloudnative-pg.io/documentation/)
- CloudNativePG API reference for Cluster CRD spec
- CloudNativePG GitHub repository releases (https://github.com/cloudnative-pg/cloudnative-pg)

## Issues Found

1. **Missing `fmt` import in Go code example**: The Go code at the "Using the State Store" section used `fmt.Println` but did not include `"fmt"` in the import block. This would cause a compilation error. **Fixed** by adding `"fmt"` to the import statement.

2. **Inaccurate read-only service endpoint description**: The blog described the `-r` suffix as the "read-only endpoint." CloudNativePG actually creates three services: `-rw` (primary only), `-ro` (replicas only), and `-r` (any instance including primary). The `-r` service routes to all instances, not just replicas. **Fixed** by clarifying that `-ro` routes to replica instances only, while `-r` routes to any instance including the primary.

## Review Notes
- The CNPG install URL references `cnpg-1.23.0.yaml`. Newer patch releases (e.g., 1.23.6) may be available on the `release-1.23` branch. The official docs also recommend `kubectl apply --server-side -f` rather than plain `kubectl apply -f`.
- The connection string uses `sslmode=require`, which encrypts traffic but does not verify the server certificate. Since CNPG automatically provisions TLS certificates and exposes the CA as a Kubernetes secret, `sslmode=verify-full` would be more secure for production. The current value is functional but not optimal.
- The Dapr component type `state.postgresql` and version `v1` are correct and current.
- The CloudNativePG Cluster CRD spec fields (`instances`, `storage.size`, `bootstrap.initdb.*`) are all accurate per the API reference.
- The Go SDK function signatures (`SaveState`, `GetState`, `ExecuteStateTransaction`) and struct types (`StateOperation`, `SetStateItem`) are correct.
- The `kubectl wait` command with `--for=condition=Ready` is valid for CNPG Cluster resources.
