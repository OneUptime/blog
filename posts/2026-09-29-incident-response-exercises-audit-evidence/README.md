# How to Exercise an Incident Response Plan and Produce Audit Evidence with Tabletop Tests and Game Days

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Chaos Engineering, SRE, Reliability

Description: Turn incident response exercises into traceable evidence by linking objectives to scenario injects, observed decisions, technical checks, findings, and verified follow-up work.

An attendance list proves that people attended an exercise. It does not prove they could declare an incident, reach the right decision-maker, restore the service, or communicate through a failed primary channel.

Design the evidence at the same time as the exercise. NIST SP 800-84 describes the design, development, conduct, and evaluation of tests, training, and exercises for IT plans. AWS recommends regular game days involving the people and procedures used in real events. Neither makes an arbitrary screenshot folder sufficient evidence for every audit. The packet below is a practical structure to adapt to your actual control objectives. [NIST SP 800-84](https://csrc.nist.gov/pubs/sp/800/84/final), [AWS: Conduct Game Days Regularly](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_game_days_resiliency.html)

## Choose the Claim Before the Scenario

Write a small number of observable objectives. “Test incident response” is too broad to evaluate. Better objectives include:

| Objective | Observation that would support it |
| --- | --- |
| A responder can escalate an ambiguous outage | Acknowledgment from the designated decision-maker |
| Communications continue during chat failure | Successful use of the documented fallback channel |
| Recovery protects data correctness | Reconciliation result after the recovery procedure |
| Command transfers without losing work | Incoming commander identifies active changes and pending decisions |

Record the plan revision, service scope, participants' roles, and the intended evidence for each objective. A control owner should agree beforehand which claims the exercise can establish and which need separate tests.

## Use Tabletop and Technical Exercises for Different Questions

A tabletop presents a scenario and asks participants to explain decisions using their current plan. It is well suited to authority, escalation, communication, and coordination gaps. It does not establish that a backup restores or that an on-call notification actually arrives.

A game day exercises selected behavior in a controlled environment. It can demonstrate alert delivery, access, mitigation execution, or recovery under the tested conditions. It still cannot prove every failure mode or production scale assumption.

Pair them when useful. First discover whether the team knows who can authorize failover. Then exercise the tested failover path in an appropriate environment with bounded scope and restoration controls. Record the distinction between simulated actions and executed actions throughout.

## Prepare a Scenario and an Evaluation Sheet

Use a facilitator to introduce information and an observer to record behavior. The person evaluating the response should not quietly coach participants through every missing step.

Example scenario progression:

```text
T+00: Support reports failed exports from one region; dashboard is green.
T+08: Failure is confirmed; service owner cannot be reached.
T+15: Primary chat becomes unavailable.
T+22: Provider confirms degradation but offers no recovery estimate.
T+30: A workaround restores new exports; queued work remains delayed.
T+38: Incident commander must hand over.
```

For each inject, define the question being tested, expected evidence, and permissible branches. Do not require one scripted diagnosis when several safe responses could satisfy the objective. Record when participants request unavailable information; the missing dependency may itself be the finding.

Choose timing to serve the exercise, not to claim that all real incidents should follow these minute marks.

## Establish the Operational Boundary

Before any technical exercise, define the environment, approved targets, customer exposure, credentials, start and end window, stop authority, and restoration procedure. Test the abort path before introducing the fault.

Define what happens if a real incident starts. A clear stop phrase should end the simulation, identify who takes command, and prevent simulated messages from being mistaken for live customer impact. Prefix exercise channels and notifications visibly.

AWS recommends production-like conditions, relevant stakeholders, and feeding observed lessons back into procedures. Production changes still need the organization's established authorization and containment process; a game day invitation is not blanket approval for arbitrary fault injection. [AWS Game Day Implementation Guidance](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_game_days_resiliency.html#implementation-guidance)

## Capture Evidence as Observations

Use a record that makes the outcome reviewable:

```text
Objective: O3 — fallback communication
Plan under test: IRP revision 12, section 6
Inject: I3 — primary chat unavailable at 14:15 UTC
Observed: responder found bridge link in offline contact sheet at 14:18
Observed: three required roles joined by 14:22
Gap: vendor liaison's fallback number was obsolete
Result: partially demonstrated
Evidence: E08 bridge attendance; E09 observer notes
Finding: F04, contact-sheet owner, due date, retest required
```

Keep factual observation separate from interpretation. “The responder took seven minutes because the plan is confusing” mixes a measurement with an untested explanation. Record the delay, then investigate the reason during debrief.

For technical checks, preserve tool versions, configuration, fault scope, timestamps, expected result, actual result, and cleanup verification. Use access-controlled evidence links and retain a readable excerpt when a moving dashboard or expiring log would otherwise disappear.

## Assemble a Small Evidence Packet

The packet should connect the story end to end:

1. Exercise charter, scope, objectives, and approvals.
2. Plan revision and participant roles.
3. Scenario and actual inject timeline.
4. Observer notes and technical evidence index.
5. Results by objective, including untested items and limitations.
6. Findings with owners, deadlines, and expected correction.
7. Retest evidence and acceptance of residual gaps.

An aborted exercise can still produce valuable evidence. Mark why it stopped and which objectives remain untested. Do not turn “not observed” into “passed” because the meeting finished on time.

## Close the Loop Before Declaring Readiness

Debrief while the observations are fresh. Choose whether each gap needs a plan change, access fix, tooling improvement, training, or architecture work. Retest the affected behavior after correction and attach the new result to the original finding.

Retain the packet according to the applicable evidence policy, with appropriate permissions and an accountable owner. Schedule re-exercise when material architecture, staffing, tooling, or procedure changes invalidate the tested assumptions. A successful exercise is evidence about a particular scope and time, not permanent certification of readiness.

## Conclusion

An exercise becomes useful audit evidence when a reviewer can trace an objective through the scenario, observed response, outcome, finding, and retest. Keep simulated decisions distinct from executed checks, preserve limitations, and use the findings to improve the response plan before the next real incident.
