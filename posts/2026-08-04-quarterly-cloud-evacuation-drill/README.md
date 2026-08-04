# Run a Quarterly Cloud Evacuation Drill

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Evacuation, Disaster Recovery, Backup and Restore, Kubernetes, Infrastructure as Code, Container Image, Operational Readiness

Description: Prove every quarter that backups restore, images pull, IaC rebuilds, identities work, and operators can execute the cloud exit runbook within measured objectives.

---

A quarterly cloud evacuation drill is not a meeting that reviews the runbook. It is a controlled recovery exercise that creates a target environment, restores real artifacts and approved data, runs the service contract, and records what prevented independence from the source cloud.

The drill can avoid production traffic while still proving the difficult paths. Use an isolated target, nonproduction DNS, sanitized or access-controlled backup data, and explicit cleanup approval.

## Set a Bounded Scenario

Choose one failure assumption per drill:

```yaml
scenario: source_control_plane_unavailable
source_data_plane_readable: true
target: gke/europe-west1
workloads: [status-api, incident-api]
traffic: synthetic
data_recovery_point: latest_approved_backup
rpo_target: 24h
rto_target: 8h
source_services_denied_during_validation:
  - ci
  - container_registry
  - secret_manager
  - telemetry_backend
```

Rotate scenarios: source registry loss, identity lockout, region loss, corrupt latest backup, DNS authority migration, or full provider exit. Do not imply one exercise covers every disaster.

## Assign Drill Roles

Name:

- exercise director and safety officer;
- migration commander;
- platform, network, identity, data, and application operators;
- observers and evidence recorder;
- business acceptance owner;
- cleanup approver.

The safety officer can stop actions that approach production or exceed cost/data scope. Operators should use the runbook; observers record ambiguous steps and undocumented knowledge.

## Freeze Inputs and Start the Clock

At the declared start time, record:

- source revisions for IaC, application, and runbook;
- exact image digests and architectures;
- backup identifiers, creation times, and checksums;
- target account/project/subscription and region;
- current RPO and RTO objectives;
- approved source services still available;
- participants and authority.

Use immutable artifacts from the normal release process. Editing IaC during the drill may be necessary, but record the change and feed it back through review afterward.

## Prove the Backups

For every stateful component:

1. locate the backup without relying on the failed source control plane;
2. retrieve required encryption keys or exercise the documented re-encryption path;
3. restore into new target storage;
4. record start, end, bytes, and errors;
5. verify schema, counts, checksums, versions, and ownership;
6. start the application in read-only or isolated mode;
7. run business-level data checks.

A Kubernetes resource backup is not automatically an application-consistent database backup. CSI snapshots remain tied to their storage drivers unless data movement is configured. Velero's file-system backup can be storage-independent, but its documentation lists consistency, privilege, and performance limitations; evaluate the selected version and method.

Include a recovery point older than the newest copy in some drills. This tests point-in-time selection for corruption or ransomware rather than simply retrieving the latest replicated damage.

## Prove Container Image Independence

Tags can move; digests identify immutable image content. Keep a bill of materials:

```yaml
images:
  - source: source.example.com/status/api@sha256:...
    target: target.example.com/status/api@sha256:...
    platforms: [linux/amd64, linux/arm64]
    signature_policy: production
```

Mirror or restore images and OCI artifacts into a target-accessible registry before deployment. Verify:

- every required platform manifest and layer is present;
- image signatures, attestations, and SBOMs remain discoverable or are recreated under policy;
- target nodes can authenticate and pull;
- admission policy accepts the target reference;
- deployments use digests, not mutable tags;
- the source registry is blocked during the final pull and restart test.

ORAS documents backup and restore workflows for OCI images and artifacts. Test the exact registry products because referrers, signatures, and cross-repository mounts can behave differently.

## Bootstrap Infrastructure from Empty State

Create the environment using approved IaC and an independent runner:

```text
organization/project foundation
network and connectivity
identity and key access
cluster or runtime
storage and data services
Gateway/DNS/certificates
telemetry and alerts
workloads
```

Do not precreate a missing resource by console merely to keep the clock green. Record the blocker, apply an approved break-glass repair if safe, and later codify it.

