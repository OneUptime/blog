# How to Keep Disaster Recovery Runbooks Current as Infrastructure and Credentials Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Runbook, Documentation, Secret Management

Description: Keep recovery runbooks executable by tying reviews and tests to infrastructure, software, identity, and credential changes.

---

A runbook does not become stale merely because time passes. It becomes stale when the environment changes without the recovery procedure changing with it. New regions, rotated credentials, replaced certificate authorities, renamed queues, revised APIs, and upgraded database formats can invalidate a previously successful drill overnight.

NIST SP 800-184 treats recovery as a cycle of planning, testing, and continuous improvement. Make runbook currency an engineering control, not a calendar reminder alone.

## Give Every Runbook an Explicit Contract

Place machine-readable, organization-defined metadata at the top or beside the document:

~~~yaml
runbook_id: commerce-region-loss
owner: commerce-platform
approver: resilience-lead
scenario: primary-region-loss
critical_capability: accept-paid-order
tested_versions:
  application: 2026.08.4
  database: PostgreSQL 17
  kubernetes: "1.35"
infrastructure_revision: 8f2c91d
credential_paths:
  - vault://recovery/cloud-bootstrap
  - vault://recovery/database-restore
last_full_exercise: 2026-08-14
evidence: evidence://dr-2026-08-14-commerce
review_after: 2026-09-14
invalidating_changes:
  - recovery architecture
  - backup format or retention
  - identity, secret, CA, or DNS control
  - stateful engine major version
~~~

The schema and URI schemes above are illustrative. Define and validate how custom references such as `vault://` and `evidence://` resolve in your tooling; `vault://` is not a HashiCorp Vault CLI or API path.

The document should never contain live secret values. It should identify a secret path, required role, retrieval method, approval path, and a non-sensitive fingerprint or version that lets an operator confirm what was retrieved.

## Maintain a Runbook Dependency Manifest

Inventory everything the procedure assumes:

- source repository, release artifact, image, chart, and checksum;
- IaC state backend, provider, module, and CLI versions;
- cloud account, region, quota, global names, and network ranges;
- backup catalog, key management, engine version, and restore tooling;
- DNS registrar and authoritative-provider access;
- identity provider, emergency roles, hardware tokens, and approval contacts;
- certificate authorities and trust bundles;
- communication, ticketing, status, and evidence systems;
- external providers and their sandboxes or recovery contacts.

Monitor these dependencies. A runbook can be syntactically unchanged and operationally broken because an image disappeared or an emergency administrator left the company.

## Trigger Review from Changes

Map change events to targeted tests:

| Change | Required runbook action |
| --- | --- |
| IaC or network topology | Rebuild plan and dependency-order test |
| Database major version or backup format | Clean restore and integrity validation |
| Secret path, IAM policy, or emergency role | Access preflight using recovery identity |
| CA, certificate, hostname, or DNS provider | TLS and resolution checks from recovery site |
| Artifact registry or build pipeline | Pin and retrieve all recovery artifacts |
| New hard service dependency | Update graph, recovery wave, owner, and gate |
| RTO/RPO or degraded-mode change | Re-budget architecture and full acceptance test |
| Incident or failed drill | Correct procedure and verify the correction |

Wire these events into pull-request labels, service-catalog changes, infrastructure pipelines, or tickets. The runbook owner should receive a concrete review request containing the diff and affected assumptions.

Time-based review is still valuable for detecting organizational change and dependency expiration, but it is the safety net rather than the primary signal.

## Test in Layers

Frequent, narrow checks make full exercises more valuable:

### On every runbook change

- validate headings, metadata, links, commands, and referenced files;
- ensure owners and escalation targets resolve to active groups;
- reject secret-looking values;
- verify every destructive step has scope, approval, preview, and rollback guidance;
- check that placeholders are defined before use.

### On relevant infrastructure or credential change

- authenticate with the real recovery identity through the emergency path;
- list, decrypt, and stage a harmless recovery artifact;
- resolve recovery DNS from the target network;
- retrieve pinned images and tools;
- run read-only preflight commands.

### On a risk-based schedule

- restore representative data into isolation;
- rebuild a clean environment;
- execute a cold-reader walkthrough;
- run a full failover or failback exercise where justified.

Do not mark a runbook current because someone reread it. Record the strongest action actually performed.

## Design Credential Checks Safely

Credential validation is often postponed because access is sensitive. Use a bounded mechanism:

1. require a named approver or two-person workflow for privileged recovery roles;
2. issue short-lived credentials rather than copying long-lived keys;
3. test a harmless but representative action, such as describing a backup or creating a tagged disposable object;
4. verify access from the actual recovery network and runner;
5. log issuance and use without logging the credential;
6. revoke it and confirm revocation;
7. preserve evidence of subject, policy version, action, result, and time.

Test key availability as well as permissions. A backup encryption key located only behind the failed identity or network plane is not a recoverable dependency.

## Make Staleness Visible

Calculate status from evidence:

~~~text
CURRENT:
  no invalidating change after strongest required test
  owners and credentials pass preflight
  review_after is in the future

AT RISK:
  review due soon, test margin shrinking, or unclassified dependency change

STALE:
  invalidating change is newer than evidence, review expired,
  owner missing, or any required preflight fails
~~~

Show this status in the service catalog and alert the accountable owner. Do not hide a stale runbook behind an overall “documentation coverage” percentage.

## Write Procedures That Survive Rotation

Prefer stable discovery over copied identifiers when discovery itself is independently recoverable. For example, a hypothetical organization-specific recovery wrapper might expose a preflight like this:

~~~bash
# The runbook defines RECOVERY_RUN_ID and TARGET_ACCOUNT first.
recoveryctl preflight \
  --run-id "$RECOVERY_RUN_ID" \
  --account "$TARGET_ACCOUNT" \
  --read-only
~~~

The runbook must state the expected account, non-sensitive identity, output, failure interpretation, and escalation. Avoid “choose the latest backup” or “use the usual admin role”; those instructions are ambiguous precisely when normal context is unavailable.

Keep previous reviewed versions and their evidence. During a rollback or restoration of an older application, the matching older recovery procedure may be needed.

## Acceptance Criteria

A runbook is current when:

- its owner, scenario, versions, objectives, dependencies, evidence, and expiry are explicit;
- infrastructure and identity changes automatically request the right review;
- no live secret is embedded, but emergency retrieval is exercised;
- pinned artifacts and tools remain accessible from the recovery site;
- read-only preflights run under the actual recovery identity and network;
- the strongest required test is newer than every invalidating change;
- failed checks make status visibly stale and create owned work;
- the latest isolated exercise passed business acceptance and produced reproducible evidence.

Current documentation is a result of change detection plus execution evidence, not a recently edited date.

## Official References

- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [CISA: Cybersecurity Tabletop Exercise Package documents](https://www.cisa.gov/resources-tools/resources/ctep-package-documents)
- [Kubernetes: kubeadm certificate management](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/)
- [HashiCorp Vault: Database secrets engine](https://developer.hashicorp.com/vault/docs/secrets/databases)
