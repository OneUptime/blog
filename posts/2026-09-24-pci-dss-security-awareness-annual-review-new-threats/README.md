# How to Review PCI DSS Security Awareness Training Annually for New Threats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Training

Description: Review security-awareness content against current threats, update role-specific scenarios, and retain evidence linking training changes to staff understanding.

---

A completion report can show that employees finished a course. It cannot, on its own, show that the course still describes the threats they face or the processes they are expected to follow.

For PCI DSS, maintain evidence of both program review and training delivery. The most useful record connects a real threat or operational change to a specific lesson and then to the people who need it.

## Separate the review from the annual training event

PCI DSS v4.0.1 Requirement 12.6.2 requires reviewing the security-awareness program at least once every 12 months and updating it as needed for new threats, vulnerabilities, or changes to personnel's role in protecting cardholder data.

Requirement 12.6.3 separately requires training upon hire and at least every 12 months, multiple methods of communication, and an annual acknowledgement that personnel have read and understood the information-security policy and procedures.

Requirements 12.6.3.1 and 12.6.3.2 add awareness of relevant threats, including phishing and social engineering, and acceptable use of end-user technology. Verify the complete wording in the [PCI DSS v4.0.1 standard](https://www.pcisecuritystandards.org/document_library/).

Scheduling the same unchanged video every year does not demonstrate that the program was reviewed.

## Build a review packet from operational evidence

Assign a program owner and gather inputs before the review meeting:

- Incidents and near misses involving account data or credentials.
- Help-desk requests that exposed recurring misunderstandings.
- Relevant vendor advisories and security-team threat assessments.
- New payment channels, support tools, or remote-working arrangements.
- Policy and incident-reporting procedure changes.
- Results from previous knowledge checks or awareness exercises.

Keep the evidence relevant to the organization's environment. A threat becomes useful training material when an employee can recognize a situation and knows what action to take.

For example, a new support transcription service creates a reason to teach staff what to do when callers unexpectedly disclose card details. A new identity-recovery process creates a reason to explain how to verify a request claiming to come from the help desk.

## Maintain a threat-to-content map

Use a compact record linking each input to the curriculum decision:

| Review input | Audience | Content change | Evidence of delivery |
|---|---|---|---|
| Fraudulent identity-recovery request | Help desk | Verify identity through approved channels | Updated exercise and session record |
| Card details pasted into a ticket | Support | Use approved payment collection and reporting procedure | Revised workflow lesson |
| Unauthorized cloud sharing | Finance and operations | Explain approved export destinations | Team briefing and acknowledgement |
| New remote-access procedure | Administrators | Explain access approval and escalation | Role-specific refresher |

These scenarios are examples, not claims about a specific incident at your organization.

Record when a review concludes that existing content remains suitable, including the inputs considered and the rationale. The requirement is to review and update as needed; it does not require cosmetic changes solely to produce a new version number.

## Teach an observable action

Replace vague instructions such as “be careful with phishing” with the organization's exact reporting and verification steps. Employees should know where to report a suspicious message, whom to contact after a mistaken disclosure, and which channel is approved for payment information.

For each scenario, ask the learner to choose or demonstrate the next action. A support employee should know how to stop collecting card details in a ticket and start the established response process. A help-desk employee should know which identity checks cannot be skipped because a caller claims urgency.

Avoid including real PAN, CVV, passwords, or customer messages in training artifacts. Use synthetic examples that preserve the decision the learner needs to practice.

Tailor the detail to the role without omitting the common security responsibilities that apply to everyone.

## Use more than one communication method

An onboarding module can introduce the policy, while team briefings, short reminders, scenario discussions, or targeted refreshers reinforce it. Choose methods that reach the actual workforce, including remote staff and relevant contractors.

Track the population against authoritative personnel records. A course completion percentage is misleading if new hires, role transfers, or temporary staff never entered the enrollment list.

Keep policy acknowledgements distinguishable from course completion. Record which policy and course versions were presented, when they were completed, and how overdue assignments are handled.

Do not confuse awareness training with the technical anti-phishing mechanisms in Requirement 5.4.1. The standard treats these as separate controls; neither substitutes for the other.

## Preserve the review trail and respond between reviews

Retain the dated review, contributors, input references, decisions, content versions, delivery records, acknowledgement records, and follow-up actions. Add a next-review date that stays within the required interval.

When a meaningful new threat or process change appears, update affected material as needed and deliver a focused communication. Waiting for the next annual course can leave personnel following outdated instructions for months.

Use results to improve the program. If staff repeatedly choose the wrong reporting channel, revise the workflow or instruction rather than merely repeating the same quiz.

The evidence should allow a reviewer to trace why the training changed, who received it, and how the organization checked that the required behavior was understood.
