# Test Cloud Portability Continuously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Portability, Continuous Testing, Kubernetes, Terraform, Disaster Recovery, Platform Engineering, CI/CD

Description: Turn cloud portability into recurring evidence with static checks, target infrastructure tests, workload contracts, data restores, and measured evacuation rehearsals.

---

An architecture diagram cannot prove portability. Provider APIs, Kubernetes versions, add-ons, quotas, application dependencies, and datasets change after the diagram is approved. A migration path that is not exercised decays.

Test portability at several cadences. Cheap checks run on every change; real target deployments and restores run often enough to detect drift before an urgent move.

## Define Portability as Testable Claims

Replace `runs in any cloud` with specific claims:

```yaml
workload: checkout-api
supported_targets:
  - platform: eks
    kubernetes_minor: "1.35"
  - platform: aks
    kubernetes_minor: "1.35"
claims:
  provision_minutes: "<= 45"
  deploy_minutes: "<= 15"
  backup_age_hours: "<= 24"
  restore_minutes: "<= 90"
  functional_suite: pass
  peak_requests_per_second: ">= 1200"
evidence_max_age_days: 90
```

Version numbers here are examples; the pipeline should select versions currently supported by each managed service. A claim applies only to a named target and tested version.

## Build a Test Pyramid

### Every change: static and schema checks

Render the workload manifests for the target and inspect them:

```bash
helm template checkout ./chart -f targets/aks.yaml --kube-version 1.35.0 > rendered.yaml
kubectl --context schema-cluster apply --dry-run=server -f rendered.yaml
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
```

Also enforce policy for:

- removed Kubernetes APIs;
- unapproved cloud annotations and provider hostnames;
- unpinned container images or Terraform modules;
- hard-coded regions, zones, account IDs, and storage classes;
- static cloud credentials;
- unsupported architectures or privileged runtime assumptions.

Server-side dry run proves API and admission acceptance on that cluster. It does not prove controller reconciliation or infrastructure creation.

### Every module change: interface tests

Use Terraform test files to assert provider-specific modules return the stable contract. In Terraform 1.7 or later, mock providers are useful for logic and validation, but HashiCorp notes that mocks generate synthetic computed values; they cannot prove a real provider API behaves as required.

Run real plan/apply tests in dedicated, restricted test accounts for high-value modules. Tag resources with run ID and expiry, cap quotas, alert on cleanup failure, and avoid tests that can reach production networks or data.

### Nightly or weekly: ephemeral target deployment

Provision the target platform from empty state:

1. create network, cluster, identity, registry access, and data services;
2. install controllers and wait for healthy status;
3. deploy the workload from immutable artifacts;
4. run functional and security contract tests;
5. inject a Pod and node failure;
6. capture timings and telemetry;
7. destroy the environment and verify cleanup.

Reusing a permanent target can hide missing bootstrap steps. A persistent integration environment is useful for fast feedback, but periodically prove creation from nothing.

### Monthly or quarterly: data restore and cutover

Restore an actual, policy-approved backup into target infrastructure. Verify schema, row or object counts, checksums, sequence state, access control, and application behavior. Measure RPO and RTO from timestamps, not estimates.

Route synthetic or isolated test traffic through target DNS and TLS. For a nonproduction domain, rehearse the record change and rollback.

## Use One Contract Suite Across Targets

The suite should test externally visible behavior rather than internal resource names:

```text
POST /orders with idempotency key creates one order
duplicate request returns the same outcome
object upload validates SHA-256 and can be ranged-read
message redelivery does not repeat a charge
database failover reconnects within the SLO
unauthorized workload identity cannot read another tenant
readiness removes a failing instance from traffic
```

Provider-specific tests remain necessary for adapters such as storage lifecycle, load-balancer policy, and IAM. Run shared tests first and extension tests second.

## Test Kubernetes Beyond Manifest Acceptance

