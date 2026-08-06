# Make Operational Readiness Continuous

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Operational Readiness, Policy as Code, Service Catalog, OPA Gatekeeper, SRE

Description: Convert one-time review questions into owned service metadata, automated evidence, deployment policy, drift detection, and recurring drills.

---

A production readiness review captures service state at one point in time. The service changes the next day: owners move, dependencies appear, alerts drift, certificates age, access expands, runbooks become stale, and restore evidence expires.

Continuous operational readiness turns the review into a maintained control system. Keep service facts in an owned source of truth, generate evidence from tests and production, enforce a small set of high-confidence policies, detect drift, and route failures to people who can fix them.

## Decompose Every Review Question

Classify each readiness question by the strongest useful verification:

| Verification type | Example question | Better evidence |
| --- | --- | --- |
| Metadata | Who owns this service? | resolvable team reference in catalog |
| Static policy | Are production resources labeled and constrained? | schema, CI, or admission evaluation |
| Build test | Can old and new schema versions coexist? | compatibility test result tied to revisions |
| Runtime assertion | Are SLI data and paging paths healthy? | monitored telemetry freshness and test page |
| Scheduled exercise | Can backup data be restored? | dated restore-drill record with measured RPO and RTO |
| Human judgment | Is this degradation acceptable to users? | named approver and decision record |

Do not automate a subjective decision by checking that a document exists. Conversely, do not ask reviewers to re-read a fact that a deterministic test can prove on every change.

## Define a Service Readiness Contract

Store a machine-readable record with the service code or another versioned source of truth:

```yaml
apiVersion: ops.example.com/v1
kind: ServiceReadiness
metadata:
  name: checkout-api
spec:
  tier: critical
  lifecycle: production
  owner: team-checkout
  oncall: checkout-primary
  repository: https://git.example.com/commerce/checkout-api
  slos:
    - name: place-order-success
      target: "99.95"
      window: 30d
  dependencies:
    - service: pricing-api
      criticality: required
      owner: team-pricing
    - service: recommendations-api
      criticality: optional
      fallback: omit-recommendations
  operations:
    runbook: https://runbooks.example.com/checkout
    dashboard: https://monitoring.example.com/checkout
    rollback: https://runbooks.example.com/checkout/rollback
  evidence:
    restore_drill:
      required_max_age: 90d
      source: ci://checkout/restore-drill
    oncall_access_drill:
      required_max_age: 30d
      source: ops://drills/checkout-access
```

This is an example internal schema, not a Kubernetes, Backstage, Google SRE, or NIST standard. Version it deliberately. Validate references, allowed values, and evidence age. Protect fields such as owner and criticality from being changed solely to bypass policy.

A software catalog can provide discovery and ownership. Backstage documents source-controlled YAML entity descriptors with owner, lifecycle, system, links, labels, and annotations. Use its standard fields where they fit, and namespace organization-specific readiness annotations or attach a separate validated document rather than inventing semantics under reserved prefixes.

## Separate Claims from Evidence

`backups_enabled: true` is a claim. Useful evidence includes:

- exact backup policy and protected resources;
- last successful backup and independent failure alert;
- immutable or isolated storage control where required;
- latest restore drill, restored artifact, and invariant check;
- measured recovery point and recovery time;
- evidence timestamp, producer, and expiry.

Represent evidence as an immutable result tied to inputs:

```json
{
  "control": "restore-drill",
  "service": "checkout-api",
  "result": "pass",
  "observed_at": "2026-07-20T09:42:11Z",
  "expires_at": "2026-10-18T09:42:11Z",
  "application_revision": "sha256:abc123",
  "backup_policy_revision": "sha256:def456",
  "artifact": "ci://checkout/runs/18422"
}
```

This is an illustrative evidence envelope. Choose freshness from failure risk and change rate. A restore test should expire immediately when a material backup, encryption, database, or recovery-path change invalidates it, even if the calendar expiry is later.

## Put Fast Checks in the Change Path

Run low-latency deterministic checks in pull requests or continuous integration:

- metadata schema and resolvable owner;
- required SLO, runbook, dashboard, and escalation references;
- infrastructure policy tests;
- alert and dashboard query tests;
- database compatibility tests;
- image, dependency, and secret scanning;
- rollback artifact generation;
- policy unit tests, including expected allowed and denied fixtures.

Report a specific remediation at the point of failure. `Readiness score 72` is less useful than `production Deployment lacks an accountable owner label; add ops.example.com/owner or request exception X`.

Keep slow or destructive exercises, such as full restores and regional failover, on a scheduled or change-triggered path. Feed their dated results back into the same readiness view.

## Enforce Runtime Configuration Carefully

