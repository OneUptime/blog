# Five Whys or Causal Tree? Choosing a Better Analysis for Complex Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Root Cause Analysis, Five Whys, Causal Analysis, SRE

Description: Choose Five Whys for a tightly scoped causal path and a causal tree when an incident contains branches, interacting conditions, or failed barriers.

---

Five Whys and causal trees solve different analysis problems. Five Whys follows one line of inquiry backward. A causal tree preserves several paths and shows how events, conditions, and failed controls interacted.

For a narrow failure, Five Whys can quickly move a team past the trigger. For a distributed-system incident involving retries, capacity, deployments, detection, and response, forcing every fact into one chain usually produces a tidy but incomplete story.

The choice should follow the shape of the evidence, not the team’s preferred template.

## What Five Whys Actually Provides

Start with a specific observed problem and repeatedly ask why it occurred:

```text
Problem: Requests failed for 12 minutes.

Why?
The API exhausted its database connection pool.

Why?
Connections remained open while a dependency timed out.

Why?
The client timeout exceeded the request deadline.

Why?
Timeout values were configured independently.

Why?
There was no tested policy connecting the dependency timeout,
request deadline, and retry budget.
```

AWS describes Five Whys as a consistent, blame-free way to investigate causes. Its guidance also notes that an investigation may need more than five questions and should continue when an answer is merely “human error.”

The number five is not a completion criterion. Evidence and useful control points are.

## When Five Whys Fits

Use it when:

- the problem statement is narrow and observable;
- evidence supports a mostly sequential path;
- the team needs a fast first pass;
- few components and organizational boundaries are involved;
- the result will be checked against logs, configuration, tests, and other facts;
- parallel lines can be investigated separately if they emerge.

Examples include:

- why a certificate did not renew;
- why one health check remained disabled;
- why a backup job stopped running;
- why a deployment gate accepted a known-bad artifact.

Even in these cases, do not assume the first answer is the only path.

## Where a Single Why Chain Breaks Down

Suppose a regional outage required all of these:

- a deployment increased memory use;
- autoscaling used CPU rather than memory pressure;
- pod limits were inconsistent;
- retries amplified load;
- the canary carried too little traffic to expose the problem;
- the alert waited 20 minutes;
- rollback required a schema decision.

Which fact is “the” next why? Any chosen line leaves the others off the page.

A single chain is risky when:

- several conditions had to coincide;
- one trigger exposed pre-existing weaknesses;
- both technical and organizational factors matter;
- controls failed at prevention, detection, and recovery;
- teams disagree because they are describing different causal paths;
- the incident crossed services, regions, or ownership boundaries;
- a near miss depended on a successful barrier or lucky condition.

In these cases, use a tree or another multi-factor causal representation.

## What a Causal Tree Adds

NASA defines an Event and Causal Factor Tree as a graphic representation that connects the undesired outcome to the sequence of events, conditions, failed barriers, contributing factors, and deeper causes. NASA mishap guidance distinguishes it from a fault tree: a fault tree explores potential causes, while an event and causal factor tree represents what the evidence says did occur.

A lightweight software-incident tree can use:

```text
Customer requests failed
|
+-- Application instances became unavailable
|   |
|   +-- Memory use exceeded container limits
|   |   +-- New cache retained large responses
|   |   +-- Limit differed between canary and production
|   |
|   +-- Replacement capacity arrived too slowly
|       +-- Scaling signal used CPU
|       +-- Node pool had insufficient headroom
|
+-- Load increased during degradation
|   +-- Clients retried without a shared retry budget
|
+-- Impact lasted 12 minutes
    +-- Customer-symptom alert had a 15-minute window
    +-- Rollback required manual schema compatibility review
```

The tree makes three improvement areas visible: preventing instance loss, limiting amplification, and shortening impact.

## Build the Tree from Evidence

### 1. State the undesired outcome

Use measured impact:

> EU checkout success fell below 92% from 13:04 to 13:16 UTC.

Avoid “the system broke” or a proposed cause.

### 2. Add the necessary events and conditions

Work backward from the outcome. Ask:

