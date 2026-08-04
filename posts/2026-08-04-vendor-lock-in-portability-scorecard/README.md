# Measure Vendor Lock-In with a Portability Scorecard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vendor Lock-In, Cloud Portability, Architecture Review, Managed Services, Risk Management, FinOps, Platform Engineering

Description: Score managed-service portability with evidence across interfaces, data, identity, operations, economics, and tested migration instead of debating lock-in as a binary label.

---

Every useful platform dependency creates some switching cost. Calling all of it lock-in hides the difference between a replaceable API client and a petabyte data platform with proprietary semantics.

A portability scorecard makes the cost visible. It should support a decision, not produce a universal grade. Score one service in one workload against a named target and time horizon.

## Define Scope Before Scoring

Record:

```yaml
workload: risk-events
dependency: managed-streaming-service
source: provider/service/tier/region
target: named-alternative/service/region
horizon: 36m
required_migration_window: 14d
required_rpo: 5m
evidence_date: 2026-08-04
owner: risk-platform
```

Changing the target can change the score. A managed PostgreSQL service may be relatively portable to another PostgreSQL service and much less portable to a distributed SQL product with a similar wire protocol.

## Use an Evidence Scale

Score each dimension from 0 to 4:

| Score | Meaning |
| ---: | --- |
| 0 | No dependency or trivially replaceable |
| 1 | Standard path tested; small target adapter |
| 2 | Known differences; bounded engineering and data work |
| 3 | Major rewrite, long transfer, or substantial operational change |
| 4 | No acceptable target or migration path demonstrated |

`Unknown` is not zero. Track it separately and treat it as high risk until evidence exists.

Require a link to code, documentation, inventory, benchmark, restore report, or rehearsal result for every score.

## Score Eight Dimensions

### 1. Application interface

Ask:

- Is the protocol an open, stable standard?
- Does the application use a provider SDK or proprietary event shape directly?
- Are semantics covered by a narrow adapter and contract suite?
- Does the target implement every required operation?

S3 API support or a PostgreSQL wire protocol lowers entry cost, but documented differences, extensions, and operational APIs remain.

### 2. Data and state

Measure:

- current bytes, versions, and daily growth;
- portable export format and restore support;
- full-copy and incremental throughput;
- schema, extension, metadata, and retention fidelity;
- encryption-key portability;
- measured RPO and RTO.

Data gravity is often the dominant dimension. A standard API does not reduce the hours needed to move hundreds of terabytes.

### 3. Identity and security

Inventory:

- workload and human identity dependencies;
- IAM roles, conditions, resource hierarchy, and deny rules;
- private endpoints and network controls;
- key-management and secret-manager integration;
- audit logs and evidence retention;
- target least-privilege implementation.

OIDC federation can reduce long-lived credential coupling, but provider IAM policy remains native.

### 4. Runtime and infrastructure

Check:

- artifact format and CPU architecture;
- provider metadata or sidecar dependencies;
- infrastructure module availability;
- quotas, regions, and capacity;
- load balancer, CSI, CNI, and DNS integration;
- target performance at production load.

An OCI image is portable as an artifact; its surrounding service may not be.

### 5. Operations

Compare:

- deployment, upgrade, and rollback;
- backup, restore, failover, and scaling;
- telemetry, dashboards, alerts, and audit;
- incident access and support procedures;
- team skill and on-call readiness;
- operational API automation.

Managed automation creates real value and real replacement work. Count both.

### 6. Availability and consistency semantics

Document:

- failure domains and replication;
- ordering, delivery, and transaction guarantees;
- consistency of reads, lists, and configuration;
- failover and split-brain behavior;
- target SLO and measured performance.

Similar product categories can have incompatible guarantees even when basic CRUD operations match.

### 7. Economics and contract

Include:

- recurring egress and migration transfer charges;
- target ingestion, request, and temporary dual-run cost;
- license portability and data-format rights;
- minimum commitments and termination notice;
- support for bulk export and commercial exit programs;
- engineering opportunity cost.

Use current official price pages and negotiated contract terms. Do not bake a public list price permanently into the score.

### 8. Migration evidence

This dimension measures reality:

- no plan or owner: 4;
- written plan with untested assumptions: 3;
- target prototype and sample data: 2;
- production-shaped restore and application tests: 1;
- recent full rehearsal inside required window: 0.

Evidence ages. Increase or invalidate the score after a major version change or when the test exceeds its freshness policy.

## Weight by Business Exposure

Not every dimension matters equally. Use weights totaling 100 for the workload:

| Dimension | Example weight |
| --- | ---: |
| Application interface | 10 |
| Data and state | 25 |
| Identity and security | 10 |
| Runtime and infrastructure | 10 |
| Operations | 10 |
| Availability and semantics | 15 |
| Economics and contract | 5 |
| Migration evidence | 15 |

Calculate:

```text
weighted lock-in score = sum(score * weight) / (4 * sum(weights)) * 100
```

The result is a relative risk indicator, not a probability or migration-duration forecast. Keep the underlying rows visible.

## Add Hard Gates

Averages can conceal blockers. Mark a service `exit blocked` regardless of total score when:

- required data cannot be exported in a usable form;
- the target cannot meet a legal or security requirement;
- no key path can decrypt exported data;
- target capacity or region is unavailable;
- required semantics have no accepted replacement;
- measured transfer cannot fit the deadline;
- licensing forbids the intended deployment.

Likewise, a high score can be accepted when provider advantage is valuable and the business consciously owns the risk.

## Show Value Beside Switching Cost

Add a benefit column:

```text
managed operations saved per quarter
reliability capability gained
time-to-market advantage
performance or product differentiation
cost avoided relative to self-operation
```

The decision is not `low score wins`. A proprietary managed service with major product value can be correct. The score ensures the exit consequence is explicit and reviewed by the right owner.

## Turn Findings into Actions

Map score drivers to bounded work:

| Finding | Action |
| --- | --- |
| Provider event objects reach domain code | add neutral envelope and adapter |
| Only provider snapshots exist | schedule portable export and restore test |
| Static service-account key | implement workload identity federation |
| Target module missing | build provider-specific implementation contract |
| Egress duration unknown | benchmark transfer and delta catch-up |
| Dashboard queries proprietary | stabilize OTel ingest and export alert definitions |

Re-score after evidence lands. Avoid vague remediation such as `be more cloud agnostic`.

## Review at the Right Events

Run the scorecard:

- before adopting a managed service;
- before enabling a proprietary extension or global feature;
- at major version upgrades;
- when data size or change rate crosses a threshold;
- after pricing or contract changes;
- after a failed portability drill;
- at least annually for high-impact dependencies.

Keep scores in the service catalog with owner and expiration date.

## Official Documentation

- [CNCF Kubernetes conformance](https://www.cncf.io/training/certification/software-conformance/)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [Google Cloud Storage differences from Amazon S3](https://cloud.google.com/storage/docs/migrating)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [OpenTelemetry vendor support specification](https://opentelemetry.io/docs/specs/otel/vendors/)
- [AWS global network data transfer FAQ](https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/)
- [Azure bandwidth pricing](https://azure.microsoft.com/en-us/pricing/details/bandwidth/)

## Conclusion

Vendor lock-in is a portfolio of switching costs, not a yes-or-no property. Score a named dependency and target across interfaces, data, identity, runtime, operations, semantics, economics, and recent migration evidence; preserve blockers and benefits alongside the total. The useful output is an owned action and risk decision, not a flattering number.