Kubernetes `ValidatingAdmissionPolicy` can block, audit, or warn about non-compliant API requests using CEL. A minimal example that requires an internal owner label on Deployments is:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-readiness-owner
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: >-
        has(object.metadata.labels) &&
        'ops.example.com/owner' in object.metadata.labels
      message: >-
        production Deployments require ops.example.com/owner
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-readiness-owner
spec:
  policyName: require-readiness-owner
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        ops.example.com/environment: production
```

The label, namespace convention, and decision to deny are example policy. Test the manifest on the exact supported Kubernetes version and confirm the namespace selector cannot be bypassed by ordinary workload owners.

Gatekeeper provides additional constraint templates, constraints, admission enforcement, shift-left evaluation, and audit of existing resources. Its documentation supports deny, warn, dry-run, and audit behavior. Start a new policy in observation mode, measure violations and false positives, fix existing resources, then enforce when the control and exception path are trustworthy.

## Design Policy Failure Behavior

For every automated control, decide:

- what happens if the policy engine is unavailable;
- whether failure should block or allow the change;
- how stale external data affects evaluation;
- which resources are exempt and why;
- how emergency changes proceed;
- how denied requests and policy errors are monitored;
- who owns policy code and rollback.

Fail-open and fail-closed both carry risk. A safety-critical privilege policy may need to fail closed. A malfunctioning non-critical metadata webhook that blocks every emergency update can increase outage impact. Base behavior on the protected invariant and test engine failure explicitly.

Do not let one central team silently deploy organization-wide denial policy without staged rollout and rollback. Policy code is production code.

## Make Exceptions First-Class and Temporary

An exception needs:

```yaml
control: require-restore-drill
service: checkout-api
scope: one launch
reason: target test environment unavailable
risk_owner: director-commerce
compensating_controls:
  - retain previous database and traffic rollback for 7d
expires: 2026-08-13T17:00:00Z
tracking_issue: RISK-882
```

This is example organization policy. Validate the approver against risk tier, alert before expiry, block renewal by silent date edits, and remove the exception automatically when its scope ends. Track exception count, age, recurrence, and controls most frequently waived.

An expired exception should not become permanent metadata. Decide whether expiry blocks the next change, pages an owner, or creates a tracked violation according to risk.

## Continuously Detect Drift

Evaluate both desired configuration and live state:

- catalog records without a valid owner or on-call target;
- services missing current SLI data;
- alerts with broken runbook or dashboard links;
- stale access, certificates, secrets, dependencies, and evidence;
- deployed resources that bypassed current CI policy;
- production configuration different from reviewed source;
- Gatekeeper or admission audit violations;
- temporary flags, silences, and exceptions past expiry.

Gatekeeper audit periodically evaluates existing resources against constraints, which helps detect resources created before a rule or admitted through another path. Monitor audit completion and result truncation, not just the current violation count.

Route drift to the owner with severity, remediation, and deadline. A dashboard of thousands of unowned violations is not a control system.

## Trigger Re-Review from Change Events

Do not repeat the full review for every commit. Map material changes to affected controls:

| Change event | Evidence to invalidate or rerun |
| --- | --- |
| New critical dependency | dependency owner, SLI, failure contract, capacity, escalation |
| Database or backup redesign | compatibility, restore drill, RPO and RTO evidence |
| New region | capacity, failover, data residency, on-call access |
| SLO change | alerts, dashboards, capacity, launch abort policy |
| Identity or secret model change | least privilege, rotation, audit, emergency access |
| New asynchronous pipeline | backlog SLI, idempotency, replay, recovery drill |
| Ownership change | catalog, on-call, access, escalation, exception approvers |

This keeps reviews risk-based while preventing unrelated checks from becoming release toil.

## Feed Incidents and Launches Back into Controls

After an incident or post-launch review, ask:

- Which control should have prevented, detected, or limited this outcome?
- Did the control not exist, use poor evidence, or fail in operation?
- Can a deterministic finding become a test or policy?
- Does service metadata need a new field or relationship?
- Should evidence expire sooner or rerun on a new change trigger?
- Did an exception or override contribute?

Automate recurring deterministic lessons. Preserve human review for context and tradeoffs that machines cannot establish.

## Measure the Readiness System

Useful program signals include:

- critical services with resolvable owner, SLO, on-call, runbook, and dependency data;
- evidence freshness by control and service tier;
- failed and overdue drills;
- policy false positives and emergency bypasses;
- time from violation to remediation;
- exception age and recurrence;
- incidents where a control was falsely green;
- repeated manual review findings that could be automated.

Avoid a single readiness percentage that lets many easy documentation checks hide one missing restore or access drill. Show hard-gate failures separately from advisory debt.

## Roll Out Continuous Readiness Incrementally

1. Define a small service metadata contract and assign owners.
2. Import existing facts and report missing or stale data without blocking.
3. Add CI checks with clear remediation and tested fixtures.
4. Schedule a few high-value drills and ingest their evidence.
5. Audit live configuration for drift.
6. Enforce only mature, high-confidence hard gates.
7. Add expiring exceptions and risk-tiered approval.
8. Review control performance after launches and incidents.

This sequence is a recommended implementation approach, not a requirement of the cited projects. The mature end state still needs people: owners choose acceptable risk, interpret ambiguous evidence, and improve the system.

## Official Documentation

- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/) explains launch checklists, standardization, automation, and maintaining reliable launch practices across services.
- [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/) documents source-controlled metadata files for discovering software and ownership.
- [Backstage catalog entity descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/) documents owner, lifecycle, system, links, labels, annotations, and namespacing behavior.
- [Kubernetes policies](https://kubernetes.io/docs/concepts/policy/) documents `ValidatingAdmissionPolicy` as a way to block, audit, and warn on non-compliant API requests.
- [Gatekeeper documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/) documents constraint-based validation, admission enforcement, shift-left use, and audit of existing resources.
- [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf) describes a risk-based, customizable, continuously improving set of practices and highlights automatability at scale.

## Conclusion

Continuous readiness replaces repeated questionnaire answers with maintained facts and expiring evidence. Put ownership and operational links in a versioned catalog, test deterministic controls in CI, stage admission policy carefully, audit live drift, schedule real drills, and invalidate evidence when material changes occur. Measure false-green controls and exception debt, not only pass rates.
