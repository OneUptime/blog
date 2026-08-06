# Is Your Team Ready for On-Call?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: On-Call, Incident Response, Escalation, Runbook, Production Readiness

Description: Prove sustainable coverage, responder competence, production access, escalation paths, and useful handoffs before starting on-call.

---

An on-call schedule proves that names fit into time slots. It does not prove that a responder can detect impact, access production, mitigate safely, or find help before users wait too long.

Treat on-call readiness as a property of the team and system, not a confidence vote on one engineer. The launch gate should cover staffing, training, alerts, runbooks, access, escalation, communication, and handoff under realistic failure conditions.

## Start with the Service Commitment

Define the response model from user and business requirements:

- supported services and explicit exclusions;
- coverage hours and time zones;
- incident severity definitions;
- target acknowledgement and escalation times;
- primary and secondary responsibilities;
- dependency and vendor escalation paths;
- authority to roll back, shed load, disable a feature, or declare an incident;
- communication expectations inside and outside business hours.

These are organizational policy decisions. Google SRE describes its own practices and targets, but those figures are not universal staffing requirements. Derive coverage from the service SLO, incident history, labor rules, and sustainable human load.

## Test Coverage, Not Just Calendar Occupancy

Build a coverage table that includes absence and escalation:

| Period | Primary | Secondary | Incident lead backup | Dependency contact | Coverage risk |
| --- | --- | --- | --- | --- | --- |
| Weekday day | named rotation | named rotation | duty manager | current directory | none open |
| Weekday night | named rotation | named rotation | duty manager | current directory | none open |
| Weekend | named rotation | named rotation | duty manager | current directory | verify vendor SLA |

Then simulate:

- primary does not acknowledge;
- primary is already handling another incident;
- secondary is unavailable;
- the incident crosses a shift boundary;
- a regional holiday removes multiple responders;
- the service owner and dependency owner disagree about escalation;
- the paging provider or identity provider is impaired.

Do not count a manager, specialist, or secondary as simultaneous coverage for several incompatible roles unless that contention has been accepted explicitly.

## Define Individual Readiness with Observable Skills

A responder is ready when they can demonstrate the work, not when they have read a document. A practical qualification can require the engineer to:

1. explain critical user journeys, dependencies, and failure domains;
2. navigate from a page to impact, dashboards, logs, traces, and recent changes;
3. use the incident process and assign roles;
4. execute one safe mitigation and verify its effect;
5. recognize when to stop debugging and escalate;
6. use normal and emergency access correctly;
7. communicate a concise status update;
8. produce a handoff with unresolved risks and next actions.

Use several learning modes:

- review architecture, SLOs, runbooks, and past postmortems;
- solve contained faults in a non-production environment;
- join game days using production monitoring and tools;
- shadow multiple experienced on-callers;
- act as primary while an experienced responder reverse-shadows;
- repeat exercises after major architecture or process changes.

Google SRE explicitly recommends concrete learning, realistic breakages, early shadowing, and avoiding a trial-by-fire first incident.

## Make Every Page Enter a Useful Workflow

Each paging alert should provide:

- the user-visible symptom and severity;
- the affected service, environment, and region;
- the firing value, threshold, and evaluation window;
- links to the first dashboard and runbook;
- a safe first action or diagnostic decision;
- conditions for escalation and rollback;
- ownership for the alert itself.

Run alerts in a non-paging or limited notification mode before admitting them to the rotation. Google SRE advises that pages be actionable and that each alert have a playbook entry. Measure expected and actual page volume, duplicates, false positives, acknowledgements, and time spent on follow-up.

An alert that says only `CPU high` transfers interpretation to a sleepy human. Prefer a symptom tied to user impact, then put CPU and other diagnostic signals in the linked dashboard.

## Validate Runbooks Under Pressure

A runbook should be executable by the qualified generalist on-call, not only by its author. During a game day, verify that it includes:

```text
purpose and expected user impact
prerequisites and required role
copyable commands with variables explained
read-only diagnosis before mutation
expected output at each decision point
stop conditions and dangerous actions
rollback or compensating action
verification query after mitigation
escalation target and communications link
last-tested date and owner
```

If a deterministic command sequence is run for every occurrence, automate it with guardrails. Keep the runbook focused on decisions that still require human judgment.

