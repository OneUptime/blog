# How to Route Incidents with Missing, Stale, or Ambiguous Service Ownership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, On-Call, SRE

Description: Keep incidents owned when service metadata is incomplete by using a durable fallback, validating candidate teams, and requiring acknowledged routing transfers.

An alert names a service that disappeared from the catalog. Another names a team that was reorganized last month. A third could belong to either the application team or the platform team. Routing automation has a mapping problem, but customers still have an outage.

Separate immediate incident ownership from repairing permanent service ownership. Assign a current responder to keep the incident moving, use evidence to find the right specialists, and transfer responsibility only after someone accepts it.

The workflow here is proposed operating practice. Product documentation supplies the catalog and paging semantics; it does not decide which team in your organization should own an ambiguous outage.

## Establish a Fallback That Can Actually Respond

Define an explicit route for missing, conflicting, or unreachable ownership. This might be a staffed platform triage rotation or a designated duty manager. Give that fallback a mandate to coordinate response and recruit experts, even when it cannot fix the service itself.

Test the fallback's paging path and access to the incident record. A generic chat room with no acknowledgment requirement is an announcement destination, not evidence that someone has accepted the work.

For example, PagerDuty escalation policies notify successive rules until someone acknowledges. An acknowledgment stops escalation under that policy, so the acknowledgment needs to mean that the responder is taking responsibility for the next step. [PagerDuty escalation policy semantics](https://support.pagerduty.com/main/docs/escalation-policies)

If the owner acknowledges and then discovers a mismatch, explicitly engage the fallback or next team. Do not assume the original escalation sequence will continue searching automatically.

## Validate Identity Before Resolving Ownership

Normalize the alert into a service identity with enough scope to avoid false matches:

```text
service: checkout
environment: production
account or project: commerce-prod
region and cell: eu-west / cell-3
workload identity: deployment UID or cloud resource ID
observed release: sha256:... artifact identifier
catalog lookup result: component:commerce/checkout
ownership state: conflict; catalog and runtime annotation disagree
temporary incident owner: platform-triage
```

Names alone are often reused across environments or teams. A Kubernetes workload label, trace resource attribute, and repository name may describe different layers. Preserve the original alert fields alongside the normalized identity so a routing mistake can be investigated later.

Do not overwrite missing ownership with the nearest string match. Classify lookup outcomes explicitly: missing entity, multiple matches, stale team reference, empty schedule, rejected ownership, or unreachable paging route.

## Use Catalog Data as Evidence with Known Semantics

Backstage documents `spec.owner` as a component ownership reference, and advises consumers to use generated relations as the authoritative catalog representation where relations exist. The source of a relation can differ from the descriptor file. [Backstage catalog descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/)

That distinction matters during an incident. A routing integration that reads only an old YAML field may disagree with the catalog's processed `ownedBy` relation.

Use an evidence order that your organization defines before an outage, for example:

1. Current incident ownership override approved by the responsible team.
2. Validated catalog ownership and its linked on-call route.
3. Deployment or repository metadata as candidate-team evidence.
4. Recent change authors and dependency owners as subject matter experts.
5. Staffed fallback when no accountable team can be established.

This is a suggested hierarchy, not a Backstage feature. Record provenance and freshness rather than treating every label as equally reliable. Repository code ownership identifies review responsibility; it does not automatically establish operational coverage or emergency authorization.

## Stop the Incident from Bouncing Between Teams

Keep the current owner responsible until a named receiving responder accepts. A bounded transfer record makes that practical:

```text
14:12 UTC - platform-triage requests checkout on-call.
Reason: failures tied to checkout release 42; catalog mapping outdated.
Current impact: order submissions fail in cell 3.
Requested role: own checkout investigation; platform remains IC.
14:14 UTC - checkout on-call accepts investigation.
Next report: 14:20 UTC.
Permanent catalog owner still requires verification after mitigation.
```

If two teams disagree, give each a concrete investigation rather than repeatedly reassigning the entire incident. One can inspect the application release while another checks the shared database. The incident commander remains accountable for coordination and the customer-impact statement.

Set a locally appropriate checkpoint for unresolved routing. If no team accepts by that point, escalate through the staffed management route. Avoid indiscriminate pages to every engineer; the purpose is to find responsible expertise while preserving a clear owner.

## Repair Metadata Without Inventing Authority

Once the immediate response is stable, open a specific catalog repair with evidence: entity identifier, failed route, proposed owner, approving team, and the relevant runtime or repository references.

Keep permanent ownership changes separate from temporary incident assignments. The person who saved the service once should not silently become its owner forever.

Catalog ownership should not grant production permissions by itself. Backstage explicitly distinguishes ownership metadata from runtime authorization. Existing access and emergency procedures continue to govern who can make changes. [Backstage ownership semantics](https://backstage.io/docs/features/software-catalog/descriptor-format/)

## Exercise the Failure Cases

Test routing with a deleted team, renamed service, empty on-call schedule, conflicting ownership sources, and a catalog outage. Include a case where the first responder acknowledges but then rejects ownership.

Measure time to accepted responsibility and the number of transfers, not just whether a webhook was delivered. Track fallback usage by reason so recurring catalog defects become repair work. Keep a small, protected offline contact route for the failure of the catalog or paging integration itself.

## Conclusion

Missing ownership metadata should create a visible routing exception with a responsible responder. A tested fallback, scoped service identity, evidence-backed team selection, and acknowledged transfers keep the outage moving toward recovery while permanent ownership is repaired deliberately.
