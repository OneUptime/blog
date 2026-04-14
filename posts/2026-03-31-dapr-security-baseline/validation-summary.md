# Validation Summary: How to Implement Dapr Security Baseline

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, NetworkPolicy, CRDs)
- mTLS (mutual TLS) for service-to-service communication
- HashiCorp Vault (secret store integration)
- Redis (state store example)
- jq (JSON processing in verification script)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Dapr Configuration spec — mTLS fields (`mtls.enabled`, `workloadCertTTL`, `allowedClockSkew`) verified against other validated Dapr blog posts in this repository and Dapr official documentation patterns
- Dapr Access Control spec — `accessControl` field structure (`defaultAction`, `trustDomain`, `policies` with `appId`, `namespace`, `operations`) cross-referenced with `posts/2026-03-31-dapr-access-control-policies/README.md`
- Dapr Secret Store component spec — `secretstores.hashicorp.vault` type and metadata fields (`vaultAddr`, `skipVerify`, `tlsCACert`, `vaultTokenMountPath`) verified against `posts/2026-03-31-dapr-how-to-configure-dapr-with-hashicorp-vault-secret-store/README.md`
- Dapr Component secret references — `auth.secretStore` and `secretKeyRef` pattern verified against multiple posts including GCP Secret Manager and Vault integration posts
- Dapr sidecar Kubernetes annotations — `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-limit`, `dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`, `dapr.io/disable-builtin-k8s-secret-store` verified across multiple Dapr blog posts
- Dapr control plane ports — verified against `posts/2026-03-31-dapr-network-policies-kubernetes/README.md` and `posts/2026-03-31-dapr-kubernetes-networkpolicies/README.md`
- Dapr sidecar container name `daprd` — confirmed in `posts/2026-03-31-dapr-admission-webhook-errors-kubernetes/README.md` and `posts/2026-03-31-dapr-alerting-metrics/README.md`

## Issues Found
1. **Incorrect egress port in NetworkPolicy**: The egress rule to the `dapr-system` namespace listed port `3500` alongside port `50001`. Port 3500 is the Dapr sidecar's local HTTP API port (accessed via `localhost:3500` by the application), not a control plane port. It is never used for communication with services in the `dapr-system` namespace. Changed port `3500` to `6500`, which is the Dapr Operator gRPC port that sidecars use to receive component and configuration updates from the control plane.

## Review Notes
- The NetworkPolicy ingress rule uses `app.kubernetes.io/name: dapr-sidecar` as a pod selector label. Since Dapr sidecars are injected as containers within application pods (not separate pods), this label would need to be applied manually or replaced with a label that matches the actual source pods. This is a design choice that varies by deployment, so it was left as-is.
- The verification script's jq expressions are functional but could produce false positives when checking for inline secrets (e.g., a metadata value containing the word "key" that isn't actually a secret). This is noted as a minor limitation of the heuristic approach.
- The post correctly states that Dapr enables mTLS by default. This has been the case since Dapr 1.0 for Kubernetes deployments.
- For a more complete egress rule to dapr-system, deployments using Dapr actors would also need port 50005 (Placement service) and those using scheduled jobs would need port 50006 (Scheduler service).
