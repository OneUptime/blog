# Root Cause vs Contributing Factors: How to Avoid a Single-Cause Story

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Root Cause Analysis, Contributing Factors, Blameless Postmortems, SRE

Description: Describe triggers, conditions, amplifiers, and failed barriers together so a postmortem does not collapse a complex incident into one convenient cause.

---

A production incident can have a trigger without having one sufficient explanation.

A deployment may start the failure. Capacity limits may make it widespread. Retries may amplify it. Weak isolation may expand the blast radius. Delayed alerting and an unsafe rollback may extend customer impact. Calling only the deployment “the root cause” discards most of the opportunities to improve.

OSHA’s incident-investigation guidance says investigations should not stop at a single triggering factor and notes that there is often more than one root cause. NASA’s mishap framework explicitly represents proximate, intermediate, and root causes alongside contributing factors and failed barriers.

Software teams do not need to adopt every term from safety engineering. They do need a vocabulary that resists a single-cause story.

## Use Terms for Different Roles

Define the terms in your own postmortem template. A practical model is:

- **Undesired outcome:** measured customer, business, security, or operational impact.
- **Trigger:** the event that initiated a state change, such as a deployment or dependency failure.
- **Proximate cause:** an event or condition close to the outcome, such as all healthy replicas becoming unavailable.
- **Contributing factor:** a condition that increased likelihood, duration, scope, or severity.
- **Amplifier:** a factor that multiplied load or impact, such as synchronized retries.
- **Failed barrier:** a prevention, detection, containment, or recovery control that did not work as needed.
- **Successful barrier:** a control or lucky boundary that reduced a worse outcome.
- **Deeper systemic factor:** a correctable design, process, or organizational condition that shaped several branches.

These categories can overlap. The purpose is to clarify how a fact participated, not to win a terminology debate.

## Begin with Impact, Not the Suspect

Weak problem statement:

> A bad deployment caused an outage.

Better:

> From 10:14 to 10:31 UTC, write success in the primary region fell from 99.96% to 81.4%, affecting approximately 23,000 requests.

The second statement lets the team test several explanations. The first has already selected one.

Build the factual timeline before causal analysis. Preserve observations, decisions, actions, and results. Then ask which evidence connects each condition to the measured impact.

## Build a Causal Set

For each candidate factor, record:

| Field | Question |
| --- | --- |
| Claim | What event or condition are we asserting? |
| Role | Trigger, precondition, amplifier, barrier, or recovery factor? |
| Evidence | Which logs, metrics, changes, tests, or interviews support it? |
| Relationship | How did it affect likelihood, scope, severity, or duration? |
| Counterfactual | If removed, what would probably have changed? |
| Confidence | Confirmed, supported inference, unresolved, or disproved? |
| Control | What could prevent, detect, contain, or recover from it? |

Counterfactual questions are useful but must stay modest. “Without unbounded retries, dependency load would have been lower” may be supported by a replay or load test. “Without retries there would have been no incident” is a stronger claim and needs stronger evidence.

## Show How Factors Interact

Consider a cache failure:

```text
Trigger
  Cache fleet restarted during a routine rollout.

Preconditions
  Instances restarted in large simultaneous batches.
  Application capacity assumed a warm-cache hit ratio.

Amplifiers
  Cache misses created expensive database queries.
  Clients retried timed-out requests independently.

Failed barriers
  The rollout controller did not enforce a maximum unavailable count.
  The canary used synthetic traffic that did not warm representative keys.
  The page measured CPU on the cache hosts, not checkout failures.

Recovery factors
  Rollback did not repopulate cache state.
  A traffic-shedding control existed but its runbook lacked the affected route.

Successful barrier
  Regional isolation prevented global impact.
```

The restart is still important. It is not the whole incident.

## Do Not Turn “Root Cause” into a Ranking Contest

Teams sometimes spend most of a review deciding which box deserves the root-cause label. That can create three problems:

1. the selected cause receives all priority;
2. other teams treat contributing factors as optional;
3. leadership receives false confidence that removing one factor prevents recurrence.

Instead, identify the smallest supported set of conditions needed to explain the outcome and the factors that changed its severity or duration. If policy requires a root-cause field, allow several entries or write a concise systemic statement followed by the complete contributing-factor set.

For example:

> The incident resulted from a deployment path that allowed simultaneous restart beyond available warm-cache capacity, combined with retry amplification and alerting that did not measure customer write success.

That statement is longer than “bad deploy,” but it is actionable.

## Investigate Human Actions as Conditions, Not Verdicts

An action by a person can be a factual event:

> The operator approved the global target at 13:02 UTC.

Continue the analysis:

- What target scope did the interface show?
- What checks did approval perform?
- Why was global scope available in the routine workflow?
- What change limit existed?
- Why did a canary or rollback not constrain impact?
- Which business or time pressures shaped the choice?

Google SRE recommends focusing on what went wrong rather than who caused it and directing actions at systems rather than people. This produces more complete disclosure and better controls.

## Include Detection and Response Factors

Cause analysis often stops when the system enters a failed state. Customers experience the entire interval until recovery.

Analyze:

- why the first signal did or did not fire;
- alert-routing and acknowledgement;
- diagnostic information that was missing;
- misleading hypotheses and why they fit;
- access or authorization delays;
- mitigation safety and reversibility;
- handoffs and communication;
- how recovery was validated.

A trigger may be hard to eliminate completely. Reducing detection time, blast radius, or recovery risk can still materially improve reliability.

## Derive a Portfolio, Not One Heroic Fix

Map actions to different causal roles:

| Action type | Example |
| --- | --- |
| Prevent | Reject rollout batches larger than the tested warm-capacity margin. |
| Detect | Page on regional write-success burn rate. |
| Contain | Apply a shared retry budget and per-region load shedding. |
| Mitigate | Add a tested control to stop and reverse the rollout. |
| Recover | Automate cache warming for the highest-volume keys. |
| Learn | Run an experiment to measure cold-cache database demand. |

Do not create an action for every node automatically. Prioritize by customer risk, control strength, feasibility, and overlap. One strong guard may address several branches; several weak reminders may address none.

## Record Successful Barriers and Luck

Postmortems should explain why the incident was not worse:

- a region boundary held;
- a circuit breaker opened;
- a responder recognized a pattern;
- spare capacity absorbed load;
- a customer retried safely;
- a backup restored correctly.

Then distinguish designed protection from luck. A tested circuit breaker can be maintained and expanded. Unplanned spare capacity may disappear during the next peak.

## Check the Analysis for Premature Closure

Before finalizing, ask:

- Does the outcome contain measured impact?
- Is the trigger being mistaken for the full explanation?
- Are multiple necessary conditions represented?
- Are duration and blast-radius factors included?
- Are failed and successful barriers visible?
- Are human actions described with their information and tool context?
- Does every causal claim have evidence or an uncertainty label?
- Would removing the nominated root cause definitely address the other paths?
- Do actions cover prevention, detection, containment, and recovery?
- Could the same conditions create a different incident?

The best postmortem is not the one with the deepest single root. It is the one that explains the interacting conditions well enough to make the next failure less likely, smaller, and easier to recover from.

## Official Documentation

- [OSHA: Incident Investigation](https://www.osha.gov/incident-investigation)
- [OSHA: Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-identification)
- [NASA Procedural Requirements 8621.1B: Review and Analyze Data](https://nodis3.gsfc.nasa.gov/displayCA.cfm?Internal_ID=N_PR_8621_001B_&page_name=Chapter5)
- [NASA Procedural Requirements 8621.1D: Definitions](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=AppendixA)
- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
