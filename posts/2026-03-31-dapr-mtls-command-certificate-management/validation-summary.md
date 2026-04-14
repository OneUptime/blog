# Validation Summary: How to Use the dapr mtls Command for Certificate Management

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr mtls` subcommands)
- mTLS (Mutual TLS) certificate management
- Kubernetes
- Dapr Sentry service (certificate authority)

## Sources Consulted
- Dapr CLI source code on GitHub (`dapr/cli` repository) — `cmd/mtls.go`, `cmd/invoke.go`, `cmd/logs.go`, `pkg/kubernetes/mtls.go`
- Dapr official documentation at https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI command flag definitions and required flag markings in source

## Issues Found

### 1. Incorrect `--kubernetes` flag on `dapr mtls expiry`
- **What was wrong:** The post used `dapr mtls expiry --kubernetes`. The `expiry` subcommand does not accept a `--kubernetes` flag — it implicitly operates against Kubernetes.
- **What was changed:** Removed `--kubernetes` from the command, now reads `dapr mtls expiry`.
- **Why:** Confirmed via Dapr CLI source code (`cmd/mtls.go`) — the `expiry` subcommand has no `--kubernetes` flag registered; Kubernetes is the only supported platform and is assumed.

### 2. Incorrect `--kubernetes` flag on `dapr mtls export`
- **What was wrong:** The post used `dapr mtls export --kubernetes --out ./dapr-certs`. The `export` subcommand does not accept a `--kubernetes` flag — it implicitly operates against Kubernetes.
- **What was changed:** Removed `--kubernetes` from the command, now reads `dapr mtls export --out ./dapr-certs`.
- **Why:** Confirmed via Dapr CLI source code — the `export` subcommand only has `--out` (`-o`) as a flag; Kubernetes is implicit.

### 3. Invalid `dapr invoke --kubernetes` command
- **What was wrong:** The post used `dapr invoke --app-id target-service --method health --verb GET --kubernetes`. The `dapr invoke` command does not have a `--kubernetes` flag and only works in self-hosted mode.
- **What was changed:** Removed the entire `dapr invoke` line from the verification section. Kept the `dapr logs` command which is valid for Kubernetes and sufficient for verifying mTLS via log inspection.
- **Why:** Confirmed via Dapr CLI source code (`cmd/invoke.go`) — `dapr invoke` is explicitly documented as "Supported platforms: Self-hosted" and has no `--kubernetes` flag.

## Review Notes
- The `--out` flag on `dapr mtls export` is correct (short form `-o`, defaults to current directory). This was verified against source.
- The `dapr mtls renew-certificate` flags (`--kubernetes`, `--valid-until`, `--ca-root-certificate`, `--issuer-private-key`, `--issuer-public-certificate`) are all correct per source code.
- The `dapr logs --app-id target-service --kubernetes` command is correct — `--kubernetes` defaults to `true` but is explicitly accepted.
- The Dapr Configuration YAML for disabling mTLS (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`, `spec.mtls.enabled: false`) is correct.
- The `renew-certificate` subcommand also accepts `--restart` (to restart control plane services) and `--private-key` (root key), which the post doesn't mention but is not required to.
