# SOC 2 Access Reviews When Everyone Has Production Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Access Reviews, Least Privilege, Production Access, Startups, Logical Access, Trust Services Criteria

Description: Design a credible access review for a tiny team by proving business need, effective privileges, reviewer accountability, follow-up, and compensating safeguards.

---

A five-person startup may have a legitimate reason for every engineer to support production. That does not make all access appropriate forever, and it does not make a quarterly spreadsheet signature an effective access review.

The AICPA Trust Services Criteria address logical access, authorization, modification, removal, and restriction of access based on concepts such as roles, responsibilities, and least privilege. They do not state that a startup must have a certain headcount, forbid every engineer from production, or prescribe one universal access-review frequency. Management must design controls that address its risks and commitments, then the service auditor evaluates the stated controls in the context of the applicable criteria.

For a small team, the objective is not to imitate a 500-person segregation-of-duties chart. It is to make concentrated privilege visible, justified, bounded, monitored, and revocable.

## Start with Effective Access, Not the Employee List

An access review should answer who can do what in each in-scope system. Reviewing five names from the HR roster misses the hard parts:

- direct and group-based assignments;
- inherited cloud roles and organization-level access;
- local accounts outside the identity provider;
- root, owner, break-glass, and billing identities;
- personal access tokens, deploy keys, and API keys;
- service accounts and workload identities;
- production database and observability access;
- CI/CD authority to deploy or change secrets;
- support tooling that can view or modify customer data;
- inactive users with still-valid credentials.

Build the population from each authoritative system, including how roles and groups resolve into effective privileges. Map identities to a stable workforce record and retain unmatched identities for investigation.

A useful review table contains:

| Field | Why it matters |
| --- | --- |
| Identity and type | Distinguishes people, services, shared, and emergency identities |
| System and environment | Prevents staging access from being confused with production |
| Effective privilege | Shows the action the identity can actually perform |
| Grant path | Identifies direct, group, inherited, or temporary assignment |
| Owner | Establishes accountability for the identity |
| Business need | Explains why the privilege is necessary now |
| Last use | Helps identify stale access without making activity the only criterion |
| Authentication condition | Shows MFA, federation, credential age, or session restriction as applicable |
| Reviewer decision | Retain, reduce, remove, investigate, or time-bound |
| Follow-up reference | Connects a decision to completed action |

Current state is not enough for a Type II period. Preserve the dated population, reviewer decisions, and resulting changes for each occurrence of the control.

## Do Not Pre-Approve Everyone as a Role

`Engineer` is too broad a justification for unrestricted production access. Break the work into capabilities:

- deploy approved artifacts;
- view service health and logs;
- restart a workload;
- change infrastructure;
- read or write a production database;
- decrypt secrets;
- administer identity;
- alter audit logging;
- assume a break-glass role.

Five engineers may need the first three capabilities frequently while only one or two need standing database or identity administration. Another capability may be available only through a short-lived elevated session.

For each privilege, ask:

1. Which incident or operating task requires it?
2. Could a narrower role perform that task?
3. Does it need to be standing, or can it be just in time?
4. Can approval be independent for the highest-risk action?
5. Can use be logged and alerted?
6. Would its loss prevent recovery, requiring a separately controlled emergency path?

Least privilege does not mean no privilege. It means limiting access to what is necessary for the role and context.

## Solve the Reviewer Conflict Explicitly

In a five-person company, the CTO may review the engineers but also hold the most powerful account. A person silently recertifying their own access provides weak challenge.

Choose a design that fits the actual governance structure:

- The CTO reviews engineers, and the CEO or another authorized executive reviews the CTO.
- A technically competent board member or other governance representative reviews founder-level privileges with appropriate support.
- Two authorized leaders jointly review the highest-risk roles.
- A managed security or IT provider prepares an independent analysis, while management retains and documents the access decision.
- The review identifies self-reviewed entries and subjects them to a separate approval.

External assistance can add challenge, but management should not outsource responsibility for deciding who needs access. The reviewer also needs enough information to understand the privilege. A nontechnical signature over role names such as `OrganizationOwner` or `system:masters` is not meaningful without an explanation of authority and risk.

The Trust Services Criteria do not mandate one of these exact patterns. Document why the chosen reviewer is authorized and how conflicts are handled.

