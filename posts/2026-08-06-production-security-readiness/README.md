# Production Security Readiness Before Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Production Security, Least Privilege, Secret Rotation, Audit Logging, Break Glass

Description: Prove least-privilege access, secret rotation, useful audit logs, and controlled emergency access before production launch.

---

Security readiness is not a statement that a design review happened. It is evidence that production identities are constrained, credentials can change without outage, important actions can be reconstructed, and responders can obtain controlled emergency access when normal systems fail.

Build these controls around the actual workload and data. A generic platform policy is useful, but it does not reveal that one new worker has wildcard storage access or that a vendor token cannot be rotated without restarting every instance.

## Establish Scope and Security Invariants

Before reviewing controls, record:

- data classifications and regulated or sensitive fields;
- trust boundaries and external entry points;
- human, workload, pipeline, and third-party identities;
- privileged operations and destructive data paths;
- encryption and key dependencies;
- expected security events and incident owners;
- availability requirements for identity, secrets, and logging systems.

Write invariants that can be tested, for example:

```text
only the order-writer workload can create orders
support staff cannot read full payment tokens
production deployments use a dedicated pipeline identity
all production permission changes are attributable to one identity
emergency access always generates an alert
application credentials can rotate without user-visible downtime
```

These invariants turn broad principles into reviewable permissions, tests, and log queries.

## Inventory Every Identity

Create an access matrix based on actions and resources:

| Identity | Required action | Resource scope | Conditions | Credential form |
| --- | --- | --- | --- | --- |
| checkout API | read catalog, create order | production catalog and order API | workload identity, production only | short-lived workload credential |
| deployment pipeline | update checkout workload | checkout namespace | protected branch and approved job | federated pipeline identity |
| on-call responder | inspect service and roll back | checkout production | named user, temporary elevation | short-lived session |
| analytics job | read approved projection | reporting dataset | scheduled workload identity | short-lived workload credential |
| support user | view masked order | support application | named user and case context | federated session |

Review both identity policies and resource policies. A narrow role can still receive broad access from a bucket, key, queue, or trust policy. Include cross-account and third-party trust.

## Prove Least Privilege

Least privilege means permitting the smallest action set on the smallest resource set under the required conditions. Evidence can include:

- a policy diff reviewed by the workload and security owners;
- a simulator or authorization test for required and forbidden actions;
- access analysis for public and cross-boundary paths;
- recent usage data used to remove unnecessary actions;
- a negative test showing one workload cannot access another workload's data;
- a lifecycle process that removes access when an owner, job, or vendor changes.

Avoid wildcard actions and resources unless the service API makes narrower scope impossible and the exception is documented. Bound what teams can delegate by using platform guardrails or permission boundaries where supported.

Do not give standing administrator access merely because an operator might need it during an incident. Separate routine read and rollback permissions from exceptional data or identity changes.

## Design the Complete Secret Lifecycle

For every secret, record:

```yaml
name: payments/provider-api
owner: team-payments
consumer: checkout-api
source: managed-secret-store
authentication_target: provider.example.com
rotation_method: provider-api-plus-secret-version
rotation_frequency: organization-policy-reference
maximum_cache_age: "5m"
last_successful_drill: 2026-07-22
revocation_runbook: https://runbooks.example.com/provider-key
```

This is an example internal record, not an AWS object. A complete rotation must update both the stored value and the credential at the database, API, or other target. Updating only the secret manager creates a value that the target does not accept.

Test this sequence:

1. create the new credential with only required permission;
2. publish or stage the new secret version;
3. prove all consumer versions can obtain and use it;
4. observe authentication failures and old-version use;
5. revoke the old credential;
6. verify the old credential fails and the service remains healthy;
7. record the actor, versions, and evidence.

Define cache refresh behavior and overlap explicitly. A workload that caches a secret for six hours cannot satisfy a ten-minute revocation objective without another mechanism.

Rotation frequency is risk policy, not a universal vendor number. Choose it from credential capability, exposure, detection time, provider limitations, and compliance requirements. Also support immediate rotation after suspected compromise.

Keep secrets out of source, images, command histories, environment dumps, traces, and logs. Scan for accidental disclosure, but do not treat scanning as permission control.

## Build Audit Logs for Questions You Must Answer

Start from investigation questions:

- who changed a production permission or trust policy;
- who read or changed a sensitive secret;
- which identity deployed a production revision;
- who activated a kill switch or break-glass role;
- what destructive data operation ran and against which resource;
- which requests were denied and why;
- whether an action came from a human, workload, or service acting on behalf of another identity.

