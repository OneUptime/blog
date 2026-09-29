# How to Split or Merge Simultaneous Incidents That Share the Same Upstream Dependency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Incident Management, SRE, Observability

Description: Coordinate simultaneous incidents around shared dependencies while preserving distinct customer impact, responder ownership, recovery criteria, and historical incident identity.

Checkout, login, and exports begin failing within a minute of each other. All three call the same identity service. Combining the incident records could reduce duplicate coordination, but it could also hide an independent export failure or make one service appear recovered before it is usable.

Choose the response structure from the work that needs coordinating. Shared timing and topology are evidence for a relationship; they are not enough to prove identical causes, impact, or recovery conditions.

## Separate Relatedness from Record Merging

Keep four concepts distinct:

- An alert describes a detected condition.
- An incident record tracks a response and its impact.
- A dependency relationship describes how systems interact.
- A command structure assigns decisions and work during the response.

You can coordinate several related incidents under one commander without immediately merging their records. Conversely, one incident can contain several workstreams with separate technical leads.

Alertmanager groups notifications and can inhibit notifications for selected alerts. These mechanisms control notification behavior; they do not establish causal truth or decide the human incident structure. [Alertmanager overview](https://prometheus.io/docs/alerting/latest/alertmanager/)

## Build a Small Relationship Table

Before merging, ask each responder to supply an observation:

| Incident | Verified impact | Shared-dependency evidence | Recovery needed |
| --- | --- | --- | --- |
| INC-284 checkout | Submissions time out | Identity token requests fail | Successful checkout including payment confirmation |
| INC-285 login | New sessions fail | Same identity endpoint fails | New session succeeds across affected regions |
| INC-286 exports | Jobs miss deadlines | Token refresh errors in some jobs | Backlog drains before customer deadlines |

Add each incident's owner, first observed impact, environment, affected cohorts, and current mitigation. Use request traces, dependency errors, and change evidence to test the relationship. A broad “database” label or a coincident start time is weak evidence.

The table often reveals that the dependency can recover while downstream work remains. That is a reason to preserve distinct recovery criteria even under shared command.

## Choose One of Three Structures

The following decision framework is proposed operating practice:

| Structure | Useful when | Coordination rule |
| --- | --- | --- |
| One incident with workstreams | Same failure, tightly coupled mitigation, shared recovery decision | One commander; explicit owners for service checks |
| Related incidents under shared coordination | Common dependency but different customer impact or cleanup | Shared dependency decisions; each incident retains an owner |
| Separate incidents with cross-links | Causality uncertain or remediation independent | Exchange relevant evidence without combining closure decisions |

Start with related records when uncertainty is high. Consolidate after the evidence and operating needs become clearer. Avoid waiting for perfect root cause before coordinating changes to a dependency that several teams are touching.

Before a shared dependency change, agree who operates it and who watches downstream impact. Three incident teams independently restarting or failing over the same resource can make every investigation harder.

## Merge Only After Checking Tool Behavior

A merge changes more than the title in a dashboard. Check alert ownership, notification subscriptions, escalation, webhooks, status-page links, and analytics.

PagerDuty, for example, moves alerts into an open target incident and resolves the source incidents with a merged reason. Its documented behavior does not transfer source responders or subscribers into the target automatically. A merge therefore needs a deliberate review of who is still engaged and who will receive updates. [PagerDuty incident merge behavior](https://support.pagerduty.com/main/docs/edit-incidents)

Use a merge checklist:

1. Select the canonical incident and confirm the command owner accepts.
2. Preserve original IDs, impact windows, severity history, and evidence links.
3. List each affected service and its unresolved recovery criteria.
4. Transfer required responders and notification recipients explicitly.
5. Announce the canonical channel and record links in the source records.
6. Verify integrations treat a merged record differently from recovered service.

A source record becoming “resolved” because of a merge must not produce an unsupported customer recovery announcement. Test this behavior with your actual integrations before automating incident consolidation.

## Split When Evidence or Response Needs Diverge

Reassess the structure when a common mitigation helps some services but leaves another failing. In the example, identity recovers and login succeeds, while export workers remain stuck behind a poisoned message. Exports now need their own mitigation and deadline tracking.

A split record should include:

```text
New incident: INC-291, export processing remains unavailable
Related event: identity outage INC-284
Original export impact began: 14:03 UTC
Separate response established: 15:10 UTC
Owner: export on-call, accepted at 15:10 UTC
Evidence: identity calls succeed; worker retries repeat message m-...
Recovery: affected export backlog completes within revised commitments
```

The split timestamp is not the customer-impact start. Preserve both, along with the reason for separating the work. PagerDuty supports moving selected alerts to a new or existing incident; other systems may require related records instead. [PagerDuty moving-alert documentation](https://support.pagerduty.com/main/docs/edit-incidents#move-alerts-to-another-incident)

## Keep Noise Control Narrow and Reversible

If a confirmed upstream problem creates redundant pages, scope suppression to the matching dependency instance and environment. Keep downstream customer-impact evidence visible and retain a path for failures outside the known scope.

For Alertmanager inhibition, labels in `equal` must match. Missing and empty labels are treated equivalently, so missing scope labels can cause an unexpectedly broad match. Validate required labels and review inhibition in tests before using it during a widespread outage. [Alertmanager inhibition configuration](https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule)

Assign an owner to remove temporary silences or suppression when the dependency recovers. Silence expiry does not itself verify recovery, and dependency recovery does not prove that every downstream backlog is cleared.

## Conclusion

Merge incidents to simplify coordinated work when the evidence supports it, while preserving each customer-impact window and recovery requirement. Split when mitigation or ownership diverges. The quality of the response depends on clear decisions and retained evidence, not on minimizing the number of incident records.