- What had to be true?
- Which event changed system state?
- Which condition allowed it?
- Was this branch necessary, sufficient, or an amplifier?

Use AND/OR relationships where they matter. If two conditions were both required, do not draw them as alternative causes.

### 3. Add barriers

For each branch, ask what should have:

- prevented the event;
- detected it;
- contained its blast radius;
- enabled quick recovery.

Show whether a barrier was absent, bypassed, misconfigured, or simply outside its design envelope.

### 4. Attach evidence

Each node should link to a log, metric, configuration, experiment, change record, interview note, or other source. Mark unsupported nodes as hypotheses.

### 5. Stop honestly

Stop a branch when:

- a supported, correctable condition is clear;
- the next step is outside the investigation’s scope and has an owner;
- evidence is unavailable and the gap is recorded;
- further depth would not change a risk decision.

Do not invent an organizational cause just to make every branch equally deep.

## Use a Decision Table

| Question | Five Whys | Causal tree |
| --- | --- | --- |
| One narrow problem? | Strong fit | May be unnecessary |
| Several interacting failures? | Likely to omit branches | Strong fit |
| Need a quick facilitated start? | Strong fit | More preparation |
| Need to show AND/OR relationships? | Weak fit | Strong fit |
| Multiple teams or system boundaries? | Run several chains at minimum | Strong fit |
| Need to show failed barriers? | Can mention them | Represents them explicitly |
| Evidence still uncertain? | Easy to anchor early | Can mark competing hypotheses |
| Near miss or partial mitigation? | May hide the successful barrier | Can show what prevented worse impact |

The table is guidance, not a formal rule. A skilled facilitator can use either tool badly or well.

## Combine Them Deliberately

A practical hybrid is:

1. create the factual timeline;
2. state the measured undesired outcome;
3. sketch the main causal branches;
4. use repeated “why?” questions to deepen each branch;
5. reconnect shared conditions;
6. identify failed and successful barriers;
7. validate every retained node;
8. derive actions across prevention, detection, mitigation, and recovery.

This preserves the accessibility of Five Whys without pretending a complex incident is linear.

## Avoid Common Analysis Traps

### Starting with a cause

“Why did the bad deployment cause the outage?” assumes the deployment is the complete explanation. Start with customer impact.

### Ending at a person

“Because the operator typed the wrong value” should open branches about validation, interface design, scope limits, review, detection, and recovery.

### Counting questions

Five answers do not prove adequate depth. Two evidence-backed steps may expose a correctable control; eight speculative steps may not.

### Mixing chronology and causality

An event happening earlier does not make it causal. Use the timeline for sequence and the tree for supported relationships.

### Treating every node as equal

Distinguish trigger, precondition, amplifier, failed barrier, and recovery factor. This helps prioritize actions.

### Forcing a single root

OSHA guidance says effective investigations do not stop at a single triggering factor and often find more than one root cause. A useful analysis can end with a set of interacting correctable conditions.

## Test the Result Against Actions

A good analysis should support a balanced action portfolio:

- remove or reduce a triggering condition;
- add a guard against unsafe scope;
- contain amplification;
- detect customer impact sooner;
- make mitigation safer;
- verify recovery;
- investigate an unresolved high-risk branch.

If the analysis yields only “be more careful,” “improve monitoring,” or “rewrite everything,” deepen or rescope it. The purpose of the tool is not to produce a diagram. It is to expose specific changes whose completion can be verified.

## Official Documentation

- [AWS: Why you should develop a Correction of Error](https://aws.amazon.com/blogs/mt/why-you-should-develop-a-correction-of-error-coe/)
- [NASA Procedural Requirements 8621.1B: Review and Analyze Data](https://nodis3.gsfc.nasa.gov/displayCA.cfm?Internal_ID=N_PR_8621_001B_&page_name=Chapter5)
- [NASA Procedural Requirements 8621.1D: Definitions](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8621_001D_&page_name=AppendixA)
- [NASA: Mishap Investigation and Root Cause Analysis Training](https://sma.nasa.gov/sma-disciplines/mishap-investigation)
- [OSHA: Hazard Identification and Assessment](https://www.osha.gov/safety-management/hazard-identification)
