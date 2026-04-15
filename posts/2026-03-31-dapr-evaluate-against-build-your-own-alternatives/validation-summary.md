# Validation Summary: How to Evaluate Dapr Against Build-Your-Own Alternatives

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (building blocks, sidecar architecture, mTLS)
- AWS DynamoDB (as Dapr state store component)
- Redis (as Dapr state store component)
- Kafka / RabbitMQ (pub/sub)
- HashiCorp Consul / CoreDNS (service discovery)
- HashiCorp Vault (secrets management)
- OpenTelemetry (observability)
- Polly (.NET resilience library)
- resilience4j (Java resilience library)
- Temporal / Conductor (workflow engines)
- Apache Bench (ab) for load testing

## Sources Consulted
- Dapr official documentation — building blocks overview: https://docs.dapr.io/concepts/building-blocks-concept/
- Dapr DynamoDB state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr sidecar default ports documentation: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mTLS / security documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr SDK documentation: https://docs.dapr.io/developing-applications/sdks/
- Dapr resiliency documentation: https://docs.dapr.io/operations/resiliency/

## Issues Found

### 1. Resiliency and Observability mislabeled as "Building Blocks"
**What was wrong:** The comparison table had the header "Dapr Building Block" and included Resiliency and Observability in the list. In Dapr's architecture, Resiliency (retry policies, circuit breakers, timeouts) and Observability (tracing, metrics, logging) are cross-cutting features built into the sidecar, not standalone building blocks with dedicated APIs.
**What was changed:** Renamed the table header from "Dapr Building Block" to "Dapr Capability" and added a clarifying note below the table explaining which items are building blocks and which are cross-cutting features.

### 2. Table implied completeness while omitting building blocks
**What was wrong:** The introductory text stated "implementing everything Dapr provides out of the box" but the table omitted several actual Dapr building blocks including Bindings, Configuration, Distributed lock, Cryptography, and Jobs.
**What was changed:** Softened the introductory text to "the key capabilities Dapr provides out of the box. Here are some of the most common ones" and added Bindings to the table as an additional representative building block.

### 3. Decision framework scoring inconsistency
**What was wrong:** The text preceding the decision framework table said "Score each factor from 1-5" but the table used +/- notation instead of numeric scores.
**What was changed:** Changed the text to "Rate each factor for your situation" to match the +/- notation actually used in the table.

## Review Notes
- The Dapr invoke API path (`/v1.0/invoke/{appId}/method/{method-name}`), default HTTP port (3500), DynamoDB component type (`state.aws.dynamodb`), and metadata fields (`table`, `region`) are all verified correct.
- The mTLS-by-default claim is accurate for Kubernetes deployments with the Dapr control plane installed.
- The sidecar overhead estimate of 0.5-2ms is a reasonable ballpark, though actual latency varies by workload, deployment topology, and Dapr version.
- The `ab` (Apache Bench) commands use correct syntax. Note that `ab` provides percentile latency breakdowns in its output, which supports the p50/p95/p99 comparison the post recommends.
- Dapr has additional SDKs beyond the five listed (e.g., PHP, Rust, C++), but the post lists the primary stable ones and does not claim to be exhaustive.
