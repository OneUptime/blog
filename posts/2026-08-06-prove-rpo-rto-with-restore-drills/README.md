# Prove RPO and RTO with Restore Drills

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup and Restore, Disaster Recovery, Recovery Point Objective, Recovery Time Objective, Data Integrity, Operational Readiness, Business Continuity

Description: Measure data loss and service recovery with isolated restore drills, application validation, timed evidence, and owned remediation.

---

A successful backup job proves that a process wrote something. It does not prove that the right data, keys, configuration, application version, permissions, and dependent services can be assembled into a usable workload within the required time.

AWS defines Recovery Time Objective as the maximum acceptable delay between service interruption and restoration, and Recovery Point Objective as the maximum acceptable time since the last recovery point. It explicitly recommends periodic recovery tests that validate data usability and measure both objectives. NIST contingency guidance likewise calls for scheduled tests and periodic backup validation.

The operational rule is straightforward: do not claim an RPO or RTO from backup configuration. Claim only what a representative restore drill has demonstrated, with its scope and assumptions.

## Define the Business Recovery Outcome

Set objectives per workload or user journey, not per storage product. A database can finish restoring while the application remains unavailable because secrets, schemas, indexes, DNS, queues, or dependencies are not ready.

For each recovery scope, define:

- disruption that starts the RTO clock;
- maximum acceptable service interruption;
- maximum acceptable data-loss interval;
- minimum user journeys that must work;
- acceptable degraded mode;
- data-integrity and reconciliation requirements;
- regions, tenants, and dependencies in scope;
- decision owner and technical recovery owner.

Objectives are business decisions. Engineering selects backup and disaster-recovery mechanisms capable of meeting them.

Do not combine all data into the strictest objective without analysis. Orders, audit records, cache entries, generated reports, and rebuildable search indexes may have different recovery needs. Their dependencies must still form a consistent application state.

## Measure the Clock from the Right Events

For a drill that simulates interruption at `t_interrupt`, finds the latest usable recovered data at `t_recovery_point`, and makes the required user journeys available at `t_service_ready`:

```text
observed_data_loss_interval = t_interrupt - t_recovery_point
observed_recovery_time = t_service_ready - t_interrupt
```

If the latest recoverable committed order is timestamped 10:42 and interruption occurs at 10:47, the observed recovery-point gap is five minutes.

Do not start RTO when an operator clicks Restore if the stated objective starts at interruption. Detection, declaration, access, provisioning, restore, replay, validation, and traffic switching all consume the recovery window.

Do not stop RTO when the storage service reports completion. In an actual recovery, stop when the defined application journeys are validated and available to their intended users. In an isolated drill, exercise the equivalent traffic-switching path against test endpoints before stopping the drill clock. Record any production-only cutover step that was not exercised as an unmeasured assumption rather than including it in the demonstrated time.

Record clock source and skew. Prefer durable application sequence numbers or transaction markers alongside timestamps when ordering matters.

## Choose a Representative Failure Scenario

Different failures exercise different recovery mechanisms:

- accidental table or object deletion;
- logical corruption discovered after several hours;
- ransomware or compromised administrative credentials;
- lost zone or region;
- failed storage upgrade;
- unavailable primary account or control plane;
- lost encryption key access;
- application defect that wrote inconsistent state.

A replica can help with infrastructure failure but can copy deletion or corruption. A recent snapshot can restore data but may not recreate the application or network. Point-in-time recovery may meet RPO while log replay and validation miss RTO.

Create a scenario matrix and map each objective to a mechanism. Do not use one successful snapshot restore as evidence for every disaster.

## Restore into an Isolated Target

Avoid proving recovery by overwriting the current primary. Restore to a new, isolated environment with controls that prevent accidental production traffic, duplicate email, payment, webhook, or job execution.

The drill should use the real recovery path:

1. Declare the simulated interruption and start the clock.
2. Obtain recovery access using the documented responder identity.
3. Select the backup or point in time according to the runbook.
4. Provision network, compute, storage, identity, and configuration.
5. Restore data and required encryption-key access.
6. Deploy a compatible application and apply controlled recovery migrations.
7. Replay logs, queues, or change streams where required.
8. Reconcile cross-system state.
9. Run integrity and user-journey tests.
10. Exercise traffic switching against isolated test endpoints and record readiness without routing real users.
11. Destroy or retain the drill environment according to data policy.

Use masked or production backup data only under the same security, privacy, and retention controls as the source. Isolation is not an exemption from data protection.

## Validate More Than Row Counts

Test several layers:

### Backup and storage integrity

- expected backup objects and manifests exist;
- checksums or provider integrity checks succeed;
- decryption works with recovery identities;
- files, volumes, and database objects are readable.

### Data consistency

- schema and migration versions match the application;
- primary and foreign-key or domain invariants hold;
- transaction markers and sequence ranges are continuous where expected;
- sampled records match trusted source evidence;
- cross-service references reconcile;
- timestamps and latest durable business events meet RPO.

### Application usability

- critical read and write journeys complete;
- authentication and authorization work;
- background consumers, schedulers, and queues behave safely;
- observability and paging function in the recovery environment;
- performance is sufficient for the stated degraded or full service.