## Pre-Provision and Test Access

Incident response is the wrong time to discover that a responder cannot read logs, inspect a cluster, change traffic, or retrieve an approved secret.

Build an access matrix by action:

| Action | Normal role | Elevated role | Approval | Audit evidence |
| --- | --- | --- | --- | --- |
| Read metrics and logs | responder-read | none | pre-approved | identity and query logs |
| Inspect workload | service-operator | none | pre-approved | API audit log |
| Roll back release | release-responder | temporary | incident or change record | deployment event |
| Change data or IAM | no standing access | scoped emergency role | secondary approval | full session audit |

Use named identities, least privilege, short-lived elevation, and auditable sessions. AWS Well-Architected recommends pre-provisioned incident roles and temporary escalation rather than editing an existing user's permissions during an incident.

Maintain a break-glass path for failures of the normal identity system, but keep it narrow, monitored, and tested. A break-glass account that depends on the same unavailable identity provider is not an emergency path.

## Make Escalation a Normal Skill

Document triggers that cause escalation, such as:

- user impact crosses a severity boundary;
- a mitigation has not improved the SLI within a stated interval;
- data integrity, security, or safety may be affected;
- the responder lacks required access or domain knowledge;
- two high-severity incidents overlap;
- a dependency or vendor must act;
- the incident is likely to cross the shift boundary.

The interval is team policy and should reflect the service objective. Escalation should add capacity or authority, not transfer blame. Exercises should include a successful escalation so responders practice the communication path before an emergency.

## Standardize the Handoff

At shift change, the incoming responder should not reconstruct state from chat history. Use a structured handoff:

```markdown
## On-call handoff

- Current incidents and severity:
- User impact and latest SLI state:
- Mitigations active, including flags or degraded modes:
- Changes still rolling out:
- Alerts silenced and expiry time:
- Queues, capacity, or certificates to watch:
- Open vendor or dependency escalations:
- Temporary access granted and revocation time:
- Next action, owner, and deadline:
- Links to incident records, dashboards, and tickets:
```

Require the incoming responder to acknowledge the handoff. Make ongoing incidents a live transfer between people, not merely a posted document.

## Protect Rotation Health

Review the rotation as a production dependency. Track:

- pages per shift and simultaneous incidents;
- night interruptions and recovery time;
- false-positive and duplicate-page rate;
- acknowledgement and escalation delays;
- follow-up work completed;
- schedule gaps and last-minute overrides;
- runbook failures and access failures;
- responder feedback and burnout indicators.

When page load exceeds the team's agreed budget, fix alerts or service reliability. Adding people to an unhealthy rotation spreads the load but does not remove its cause.

## Launch Gate

Example evidence policy:

```yaml
on_call_gate:
  coverage_table_reviewed: true
  primary_and_secondary_test_page_passed: true
  qualified_responders: 8
  access_matrix_drilled: true
  identity_outage_path_drilled: true
  alerts_have_runbooks: true
  handoff_exercise_passed: true
  dependency_contacts_verified_at: 2026-08-04
  rotation_owner: sre-manager
```

The count of eight and every timing target are organization-specific policy, not Google or AWS requirements. Attach test results and roster evidence so the review remains auditable.

## Official Documentation

- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/) covers sustainable rotations, actionable alerts, playbooks, escalation, handoffs, shadowing, and practice exercises.
- [Google SRE Book: Accelerating SREs to On-Call and Beyond](https://sre.google/sre-book/accelerating-sre-on-call/) describes learning checklists, contained breakages, shadow shifts, reverse shadowing, and continuing education.
- [Google SRE Book: Being On-Call](https://sre.google/sre-book/being-on-call/) discusses staffing, escalation paths, incident load, and the need for sufficient follow-up time.
- [AWS Well-Architected: Pre-provision access](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_incident_response_pre_provision_access.html) documents dedicated incident roles, temporary elevation, monitoring, and periodic testing.
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/) documents least privilege, namespace-scoped permissions, avoidance of wildcard access, and periodic review.

## Conclusion

On-call readiness is demonstrated by a sustainable coverage model and responders who can use real alerts, tools, access, mitigations, escalation, and handoffs under pressure. Qualify with observed exercises, test both normal and emergency access, measure rotation health, and block launch when the system asks humans to compensate for missing operational design.
