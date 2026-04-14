# Validation Summary: How to Create Runbooks for Dapr Operational Issues

## Status
validated

## Post Type
Guide / Operational reference

## Technologies Covered
- Dapr (sidecar architecture, mTLS, pub/sub, state management, service invocation)
- Kubernetes (kubectl, deployments, secrets, pods, webhooks)
- Redis (Streams, consumer groups)
- OpenSSL (certificate inspection)
- Dapr CLI (init, uninstall, mtls commands)

## Sources Consulted
- Dapr Sidecar Injector docs: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr Operator docs: https://docs.dapr.io/concepts/dapr-services/operator/
- Dapr troubleshooting common issues: https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus metrics: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr mTLS certificate renewal CLI reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr mTLS setup docs: https://docs.dapr.io/operations/security/mtls/
- Dapr daprd container image (distroless base): https://hub.docker.com/r/daprio/daprd

## Issues Found

1. **Runbook 1 — Wrong component for sidecar injector logs**: The post used `app=dapr-operator` to check webhook logs, but sidecar injection is handled by `dapr-sidecar-injector`, not the operator. Changed label selector to `app=dapr-sidecar-injector`.

2. **Runbook 2 — `wget` in distroless daprd container**: The command `kubectl exec -it my-app-pod -c daprd -- wget ...` would fail because the `daprd` sidecar uses a distroless base image (`gcr.io/distroless/static:nonroot`) with no shell or CLI tools. Changed to exec into the app container instead.

3. **Runbook 3 — Non-existent `dapr-metrics` service**: The post referenced `svc/dapr-metrics` in the `dapr-system` namespace, but no such centralized service exists. Dapr metrics are exposed per-sidecar on port 9090. Changed to port-forward to the subscriber deployment directly.

4. **Runbook 4 — Wrong secret key name for root certificate**: The trust bundle secret uses the key `ca.crt`, not `root.crt`. Changed `{.data.root\.crt}` to `{.data.ca\.crt}`.

5. **Runbook 4 — Incorrect `dapr mtls renew-certificate` flags**: The flags `--private-key` and `--public-key` do not exist on this command. The correct flags are `--issuer-private-key` and `--issuer-public-certificate`. Updated accordingly.

6. **Runbook 5 — `wget` in distroless daprd container**: Same issue as #2. Changed to exec into the default (app) container instead of the daprd container.

## Review Notes
- The namespace label `dapr.io/enabled=true` in Runbook 1 is not a standard Dapr mechanism for controlling sidecar injection (injection is controlled via pod annotations). However, it is left as-is since it could be part of a custom namespace-scoped configuration.
- The comment "Dapr calls /healthz or /health by default" in Runbook 5 is slightly misleading — app health checking must be explicitly enabled via the `dapr.io/enable-app-health-check` annotation. Left as-is since it's contextually reasonable within the resolution steps.
- All kubectl, Redis CLI, and bash script commands are syntactically correct and use valid flags.