Managed Kubernetes conformance covers the required Kubernetes APIs in its defined scope. Your stack adds CSI, CNI, Gateway or Ingress controllers, DNS, secrets, policy, and telemetry.

In every target, test:

- installed CRDs and stored versions;
- controller version compatibility;
- Gateway API claimed Core and Extended features;
- NetworkPolicy enforcement;
- persistent-volume provision, expand, restore, and reclaim lifecycle through StorageClass, plus snapshot lifecycle through VolumeSnapshotClass;
- workload identity allowed and denied calls;
- node architecture, topology, disruption, and autoscaling;
- cluster and node-pool upgrade through a supported path.

Record controller status conditions and cloud resource readiness, not only `kubectl apply` exit status.

## Detect Data-Path Decay

For every stateful dependency, schedule an exit-format restore:

| Dependency | Recurring evidence |
| --- | --- |
| PostgreSQL | logical or supported physical restore plus application suite |
| Object store | manifest copy and checksum comparison |
| Queue | replay neutral envelopes into target adapter |
| Secret store | reissue or restore, rotate, then read from target identity |
| Container registry | pull immutable digests with source registry unavailable |

Provider snapshots can supplement this test, but a source-only snapshot is not cross-provider evidence.

## Exercise Failure, Not Only Provisioning

Inject realistic failures:

- revoke a workload trust mapping;
- exhaust a target quota in a test account;
- let a message lease expire;
- reject a Gateway route or storage request;
- deny the source registry and secret endpoint;
- make a replication consumer lag;
- interrupt the deployment halfway and rerun it;
- fail cleanup and confirm the resource leak alert.

The objective is to verify diagnostic and recovery paths as much as the happy path.

## Preserve Evidence with an Expiry

Store a result object for each run:

```json
{
  "workload": "checkout-api",
  "sourceRevision": "8d81c3a",
  "target": "aks/1.35/uksouth",
  "startedAt": "2026-08-04T01:00:00Z",
  "provisionSeconds": 1920,
  "restoreSeconds": 4012,
  "rpoSeconds": 612,
  "functional": "passed",
  "cleanup": "passed",
  "artifacts": ["plan.json", "junit.xml", "restore-report.json"]
}
```

Sign or protect evidence from silent modification. Display freshness in a service catalog. When evidence exceeds its maximum age or a dependency version changes, status becomes `unknown`, not `portable`.

## Control Cost and Risk

Portability tests create real infrastructure and can incur charges. Use:

- dedicated accounts, subscriptions, or projects;
- restrictive organization policies and budgets;
- low service quotas that still permit the test;
- randomized globally unique names;
- TTL tags plus an independent janitor;
- test datasets that preserve scale characteristics without sensitive records;
- explicit approval for high-cost full-scale transfer tests.

Do not let automatic cleanup delete retained evidence or shared resources. Scope janitors to a dedicated environment and require test ownership tags.

## Set a Cadence by Risk

| Exposure | Suggested evidence cadence |
| --- | --- |
| Low-impact stateless service | static per change, target deploy quarterly |
| High-impact stateless service | static per change, target deploy weekly |
| Stateful service with daily backup | restore monthly, full cutover quarterly |
| Regulatory exit commitment | cadence derived from committed RTO and audit period |

Trigger an extra run after major Kubernetes, provider, database, identity, or controller upgrades.

## Official Documentation

- [Kubernetes API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [Kubernetes server-side dry run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes conformance tests](https://github.com/cncf/k8s-conformance)
- [Gateway API conformance](https://gateway-api.sigs.k8s.io/docs/concepts/conformance/)
- [Terraform test command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)

## Conclusion

Continuous portability testing converts an architectural option into dated evidence. Layer static checks, real target provisioning, workload contracts, restores, and evacuation rehearsals; expire claims when evidence grows stale. The target does not need to be identical to the source-it must satisfy the declared service contract within measured time and risk limits.
