# How to Automate a Disaster Recovery Runbook Without Creating a Dangerous One-Click Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Runbook, Automation, Security

Description: Automate recovery as an auditable state machine with fencing, policy gates, scoped approvals, and safe retry behavior.

---

Automation reduces transcription errors and recovery time, but it also makes the wrong action fast and repeatable. A single button that promotes a database, enables writes, changes routing, and suppresses alerts can turn uncertainty into data loss or split-brain.

Automate deterministic mechanics. Keep high-consequence decisions behind evidence-backed gates.

## Use a State Machine, Not a Long Script

A recovery workflow should persist state and make every transition explicit:

~~~text
PREPARED
  -> PREFLIGHT_PASSED
  -> OLD_WRITERS_FENCED
  -> DATA_RECOVERED_READ_ONLY
  -> INTEGRITY_VALIDATED
  -> APPLICATION_VALIDATED
  -> NEW_WRITES_ENABLED
  -> TRAFFIC_SHIFTED
  -> STABILIZED
~~~

Failure transitions go to PAUSED_SAFE, RECONCILIATION_REQUIRED, or ROLLBACK_REQUIRED, not blindly to the next command. Use RECONCILIATION_REQUIRED when a provider outcome is unknown, such as after a timeout during an asynchronous mutation; do not call the state safe until re-observation proves it. Store the workflow state outside the failure domain being recovered.

Each transition needs:

- immutable run, scenario, source, target, and recovery-point IDs;
- current observed state and freshness;
- policy evaluation;
- required approver role;
- idempotency key;
- bounded timeout and retry policy;
- success evidence;
- compensation or safe-stop behavior;
- audit event.

## Separate Observation, Proposal, and Mutation

Use three phases:

1. **Observe:** query health, replication, backup, identity, quota, DNS, and current routing.
2. **Propose:** calculate exact mutations and predicted consequences; render a human-readable plan.
3. **Execute:** apply only the approved plan if preconditions still match.

Bind approval to a plan digest and short expiry. If source state, target state, recovery point, replication position, or routing changes, invalidate approval and generate a new proposal.

~~~yaml
proposal:
  run_id: dr-2026-09-02-01
  source: region-a
  target: region-b
  recovery_point: backup-4812
  expected_data_loss_seconds: 37
  actions_digest: sha256:example
  expires_at: 2026-09-02T01:10:00Z
approval:
  required_roles: [incident-commander, data-owner]
  separation_of_duties: true
~~~

## Make Fencing a Hard Gate

Before a second site can accept writes, prove that the old site cannot. Possible mechanisms are workload-specific and must block both existing and new write paths:

- revoke or narrow writer credentials and terminate existing sessions authorized to write;
- disable old-site write listeners and terminate existing write-capable connections;
- enforce a database epoch or fencing token;
- remove quorum participation;
- isolate every write-capable network path;
- shut down old writers when authority over them remains.

Loss of visibility is not proof of shutdown. If fencing cannot be proven, the workflow should stop. A business risk decision can select a non-writing recovery mode, but approval alone must not substitute for data-plane fencing before a second site accepts writes.

## Design Safe Retries

Every action must declare whether it is:

- read-only and freely repeatable;
- idempotent with the same key;
- resumable from an operation ID;
- compensatable;
- irreversible and never automatically retried.

~~~text
create_target(run_id)        idempotent: return existing exact run target
restore(recovery_point, run_id) resumable: idempotent start; persist and poll operation ID
validate_integrity()         repeatable read-only
enable_writes(epoch)         conditional compare-and-set
shift_traffic(plan_digest)   conditional; verify resulting routing
delete_target(target_id)     irreversible; separate approval
~~~

For an asynchronous operation, make the start request idempotent or reconcile by the run ID before starting it again. A timeout can mean that the provider accepted the first request even if no operation ID was recorded.

Do not implement retry by rerunning the entire workflow. That can create duplicate targets, repeat migrations, or reverse a successful traffic change.

## Add Safety Rules Around Routing

Amazon Application Recovery Controller (ARC) documents assertion rules that can require at least one routing control to remain on, and gating rules that can prevent a set of changes unless a separate control permits them. The general pattern is valuable beyond AWS:

- never leave every routing destination disabled accidentally;
- never enable two single-writer sites;
- require application acceptance before traffic enablement;
- cap traffic changes in stages;
- keep an independent master inhibit switch;
- make any break-glass override explicit, short-lived, and audited.

The system that enforces safety should not depend solely on the application control plane being recovered.

## Keep Humans at the Right Gates

Human approval is valuable for interpreting ambiguous business risk, not for clicking through hundreds of deterministic actions.

Require scoped approval for:

- declaring the scenario and accepting estimated data loss;
- choosing a recovery point after corruption;
- reviewing independent old-writer fencing evidence when automation cannot establish it; approval alone is not proof;
- enabling writes;
- external traffic shift;
- overriding a safety rule;
- destructive cleanup and failback.

Use two-person approval where one mistake can create unreconcilable writes. Approvers should see evidence and consequences, not only a green button.

## Make Automation Fail Safe

On controller crash, timeout, lost lease, or conflicting operator:

- stop issuing new mutations;
- before write enablement, keep the target isolated or read-only;
- preserve current operation IDs and evidence;
- revoke unused temporary credentials;
- alert with current and last confirmed state;
- require reconciliation before resume.

Use a workflow lease to coordinate controllers, but do not rely on it for mutual exclusion: make workflow-state transitions conditional and require mutations to reject stale workflow generations. A lease is not data fencing.

Do not make rollback automatic after writes have started. Reversing traffic without reconciling newly committed data can be worse than remaining on the recovery site.

## Test the Controller as a Faulty Distributed System

Exercise:

- duplicate button presses and API deliveries;
- controller restart after every transition;
- stale approval and changed recovery point;
- timeout followed by late provider success;
- partial regional API failure;
- operator and automation racing;
- lost audit sink;
- failed fencing;
- safety-rule rejection;
- failed validation after data restore;
- break-glass override and revocation.

Run in isolation first. AWS Well-Architected reliability guidance recommends controlled failure testing with guardrails and stop conditions.

## Acceptance Criteria

Recovery automation is safe when:

- state and evidence survive controller failure;
- observation, proposal, approval, and mutation are distinct;
- approval is bound to exact inputs, actions, and expiry;
- write enablement cannot occur without proven fencing and integrity validation;
- every mutation has defined retry and compensation semantics;
- concurrent controllers and duplicate requests cannot duplicate action;
- routing safety rules prevent all-destinations-disabled states, and write-authority gates prevent dual-writer states;
- a no-new-mutations pause and reconciliation are the default for uncertainty;
- break-glass use is explicit and audited;
- fault-injection tests demonstrate resume, stop, and reconciliation behavior.

The goal is not zero human involvement. It is a recovery system in which machines perform repeatable work and humans make the few decisions that genuinely require judgment.

## Official References

- [Amazon Application Recovery Controller: Safety rules for routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.safety-rules.html)
- [AWS Well-Architected Framework: Automate recovery](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_auto_recovery.html)
- [AWS Well-Architected Framework: Test resiliency using chaos engineering](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_failure_injection_resiliency.html)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