Verify service quotas and capacity. A successful Terraform plan does not reserve instances, IPs, managed database capacity, or load balancers.

Use separate state from production. Scope any cleanup automation to the drill account and run ID.

## Prove Identity and Secrets

The target must authenticate without source credentials:

- CI/CD or recovery runner federates to the target;
- Kubernetes ServiceAccounts map to target workload identities;
- target-native policies allow intended and deny neighboring resources;
- external API credentials work from target addresses;
- secret versions can rotate;
- backup decryption works with independently available keys;
- break-glass access is audited.

Block access to the source secret manager for the final application restart. A copied environment variable can hide a missing rotation or retrieval path, so rotate a disposable credential during the drill.

## Prove Networking, DNS, and TLS

Use a drill hostname to exercise the complete path:

1. provision target edge and wait for controller status;
2. issue a target certificate through the normal validation flow;
3. publish test DNS with representative TTL and routing;
4. validate from outside both providers;
5. test private service discovery and egress policy;
6. run connection draining and record-switch rollback;
7. identify partners or IP allowlists that would block production cutover.

Do not modify production registrar, DNS, or certificates unless the explicitly approved scenario requires it.

## Prove Operations Without the Source

Generate known conditions:

- successful request and business transaction;
- application error;
- high latency and saturation;
- failed Pod or instance;
- denied cloud permission;
- message redelivery or dead-letter event;
- backup of the restored target and a second small restore.

Confirm target logs, metrics, traces, dashboards, alerts, and incident routing. Ensure responders can access them through independent identity.

Run the service's functional, security, and production-shaped load suites. A healthy homepage is not recovery evidence.

## Record RPO, RTO, and Manual Work

Calculate:

```text
observed RPO = drill start time - newest recovered committed change
observed RTO = acceptance-test pass time - drill start time
```

Also record:

- time by phase and critical path;
- commands requiring modification;
- source dependencies discovered;
- quota and capacity delays;
- data discrepancies;
- person-specific knowledge;
- target cost and leaked resources;
- rollback outcome.

Pause the clock only under rules defined before the drill. Otherwise RTO comparisons become meaningless.

## Grade Evidence, Not Participation

| Result | Meaning |
| --- | --- |
| Passed | service contract met within RPO/RTO and cleanup verified |
| Passed with exception | objective met, but a bounded risk needs an owner |
| Failed | objective missed or required capability absent |
| Invalid | safety, data, or environment error made evidence unusable |

Create remediation items with owners and dates. Retest critical blockers as soon as fixed rather than waiting for the next quarter.

## Clean Up Under Separate Approval

After evidence is preserved:

1. stop target traffic and writers;
2. retain artifacts required for audit;
3. delete drill data according to classification policy;
4. revoke temporary identities and third-party allowlists;
5. destroy only resources tagged to the explicit drill scope;
6. verify billing and cloud inventory are clean;
7. close cleanup through a second-person review.

Never make source deletion part of a nonproduction drill.

## Improve the Next Quarter

Update runbooks, IaC, tests, inventories, ownership, and scorecards from observed evidence. Change the next scenario to cover a different shared dependency. Track RTO trend and the age of the last successful restore per workload.

The drill is valuable when it changes the system. Repeating a scripted happy path without new failure assumptions can create confidence without coverage.

## Official Documentation

- [AWS Well-Architected guidance to test disaster recovery](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_dr_tested.html)
- [AWS disaster recovery options](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [Azure reliability documentation](https://learn.microsoft.com/en-us/azure/reliability/)
- [Google Cloud disaster recovery planning guide](https://cloud.google.com/architecture/dr-scenarios-planning-guide)
- [NIST contingency planning guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [Kubernetes container images and digests](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Velero backup and restore overview](https://velero.io/docs/)
- [ORAS backup and restore](https://oras.land/docs/how_to_guides/backup-restore/)

## Conclusion

A quarterly evacuation drill proves more than backup creation. It demonstrates independent artifact access, target provisioning, data restoration, identity, DNS, TLS, telemetry, load, and operator execution within measured RPO and RTO. Keep the exercise isolated and reversible, preserve evidence, clean up under separate approval, and turn every discovered source dependency into owned remediation.
