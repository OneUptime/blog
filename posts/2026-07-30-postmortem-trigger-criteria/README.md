# Which Incidents Need a Postmortem? Severity, Impact, and Near Misses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Blameless Postmortems, SRE, Severity, Near Miss

Description: Create proportionate, pre-agreed postmortem triggers based on impact, response, control failure, recurrence, and near-miss potential.

---

Not every alert needs a full postmortem, but actual customer impact is not the only reason to learn. A failed safeguard, a lucky recovery, or a repeated low-severity incident may reveal more risk than a short, well-contained outage.

Set the rules before the next incident. Use objective mandatory triggers, allow stakeholder requests, and scale the review depth to learning value and risk.

## Why Severity Alone Is Not Enough

Severity is an operational coordination tool. It usually summarizes current impact and urgency so responders can mobilize. Postmortem selection asks a different question:

> Is there enough risk or learning value to justify structured analysis and follow-up?

A severity-1 outage normally qualifies. Other events may also qualify:

- a data corruption was caught just before a destructive migration;
- a monitoring failure allowed a problem to persist unnoticed;
- an on-call engineer recovered service through an undocumented privileged action;
- the same minor degradation occurred for the fifth time;
- a safeguard failed but another independent control prevented impact; or
- a routine change required surprising cross-team coordination.

Google's SRE Book lists common triggers including user-visible impact, data loss, on-call intervention, long resolution, and monitoring failure. It also recommends allowing any stakeholder to request a postmortem.

## Establish Mandatory Triggers

Define organization-specific thresholds across several dimensions.

### User and Business Impact

- severity 1 or 2 under the incident policy;
- availability, latency, or correctness outside an agreed SLO threshold;
- affected users, transactions, revenue, or critical internal operations above a threshold;
- contractual or regulatory commitment missed; or
- material customer communication required.

### Data, Security, Privacy, and Safety

- confirmed or suspected unauthorized access;
- data loss, corruption, disclosure, or integrity risk;
- safety impact or credible safety potential;
- control failure that requires formal reporting; or
- loss of evidence or auditability.

These events may require a specialized, access-controlled review coordinated with security, privacy, legal, compliance, or safety teams. A normal broadly shared engineering postmortem may not be appropriate.

### Response and Recovery

- emergency rollback, traffic reroute, failover, or privileged intervention;
- detection or recovery duration above a threshold;
- escalation beyond the owning team;
- incident command activated;
- recovery depended on undocumented knowledge; or
- responders exceeded an agreed toil or staffing threshold.

### Defense and Process Failure

- monitoring did not detect the incident;
- an expected automated control failed or was absent;
- a runbook was incorrect or unusable;
- backup, restore, failover, or rollback did not perform as expected;
- incident communication materially failed; or
- multiple teams had incompatible ownership assumptions.

### Recurrence and Novelty

- repeat of an earlier incident or contributing factor;
- several related low-severity events in a review window;
- a new failure mode with likely reuse elsewhere;
- unexpected dependency or blast radius; or
- evidence that a previous action did not work.

Publish exact thresholds where possible. "Large impact" invites inconsistent decisions; "more than 5% of active users for 15 minutes" can be applied and audited. Thresholds differ by service criticality, so use service tiers rather than one company-wide number where needed.

## Include Near Misses

A near miss is an event that could credibly have caused material impact but did not, often because of timing, luck, or an independent defense.

Require a review when:

- one remaining control prevented severe impact;
- a risky action reached production but happened to affect no live data;
- an emergency recovery succeeded without a tested procedure;
- impact was avoided because traffic was unusually low;
- an operator caught a dangerous configuration manually;
- a control failed silently and was discovered incidentally; or
- the potential blast radius crossed a defined threshold.

Score both actual and potential impact:

```text
review priority = actual impact + credible potential + learning value
```

Do not manufacture an exact mathematical risk score unless inputs support it. A short expert triage that records rationale is often more honest.

Near-miss reporting must be safe. If reporting creates punishment or a burdensome review every time, people will stop surfacing weak signals. Use lightweight reviews when they can capture the lesson.

## Use Proportionate Review Levels

| Level | Appropriate for | Artifact |
| --- | --- | --- |
| Incident note | Known, low-impact, well-contained event | Timeline, cause category, links |
| Lightweight review | Moderate impact, useful near miss, or repeated minor event | Short analysis and tracked actions |
| Full postmortem | Major impact, complex response, data event, or control failure | Facilitated review, full document, formal approval |
| Cross-organizational or specialist review | Broad systemic, security, privacy, safety, or regulatory event | Restricted evidence plus appropriate shared learning |

The criteria should route events to a level, not merely answer yes or no. Teams can escalate when investigation reveals wider risk.

Atlassian publicly describes full postmortems for its severity-1 and severity-2 incidents and optional reviews otherwise. That is an example of a local policy, not a universal severity mapping.

## Build a Decision Matrix

At incident close, answer:

```text
1. Did a mandatory impact or data trigger fire?
2. Was emergency human intervention required?
3. Did an expected detection, prevention, or recovery control fail?
4. Is this a recurrence or cross-service pattern?
5. Was credible potential impact much larger than actual impact?
6. Has any stakeholder requested a review?
```

Suggested routing:

- any critical data, security, privacy, or safety trigger: specialist plus full review;
- severe user impact: full review;
- failed control, recurrence, or high-potential near miss: at least lightweight review;
- none of the above and well-understood behavior: incident note;
- uncertain: incident-program owner triages and records the decision.

Automate the questionnaire in the incident-closing workflow. Store trigger values, selected level, decision owner, and rationale.

## Allow Requests and Appeals

Any responder, service owner, customer representative, support lead, or risk partner should be able to request a review. People close to the event may see learning value that severity data misses.

If a required review is waived, require:

- a named decision maker;
- written rationale;
- confirmation that no specialist obligation applies;
- an expiry or reconsideration condition; and
- visibility to the incident-program owner.

Do not let the team most exposed by the findings quietly waive its own review.

## Watch for Selection Bias

Quarterly, compare:

- incidents by severity and review level;
- mandatory triggers versus completed reviews;
- waivers and reasons;
- services and teams represented;
- near misses submitted;
- repeat incidents without reviews; and
- action completion.

A process that reviews frontline operational errors but not capacity, roadmap, or leadership decisions is biased. So is a process that analyzes customer-visible outages but ignores security near misses.

Avoid a target such as "write 20 postmortems this quarter." It encourages unnecessary artifacts. Measure compliance with trigger policy, timeliness, action quality, and repeated contributing factors.

## Review the Trigger Policy Itself

After several months, ask:

- Which reviews produced valuable actions?
- Which were disproportionate to their learning?
- Which important events escaped the criteria?
- Are thresholds causing teams to downgrade incidents?
- Do near-miss reporters feel safe?
- Are specialist routes preserving both confidentiality and shared learning?

Version the policy and annotate reporting when thresholds change.

The right set of postmortems is not simply the set of worst outcomes. It is the set of events where structured learning can reduce future likelihood or impact. Severity starts that decision; control failure, recurrence, human intervention, and credible near-miss potential complete it.

## Official Documentation

- [Google SRE Book: Postmortem Culture-Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [Atlassian Incident Management Handbook: Postmortems](https://www.atlassian.com/incident-management/handbook/postmortems)
- [NIST SP 800-61 Rev. 3: Incident Response Recommendations](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [CISA: Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf)
