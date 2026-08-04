# Build a Cloud Exit Runbook That Can Be Executed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Exit, Cloud Migration, Disaster Recovery, Dependency Mapping, Data Transfer, DNS Cutover, Operational Readiness

Description: Turn cloud exit intent into an executable runbook with owned inventory, dependency waves, target capacity, verified data transfer, DNS cutover, rollback, and evidence.

---

A cloud exit plan is not a statement that containers and Terraform exist. It is an ordered, owned procedure for rebuilding service capability, moving authoritative data, switching traffic, and retiring the source without losing control halfway through.

Build the runbook while the source platform is healthy. Store it and its essential credentials where the evacuation team can reach them if the source control plane is unavailable.

## Define the Scenario and Completion Test

An exit can mean contract termination, provider outage, regulatory relocation, acquisition consolidation, or cost-driven migration. Each gives different notice and source availability.

Start the runbook with assumptions:

```yaml
scenario: planned_provider_exit
source_available_during_move: true
target: azure/uksouth
decision_deadline: 2026-10-01
source_read_only_deadline: 2026-11-15
required_rpo: 5m
required_rto: 4h
completion:
  - production traffic served by target
  - no required runtime call to source
  - target backup and restore passed
  - source data disposition approved
```

Also maintain an impaired-source variant. A plan that requires source IAM, source CI, or a source-hosted password vault cannot handle source control-plane loss.

## Establish Command and Authority

Name roles rather than relying on whoever is online:

- executive decision owner;
- migration commander and deputy;
- application and data owners;
- source and target platform leads;
- network, DNS, identity, security, and compliance owners;
- communications and customer support owners;
- finance/procurement contact;
- independent go/no-go approver.

Record authority to approve spend, request quota, change DNS, pause writes, accept data loss within RPO, cross the rollback boundary, and destroy source data.

Use an independently reachable incident channel, document store, and contact list.

## Build a Reconciled Inventory

Combine cloud API inventory, billing exports, infrastructure state, CMDB/service catalog, DNS zones, certificate inventory, and runtime discovery. Provider discovery tools can collect assets and observed network connections, but no one source is complete. Scheduled jobs, dormant disaster paths, SaaS callbacks, and rarely used administrative integrations may not appear in a short traffic sample.

For every item capture:

```text
resource ID and type
business service and owner
environment and data classification
provisioning source or manual origin
upstream and downstream dependencies
state size and change rate
identity, key, and secret dependencies
target disposition: rebuild, replace, copy, retire
last verified evidence
```

Reconcile resources with cost records. An unowned resource that incurs cost may still serve production.

## Construct a Dependency Graph and Waves

Model dependencies as directional edges:

```text
checkout-api -> orders-db        hard, synchronous
checkout-api -> tax-api          hard, synchronous
checkout-api -> analytics-topic  soft, asynchronous
orders-db    -> kms-key           hard, decrypt
public-dns   -> target-gateway    cutover
```

Mark hard, soft, bootstrap, identity, data, and operational dependencies. Then create migration waves:

1. independent foundations: target organization, accounts, networking, identity, keys, registries;
2. shared platform: clusters, gateways, DNS automation, secrets, telemetry;
3. data systems and replication;
4. internal services ordered by hard dependencies;
5. public entry points and traffic;
6. source isolation, retention, and decommissioning.

Avoid circular bootstrap dependencies. Target CI should not need a source-only runner to repair the target after cutover.

## Prove Target Capacity and Quotas

Infrastructure code is not capacity. Before the event:

- request target service quotas;
- validate regional SKU and managed-service availability;
- reserve IP address space that does not overlap connected networks;
- confirm certificate, domain, and image access;
- run a peak-load test with target autoscaling limits;
- measure provisioning lead time for private circuits or dedicated capacity;
- identify substitute services for unavailable source capabilities.

Record exact target versions and the date they were checked. Managed service catalogs and quotas change.

## Plan Every Data Stream

For each dataset specify source, target, method, full-copy duration, incremental method, consistency point, checksum, encryption, owner, and rollback treatment.

Estimate the optimistic wire time:

```text
seconds = bytes * 8 / effective_bits_per_second
```