For each event source, verify that logs contain:

- trustworthy actor and session identity;
- event time and observed time;
- action and result;
- resource and environment;
- source context appropriate to the threat model;
- request or change correlation identifier;
- enough detail for investigation without secret or sensitive payload leakage.

Centralize logs outside the workload's normal write authority, restrict access, protect integrity, define retention, and test queries. Monitor collection delay and dropped records. A logging checkbox is not useful if responders cannot retrieve events during an incident.

AWS CloudTrail Event history provides 90 days of management events by default in each Region. AWS documentation notes that an ongoing record and data events require a trail or event data store. Do not assume default event history covers every data access or your required retention.

## Alert on High-Risk Changes

Create high-confidence detections for events such as:

- use of an emergency role or root identity;
- creation of an access key or long-lived credential;
- broadening a public or cross-account policy;
- disabling or altering audit collection;
- repeated denied privileged operations;
- secret retrieval from an unexpected identity or location;
- changes to the incident, deployment, or security guardrails.

Send the alert through a path independent enough to survive the event it reports. Give it an owner, runbook, test event, and expected response. Avoid sending sensitive request content in notification payloads.

## Engineer Break-Glass Access

Emergency access is for declared failure modes, not a convenient bypass. AWS Well-Architected recommends a documented, pre-created, monitored, and periodically tested emergency process.

Define:

1. conditions that qualify as an emergency;
2. identities authorized to request access;
3. approval and secondary approval when the primary is unavailable;
4. exact role and resource scope;
5. strong authentication and credential custody;
6. maximum session duration;
7. automatic alerts on successful and failed use;
8. incident-record correlation;
9. revocation or credential rotation after use;
10. review of every action taken.

The path must avoid the dependency it is intended to recover. If normal access fails when the central identity provider is unavailable, the emergency path cannot require that same provider.

Use named identities rather than a shared account where the platform permits it. Pre-create the resources because control-plane APIs or eventual consistency may delay creation during an incident. Keep emergency permissions no broader than the recovery playbooks require.

## Drill Security Operations

Run tests with production-equivalent controls:

```text
required workload action succeeds
forbidden cross-service action is denied
deployment identity cannot read application data
secret rotates while old and new instances serve traffic
old secret is revoked and fails
audit event can be found by actor, resource, and change ID
logging destination rejects workload deletion attempts
identity provider outage triggers the emergency path
break-glass use alerts and appears in the incident record
temporary and emergency access is revoked after the drill
```

Do not expose real sensitive data solely to prove a control. Use a safe test resource and verify production policy structure through supported simulation, audit, or controlled exercises.

## Production Security Gate

```yaml
security_readiness_gate:
  identity_inventory_complete: true
  required_and_denied_actions_tested: true
  public_and_cross_account_access_reviewed: true
  secret_rotation_drill_passed: true
  old_secret_revocation_verified: true
  audit_queries_tested: true
  logging_retention_matches_policy: true
  break_glass_drill_passed: true
  emergency_access_alert_tested: true
  security_owner: product-security
```

This is example team policy. The evidence should point to dated test output, policies, log queries, and drill records. A control inherited from a platform still needs a test showing this workload uses it correctly.

## Official Documentation

- [NIST SP 800-53 Revision 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) provides customizable Access Control, Audit and Accountability, Identification and Authentication, and Incident Response control families.
- [AWS Well-Architected: Grant least privilege access](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_permissions_least_privileges.html) documents action, resource, and condition scoping plus regular permission reduction.
- [AWS Secrets Manager best practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html) covers secret storage, access limits, caching, rotation, monitoring, and network controls.
- [AWS Secrets Manager rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html) clarifies that rotation updates the credential in both Secrets Manager and the target database or service.
- [AWS Well-Architected: Configure service and application logging](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_detect_investigate_events_app_service_logging.html) documents source selection, retention, centralized retrieval, querying, and the limits of default CloudTrail Event history.
- [AWS Well-Architected: Establish emergency access process](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_permissions_emergency_process.html) documents break-glass failure modes, approvals, logging, credential rotation, and periodic tests.

## Conclusion

Production security readiness is proven through the real identity, credential, log, and emergency paths of the workload. Test required and forbidden access, rotate and revoke secrets without outage, retrieve audit evidence under responder permissions, and exercise an independently usable break-glass path. Launch only when these controls produce dated evidence.
