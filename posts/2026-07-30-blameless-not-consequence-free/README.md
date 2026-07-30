# Blameless Is Not Consequence-Free: Negligence and Repeated Mistakes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Blameless Postmortems, Just Culture, Incident Management, Accountability, SRE

Description: Preserve incident learning while responding fairly and consistently to human error, risky choices, deliberate misconduct, and repeated failures.

---

A blameless postmortem protects the learning process from scapegoating. It does not grant immunity for deliberate misconduct, reckless behavior, concealment, or refusal to meet clear role expectations.

The safe pattern is to separate two questions:

1. What system conditions and interactions produced the incident, and how will they improve?
2. Did behavior violate a known, reasonable expectation in a way that requires coaching, support, role change, or formal action?

The postmortem answers the first. A separate, established process answers the second.

## Why the Separation Matters

Turning the postmortem into a disciplinary meeting creates predictable failure:

- participants minimize or hide errors;
- the timeline becomes a defense document;
- investigators stop at the last human action;
- managers make employment judgments without appropriate process; and
- system weaknesses remain.

Ignoring possible misconduct also fails:

- peers see inconsistent standards;
- known risky behavior can continue;
- managers call the process "consequence-free"; and
- trust in blamelessness erodes.

Run both processes when necessary, with different owners, access, evidence standards, and outputs. Confidential personnel findings should not be placed in the broadly shared postmortem.

## Use a Just-Culture Lens

AHRQ's system-focused guidance describes three broad behavior classes:

| Behavior | Typical organizational response |
| --- | --- |
| Human error: inadvertent slip, lapse, or mistake | Support the person; redesign process, tooling, and environment |
| At-risk behavior: risk not recognized or believed justified | Coach; clarify risk; remove incentives and redesign conditions |
| Reckless or deliberate violation | Consider remedial or punitive action through a fair process |

This is a useful lens, not a substitute for your employment policy, local law, contracts, professional obligations, or case-specific advice.

Avoid classifying behavior from the outcome. A routine mistake followed by an unlucky cascade does not become reckless because the outage was expensive. A deliberate high-risk bypass does not become acceptable because no customer happened to be harmed.

## Investigate the Choice in Context

Before calling behavior negligent or reckless, establish:

- the exact action or omission;
- the expectation in force at that time;
- whether the expectation was clear, feasible, trained, and consistently enforced;
- what information and risk the person actually perceived;
- whether peers routinely use the same workaround;
- workload, fatigue, time pressure, and conflicting goals;
- available tools, controls, and escalation paths;
- whether the behavior was inadvertent, mistaken, adaptive, or deliberate; and
- how the system detected, limited, or amplified it.

If an entire team routinely bypasses a control to meet delivery goals, singling out the person present during the outage is unjust and ineffective. Leaders who rewarded the shortcut and systems that made it necessary are part of the context.

Do not ask the postmortem facilitator to infer intent. A conduct review should give the person notice of the concern, an opportunity to respond, consistent decision criteria, and the appropriate management and specialist participation.

## Handle Repeated Mistakes Carefully

"They made the same mistake again" can describe several different realities:

### The System Was Never Fixed

The previous postmortem assigned "be careful" or "retrain staff," while the same confusing interface and unsafe default remained. Repetition is evidence that the corrective action was weak.

### The Action Item Was Not Completed

The organization accepted the risk by leaving a known fix overdue. Review prioritization, ownership, and management decisions before focusing on the latest operator.

### Training or Role Support Is Inadequate

The person may need practice, clearer expectations, mentoring, reduced workload, or a different assignment. Support and role-fit action are consequences, but they need not be punitive.

### A Known Rule Is Routinely Impractical

If compliant work is substantially slower or impossible, people adapt. Redesign the workflow and enforce only rules the organization is prepared to make workable.

### A Person Repeatedly Chooses a Known Substantial Risk

After expectations are clear, tools are usable, coaching has occurred, and support is available, repeated deliberate risk-taking may warrant formal action. Decide this consistently through the conduct process-not through frustration in a postmortem.

Track whether recurrence involves the same individual, the same role, the same interface, or the same organizational pressure. A pattern across different people is particularly strong system evidence.

## Distinguish Negligence From Human Error

"Negligence" has legal and policy meanings that vary by jurisdiction and context. Do not use it casually as a technical root cause.

In the postmortem, describe facts:

```text
The documented production-change check was not performed.
The workflow allowed promotion without recording the check.
Audit data shows that 37% of comparable emergency changes in
the prior quarter used the same path.
```

That is more useful than:

```text
The engineer was negligent.
```

The factual version supports both system improvement and, if needed, a separate assessment against organizational expectations. The label prematurely decides motive and culpability.

## Keep System Actions Even When Conduct Is Serious

Suppose an engineer deliberately disables a safety check. A conduct process may be appropriate, but the postmortem should still ask:

- Why could one identity disable the control?
- Was the action logged and alerted?
- Did the control create unsafe operational pressure?
- Could the blast radius have been smaller?
- Did review or separation of duties apply?
- How quickly could responders restore a safe state?

Security engineering assumes people and credentials can behave incorrectly or maliciously. Reliability should do the same. Removing one person without reducing the failure mode leaves the organization exposed.

## Make Consequences Proportionate and Useful

Possible responses extend beyond "nothing" or dismissal:

- immediate support and recovery time;
- tool or process redesign;
- additional supervised practice;
- coaching about a risk;
- clearer written expectations;
- temporary restriction of privileged access;
- reassignment while competency develops;
- a documented improvement plan;
- formal discipline under policy; or
- termination for substantiated serious conduct.

Choose based on behavior and context, not incident cost, seniority, publicity, or pressure to demonstrate action. Apply the same standard to leaders whose priority or staffing decisions contributed.

Consult HR, legal, security, compliance, or professional-safety specialists for high-stakes cases. An engineering article cannot determine an employment or legal outcome.

## Communicate Without Violating Confidentiality

Teams may reasonably ask whether accountability exists. Managers usually cannot disclose personnel details. They can state:

- the postmortem process and conduct process are separate;
- applicable concerns were referred to the correct process;
- system actions will continue regardless;
- standards apply consistently; and
- employment matters remain confidential.

Do not hint at or invite speculation about an individual. Publish the engineering facts and corrective work that others need to learn from.

## Audit the Fairness of the System

Periodically review, with appropriate confidentiality:

- whether similar behavior receives similar responses;
- whether outcome severity improperly drives punishment;
- differences by seniority, team, or demographic group;
- whether expected controls are usable and consistently enforced;
- recurrence after system actions versus training-only actions; and
- whether near-miss and error reporting remain healthy.

A blameless culture that shields senior staff but disciplines junior responders is not blameless. A "no consequences" culture that ignores deliberate risk is not just.

The durable position is more disciplined: learn from every incident, improve the system every time, and evaluate behavior through a fair process when the evidence-not hindsight anger-requires it.

## Official Documentation

- [Google SRE Book: Postmortem Culture-Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [AHRQ: System-Focused Event Investigation and Analysis Guide](https://www.ahrq.gov/patient-safety/settings/hospital/candor/modules/guide4.html)
- [AHRQ PSNet: Culture of Safety](https://psnet.ahrq.gov/primer/culture-safety)
- [FAA: Safety Management Systems, Advisory Circular 120-92D](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-92D_FAA_Web.pdf)