AWS identifies restoring without querying or retrieving data as an anti-pattern. A database accepting a connection is not proof that recovered data is complete, correct, or usable.

## Decompose RTO to Find the Constraint

Capture each phase:

| Phase | Start | End | Typical constraint |
| --- | --- | --- | --- |
| Detect and declare | Interruption | Recovery authorized | Alerting and decision authority |
| Access | Authorization | Recovery credentials ready | Break-glass process and identity dependency |
| Provision | Recovery begins | Infrastructure ready | Quotas, IaC, images, network, control plane |
| Restore | Data restore starts | Storage reports complete | Data volume and service throughput |
| Replay and reconcile | Restored data ready | Consistent recovery point | Logs, queues, conflicts, application logic |
| Validate | Application starts | Required journeys pass | Tests, indexes, caches, dependencies |
| Route | Validation complete | Service available | DNS, load balancer, certificates, communication |

The total, not the fastest phase, determines observed RTO. Automate repeatable steps, pre-stage slow immutable artifacts, and remove approval ambiguity. Then re-run the full drill rather than subtracting estimated savings.

## Prove the RPO from Application Evidence

Backup interval alone is not observed RPO. Scheduled backups can fail, logs can be incomplete, replication can lag, and corruption can force selection of an older clean point.

Before the drill, create controlled recovery markers through the application path:

```text
marker_id, accepted_at, durable_sequence, business_scope, expected_value
```

After restore, find the newest valid marker and reconcile later accepted operations. Measure the gap to the simulated interruption. For asynchronous journeys, distinguish request acceptance, durable queueing, processing, and final business completion.

If an operation was acknowledged but is absent after recovery, count it as data loss even if the backup service met its schedule.

## Include Dependencies and the Recovery Control Plane

Recovery often depends on systems not included in the data backup:

- infrastructure-as-code state and source repositories;
- artifact and container registries;
- DNS, certificates, secrets, and key management;
- identity provider and break-glass access;
- quotas and service-control policies;
- external providers and allowlists;
- configuration, feature flags, and schema tools;
- observability and incident communication.

Inventory which dependencies share the primary failure domain. Cache or escrow only what policy permits, with rotation and audit. Test access rather than assuming the recovery team can obtain it during a primary-account outage.

## Capture an Evidence Record

Store a drill record such as:

```yaml
drill_id: restore-orders-2026-07-18
scope: orders production dataset and critical application journeys
scenario: regional control-plane and primary-database loss
objectives:
  rpo_minutes: 5
  rto_minutes: 45
timestamps:
  interruption: 2026-07-18T09:00:00Z
  recovery_point: 2026-07-18T08:56:40Z
  service_ready: 2026-07-18T09:37:12Z
observed:
  data_loss_interval: 3m20s
  recovery_time: 37m12s
validation:
  storage_integrity: pass
  application_invariants: pass
  critical_journeys: pass
  monitoring: pass
findings:
  - id: DR-241
    severity: medium
    owner: identity-platform
    issue: break-glass token issuance took 11 minutes
```

Preserve logs, automation revisions, backup identifiers, test results, and participant roles. Restrict access because recovery evidence can reveal sensitive architecture and data locations.

## Set Frequency and Re-Test Triggers

Schedule drills according to consequence and rate of change. Also trigger a new drill after material changes to:

- data engine, schema, size, or growth rate;
- backup, retention, replication, or encryption;
- region, account, network, or identity architecture;
- recovery application artifact or migration process;
- RPO, RTO, or required user journeys;
- key dependency or provider;
- finding that invalidates previous evidence.

Rotate responders so knowledge is not concentrated. Include service, database, security, network, and business decision owners as the scenario requires.

Treat a missed objective as a finding with an owner, due date, and launch or operational consequence. Do not revise the objective to match the drill without a new business decision.

## Restore Readiness Checklist

- [ ] RPO and RTO belong to defined application journeys.
- [ ] Clock start, recovery point, and service-ready event are explicit.
- [ ] Scenario matches a credible data-loss or service-loss event.
- [ ] Restore uses isolated infrastructure and production-equivalent controls.
- [ ] Recovery identities, keys, artifacts, configuration, and dependencies are tested.
- [ ] Integrity checks include domain invariants and sampled application reads.
- [ ] Acknowledged business markers prove the observed RPO.
- [ ] RTO includes detection, access, provisioning, replay, validation, and routing.
- [ ] An unfamiliar qualified responder can execute the runbook.
- [ ] Findings are owned, gated, and retested.

## Official Documentation

- [AWS Well-Architected: Define Recovery Objectives for Downtime and Data Loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Well-Architected: Periodically Recover Data to Verify Backups](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html)
- [AWS Well-Architected: Test Disaster Recovery Implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/final)
- [NIST SP 1339: OT Backup Quick Start Guide](https://csrc.nist.gov/pubs/sp/1339/final)
- [Google Cloud Well-Architected: Test Recovery from Failures](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-failures)

## Conclusion

A backup becomes a recovery capability only after a full application restore proves it. Start the clock at interruption, recover into isolation, validate business data and user journeys, include keys and control-plane dependencies, and measure the latest usable recovery point. Record the evidence, fix the slow or missing steps, and repeat until the demonstrated result meets the business RPO and RTO.
