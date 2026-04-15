# Validation Summary: How to Evaluate Dapr for Your Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Redis (as state store example)
- Kafka, SQS, DynamoDB, PostgreSQL, Vault, AWS Secrets Manager (mentioned as replaceable backends)
- Python (referenced in PoC command)

## Sources Consulted
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr getting started — `dapr init`: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr building blocks concepts: https://docs.dapr.io/concepts/building-blocks-concept/
- Dapr mTLS configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr access control / service invocation allow lists: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found

1. **Deprecated CLI flag `--components-path`** (line 59): The `dapr run` command used `--components-path`, which is deprecated in favor of `--resources-path`. Changed to `--resources-path`.

2. **Misleading certificate rotation claim** (line 69): The post stated "Dapr handles this automatically" regarding certificate rotation. While Dapr automatically generates initial self-signed certificates, root certificate rotation upon expiration requires manual intervention using `dapr mtls renew-certificate` or by clearing the trust bundle secret and restarting services. Updated the text to clarify that initial generation is automatic but rotation is manual.

## Review Notes
- The sidecar resource overhead numbers ("typically 50-100m CPU, 100-200Mi memory per pod") are plausible but not sourced from official documentation. The official Dapr Kubernetes production guidelines recommend requesting 100m CPU and 250Mi memory, with limits of 300m CPU and 1000Mi memory. The blog's memory figure (100-200Mi) is lower than the official recommended request (250Mi). This is not strictly wrong since actual consumption varies by workload, but readers should consult official guidelines for production sizing.
- The building blocks table uses slightly informal names (e.g., "Input Bindings" instead of "Bindings", "Secret Store" instead of "Secrets") but these are recognizable and acceptable in context.
- The building blocks table is intentionally not exhaustive — it omits Actors, Configuration, Distributed Lock, Cryptography, and Jobs — which is appropriate since the table maps specific use cases rather than listing all blocks.
- The state store YAML omits `redisPassword`, which is fine for a local PoC with default Redis settings.
- The `kubectl` commands for checking mTLS and access control configuration are correct and follow standard Dapr Kubernetes inspection patterns.
