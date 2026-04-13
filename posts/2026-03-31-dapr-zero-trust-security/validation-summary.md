# Validation Summary: How to Implement Zero Trust Security with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- mTLS (mutual TLS) with SPIFFE X.509 certificates
- Dapr Configuration CRD (access control, API allowlisting, mTLS settings)
- Kubernetes NetworkPolicy
- Dapr secret store references
- Dapr sidecar annotations (logging, tracing)
- kubectl CLI

## Sources Consulted
- Dapr CLI reference for mTLS: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr mTLS configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr access control list configuration: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr API allowlisting: https://docs.dapr.io/operations/configuration/api-allowlist/
- Dapr component secret references: https://docs.dapr.io/operations/components/component-secrets/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr GitHub source (SPIFFE implementation): https://github.com/dapr/dapr/blob/master/pkg/security/spiffe/spiffe.go

## Issues Found

1. **Incorrect CLI command `dapr mtls check --kubernetes`** (appeared twice: Pillar 1 and Checklist section). The `check` subcommand does not exist. The correct command is `dapr mtls -k` (or `dapr mtls --kubernetes`). The valid subcommands under `dapr mtls` are `expiry`, `export`, and `renew-certificate`. Fixed both occurrences to `dapr mtls -k`.

2. **Incorrect API allowlist `version` value**. The post used `version: v1` for HTTP protocol APIs. For HTTP, the correct version string is `v1.0` (gRPC uses `v1`). Fixed both entries (`state` and `publish`) to `version: v1.0`.

3. **Incorrect API allowlist `protocol` casing**. The post used `protocol: HTTP` (uppercase). The Dapr documentation shows lowercase `protocol: http`. Fixed both entries to `protocol: http`.

4. **NetworkPolicy used annotation as label selector**. The post used `dapr.io/enabled: "true"` in `podSelector.matchLabels`, but `dapr.io/enabled` is a pod annotation (used to trigger sidecar injection), not a label. NetworkPolicies can only select on labels. The correct label added by the Dapr sidecar injector is `dapr.io/sidecar-injected: "true"`. Fixed both occurrences (ingress and egress rules).

## Review Notes
- The secret store reference snippet in Pillar 4 is a partial fragment. In a full Component manifest, `auth` is a top-level field (not nested inside `spec`), while the `metadata` shown refers to `spec.metadata`. The snippet is not wrong per se, but readers building a full manifest should consult the Dapr component docs for the complete structure.
- The mTLS configuration values (`workloadCertTTL: "1h"`, `allowedClockSkew: "5m"`) are valid but differ from defaults (`24h` and `15m` respectively). The post's choices of shorter values are appropriate for a zero trust context.
- The `daprsystem` configuration name and `dapr-system` namespace are correct for a standard Dapr Kubernetes installation.