Use measured effective throughput after protocol, encryption, throttling, small-object overhead, and shared-link contention. A 40 TB dataset at a sustained effective payload throughput of 2 Gbit/s takes about 44 hours; a nominal 2 Gbit/s link will take longer. If the sustained source change rate exceeds the incremental path's apply capacity, replication lag grows and cannot converge until write volume drops or writes are paused.

Include:

- database schema, roles, extensions, sequences, and CDC position;
- current and historical object versions if required;
- queue backlog and in-flight messages;
- secrets and encryption-key access;
- audit and retention records;
- legal holds and deletion restrictions.

Run a target restore and compare content before approving the method.

## Prepare DNS and External Integrations

Inventory registrar access, authoritative DNS, DNSSEC, private zones, TTLs, certificates, WAF, IP allowlists, webhooks, payment callbacks, email records, and partner endpoints.

Before cutover:

1. make the target reachable on a test hostname;
2. issue and renew its certificate;
3. ask partners to allow target addresses or use stable names;
4. lower relevant TTLs early enough for old cached answers to expire;
5. verify target and source answers from multiple resolvers;
6. prepare exact forward and rollback record sets;
7. record long-lived connections that DNS will not move.

Traffic switching may require connection draining, client restarts, or broker consumer coordination beyond DNS.

## Write Gates, Commands, and Evidence

Every step needs:

```yaml
step: freeze-order-writes
owner: orders-lead
preconditions:
  - replication_lag_seconds < 10
  - background_jobs_disabled
action: enable application read-only mode
success:
  - write probe returns maintenance response
  - active writer sessions = 0
timeout: 10m
rollback: disable read-only mode
evidence: run/steps/freeze-order-writes.json
```

Prefer idempotent commands and scripts that display their target account, project, subscription, region, and resource before acting. Never put destructive cleanup in the same automatic phase as cutover.

## Define the Rollback Boundary

Before target writes begin, rollback may mean routing back to the still-authoritative source. After target-only writes begin, rollback requires returning those changes or accepting their loss.

State explicitly:

```text
Point of no return: target database promoted writable and first committed write accepted.
After this point: rollback requires validated reverse CDC or executive acceptance of stated data loss.
```

Use go/no-go gates for data catch-up, checksum validation, target health, security sign-off, support readiness, and business timing. Stop when a gate fails; do not improvise past it because a window is closing.

## Observe and Communicate the Cutover

Track technical and business measures:

- replication lag and last applied position;
- request success, latency, saturation, and dependency errors;
- order, payment, login, or telemetry counts;
- DNS answer distribution;
- queue age and dead-letter growth;
- target cost and quota consumption;
- customer support reports.

Publish timed status updates with the current phase, last successful gate, risk, next decision, and rollback availability.

## Decommission Deliberately

After the observation period:

1. deny new source writes and detect attempted use;
2. revoke source integrations and credentials in stages;
3. preserve required logs, backups, and legal evidence;
4. verify target backups and an independent restore;
5. obtain data-retention and deletion approval;
6. delete resources in reverse dependency order, removing dependents before their dependencies;
7. reconcile residual charges after billing data refreshes, and verify DNS, certificates, and inventories no longer reference the source resources;
8. retain a signed completion record.

Source deletion is a separate approved change, not an automatic consequence of successful DNS cutover.

## Official Documentation

- [AWS Transform discovery tool](https://docs.aws.amazon.com/transform/latest/userguide/discovery-tool.html)
- [AWS Application Discovery Service (existing customers only)](https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html)
- [Azure Migrate discovery methods](https://learn.microsoft.com/en-us/azure/migrate/discovery-methods-modes)
- [Azure Migrate dependency analysis](https://learn.microsoft.com/en-us/azure/migrate/concepts-dependency-visualization)
- [Google Migration Center discovery client](https://cloud.google.com/migration-center/docs/discovery-client-cli-overview)
- [Google Migration Center discovery data](https://cloud.google.com/migration-center/docs/discovery-client-data-and-security)
- [DNSSEC operational practices](https://www.rfc-editor.org/rfc/rfc6781.html)
- [PostgreSQL backup and restore](https://www.postgresql.org/docs/current/backup.html)

## Conclusion

An executable cloud exit runbook connects authority, inventory, dependency order, target capacity, data movement, DNS, rollback, and decommissioning. Give every step an owner, gate, timeout, and evidence record; rehearse it with real target infrastructure and restored data. The runbook is complete when the service can operate and recover without the source cloud.