## Add Safeguards Around Broad Production Access

When headcount limits traditional segregation, use layers that reduce the likelihood or impact of misuse and mistakes.

### Preventive safeguards

- Federate human access through a central identity provider.
- Require strong authentication and phishing-resistant MFA where feasible.
- Remove shared daily-use administrator accounts.
- Use role-based and short-lived credentials.
- Separate routine observability from privileged change access.
- Require peer review and protected checks for production code and infrastructure changes.
- Restrict direct database and shell access to exceptional tasks.
- Keep break-glass credentials separate, monitored, and tested.

### Detective safeguards

- Retain immutable or separately protected administrative audit logs.
- Alert on root use, logging changes, unusual role assumptions, and direct production modifications.
- Reconcile production changes to approved deployment records.
- Review high-risk access use, not only assignments.
- Investigate dormant privileged identities and credentials.

### Recovery safeguards

- Maintain tested backups and restoration procedures.
- Separate the ability to destroy production from the ability to destroy backups where practical.
- Preserve a recovery identity that does not depend on the normal identity plane.
- Document escalation when the usual approver is unavailable.

These safeguards do not erase the need to authorize access. They make a small-team design more resilient and provide corroborating evidence that concentrated privilege is controlled.

## Run the Review as a Decision Process

### 1. Freeze and validate the population

Export all in-scope identities and effective privileges at a stated time. Reconcile the systems to the SOC 2 boundary and the human identities to HR or contractor records. Investigate unmatched and shared identities before asking for approvals.

### 2. Assign reviewers

Define who reviews each subject. Route the most privileged reviewer's own access to a different authorized person. Record conflicts rather than hiding them.

### 3. Provide risk context

For each role, explain what it permits, when it was last used, how it authenticates, whether the access is standing, and whether use is monitored. Ask the reviewer to make a decision, not merely acknowledge receipt.

### 4. Record item-level decisions

Use explicit outcomes:

- retain with stated business need;
- reduce to named role;
- convert to temporary elevation;
- remove;
- investigate by a due date.

Bulk approval can be appropriate only if the reviewer actually considered all items and the evidence preserves the reviewed population and decision criteria.

### 5. Close every action

A review is incomplete if revocations remain in a notes column. Link each change to the native system event, verify that effective access changed, and document any risk acceptance through the organization's authorized process.

### 6. Preserve the package

Retain the population, extraction method, reviewer identity, timestamps, decisions, follow-up records, and completion approval. If a compliance tool collected the list, document its scope and test that the information is complete and accurate.

## Choose Frequency from Risk

There is no universal AICPA rule that every access review must be quarterly. Determine frequency from factors such as:

- breadth and sensitivity of privilege;
- rate of personnel and role change;
- use of standing versus temporary access;
- customer and contractual commitments;
- effectiveness of joiner, mover, and leaver automation;
- monitoring coverage;
- data sensitivity and destructive capability.

A company may review its highest-risk roles more often than lower-risk application access. State the cadence precisely and meet it. Event-driven removal when a person leaves or changes role remains necessary even when a periodic review exists; a quarterly review should not be the primary offboarding mechanism.

## What an Auditor Will Need to Understand

Expect to explain:

- how management identified every in-scope system and identity source;
- why broad access is necessary for specific roles;
- how reviewer competence and self-review conflicts are addressed;
- what decisions the review requires;
- how removals and reductions are completed;
- how access changes between reviews are authorized;
- how production actions are logged and monitored;
- why the selected cadence responds to the assessed risk.

The service auditor determines the procedures and samples. Do not promise that compensating safeguards automatically satisfy a criterion or eliminate an exception. Their relevance depends on design, operation, and the engagement facts.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [NIST: SP 800-53 Revision 5, including account management and least privilege controls](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [NIST: SP 800-63B Digital Identity Guidelines for authentication and authenticator management](https://pages.nist.gov/800-63-4/sp800-63b.html)

## Conclusion

Everyone having some production access is not the same as everyone needing every production privilege. Review effective access capability by capability, route founder-level self-review to another authorized reviewer, close every decision, and surround necessary broad access with preventive, detective, and recovery safeguards. The result should reflect the startup's real risk, not a borrowed enterprise org chart.
