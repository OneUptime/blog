# Is a Penetration Test Required for SOC 2?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Penetration Testing, Trust Services Criteria, Vulnerability Management, Risk Assessment, Security Testing

Description: Determine whether a penetration test belongs in your SOC 2 control environment by tracing criteria to risk, commitments, evaluation methods, and retained remediation evidence.

---

SOC 2 does not contain a standalone command that every service organization must buy the same annual third-party penetration test. The AICPA Trust Services Criteria are criteria, not a fixed technology checklist.

That is not the same as saying penetration testing is irrelevant. Under common criterion CC4.1, a point of focus names penetration testing among the types of ongoing or separate evaluations management may use when assessing whether internal-control components are present and functioning. Points of focus help explain important characteristics of a criterion; they are not a list of separate requirements that must all be implemented in every situation.

A penetration test may become necessary for a particular organization because:

- its risk assessment shows that adversarial testing is an appropriate response;
- a customer contract or security commitment requires it;
- management's policy or stated control promises it;
- management identifies an assurance gap after considering the selected controls and evidence, while the service auditor independently evaluates whether the evidence obtained is sufficient and appropriate;
- a regulator or another framework applicable to the organization requires it;
- report users expect it as a condition separate from SOC 2.

The defensible answer is therefore a trace, not a slogan.

## Follow the Traceability Chain

Use this sequence:

```text
Service commitment or system requirement
  -> threat and vulnerability risk
  -> applicable Trust Services Criterion
  -> selected control and evaluation method
  -> test scope and timing
  -> findings, remediation, and retest evidence
```

If the chain ends with a penetration test, make it a real control activity. If management selects another combination of evaluations, document why that combination addresses the risk and discuss it with the CPA firm before the examination period.

## Where Penetration Testing Fits in the Criteria

Several parts of the common criteria can be relevant, depending on what the test is designed to evaluate:

- **CC3 risk assessment:** management identifies threats, vulnerabilities, changes, and risks to objectives.
- **CC4 monitoring activities:** management uses ongoing and separate evaluations to determine whether internal-control components are present and functioning. The CC4.1 points of focus explicitly include penetration testing as one possible type of evaluation.
- **CC6 logical and physical access:** test results may provide evidence about the design and implementation of protections against unauthorized access.
- **CC7 system operations:** findings can inform vulnerability identification, monitoring, incident detection, evaluation, and remediation.
- **CC9 risk mitigation:** it may be relevant when the test supports a specific risk response, but a penetration test does not map to CC9 automatically.

A report should not map a penetration test mechanically to every criterion. Document which test activity, target, and result bears on which risk and control.

## Ask Four Questions Before Deciding

### 1. What could an attacker reach or abuse?

Inventory the real attack surface:

- internet-facing web applications and APIs;
- mobile applications and supporting APIs;
- cloud control planes and identity paths;
- tenant-isolation boundaries;
- administrative and support interfaces;
- production networks and hosts;
- CI/CD, source control, artifacts, and secrets;
- externally exposed vendor integrations;
- high-risk business logic.

A generic external network test may not address a SaaS product whose primary risk is authorization failure between tenants. Conversely, a web-only test may miss exposed infrastructure and cloud privilege escalation.

### 2. Which other evaluations already operate?

Consider the full assurance program:

- threat modeling and architecture review;
- code review and automated security testing;
- dependency, container, and infrastructure scanning;
- cloud configuration monitoring;
- vulnerability disclosure and bug bounty programs;
- red-team or purple-team exercises;
- internal audit and control self-assessment;
- independent certifications or assessments;
- detection and incident-response exercises.

These activities are not automatically substitutes for a penetration test. They evaluate different things. The question is whether the combined design responds to the identified risks and supports the relevant controls.

### 3. What did management promise?

Search contracts, security pages, questionnaires, policies, and control descriptions for commitments such as:

- annual independent penetration testing;
- testing after significant changes;
- coverage of application and infrastructure layers;
- use of a qualified external tester;
- remediation within risk-based deadlines;
- sharing an executive summary.

Once management makes a relevant promise, failing to perform it can be an exception or contractual issue even if the promise was not universally required by SOC 2. Correct inaccurate language prospectively through proper governance; do not rewrite history after a missed test.

### 4. What evidence will the auditor need?

Discuss the intended control and test with the service auditor. The auditor decides whether evidence is sufficient and appropriate and evaluates control design and operation. A readiness consultant or tool cannot guarantee that an artifact will be accepted.

## Penetration Test and Vulnerability Scan Are Not Synonyms

A vulnerability scanner compares observed software or configurations with rules and known issues at scale. A penetration test uses a defined methodology and human analysis to explore attack paths, validate whether weaknesses are exploitable, and assess impact within authorized boundaries.

| Dimension | Vulnerability scanning | Penetration testing |
| --- | --- | --- |
| Primary strength | Repeatable breadth and frequent detection | Contextual, adversarial validation and attack chaining |
| Typical operation | Automated or heavily automated | Human-led with tools |
| Output | Potential vulnerabilities and configuration findings | Validated weaknesses, attack paths, impact, and evidence |
| Frequency | Often continuous or recurring | Usually periodic or change/risk-triggered |
| Limitation | False positives and limited business logic | Point-in-time scope and tester/time constraints |

Both may be appropriate. Neither proves the system is vulnerability-free.

## Scope the Test from Risk, Not the Audit Logo

A useful rules-of-engagement document defines:

- legal authorization and named contacts;
- in-scope domains, IP ranges, APIs, applications, accounts, and environments;
- tenant-isolation scenarios and test accounts;
- authenticated and unauthenticated perspectives;
- cloud-provider testing policies and prohibited actions;
- social engineering, physical access, denial of service, and destructive techniques as included or excluded;
- test dates and change freeze assumptions;
- data handling, retention, and secure report delivery;
- severity method and reporting expectations;
- emergency stop and incident-escalation process;
- retest expectations.

Scope exclusions should be visible. A clean report over a marketing site should not be presented as assurance over an untested production API.

NIST SP 800-115 provides guidance for planning, executing, and conducting post-testing activities for information-security assessments. OWASP's Web Security Testing Guide provides a detailed framework for web application and service testing. Neither source turns one methodology into a universal SOC 2 requirement; they help management design a competent test.

## Independence and Competence Are Contextual

The Trust Services Criteria do not impose a single tester certification or declare that every penetration test must be performed by an unrelated third party. Objectivity and competence matter to the usefulness of a separate evaluation, and customer contracts may explicitly require an independent provider.

Assess:

- technical skill for the architecture and attack surface;
- organizational independence from the system builders;
- conflicts of interest;
- methodology and quality review;
- secure evidence handling;
- ability to explain and retest findings.

Also consider auditor independence. AICPA ethics guidance distinguishes certain separate evaluations from ongoing management monitoring and explains circumstances in which a CPA firm's attack and penetration services for an attest client can impair independence. The service auditor should evaluate its own independence; management should not assume that bundling the test with the SOC 2 engagement is always permissible.

## Evidence Does Not End with the Report

Preserve a complete package:

1. risk assessment and rationale for the test;
2. provider selection and competence review;
3. signed authorization and rules of engagement;
4. scope inventory and exclusions;
5. dates, methodology, and test environment;
6. final report with findings and severity;
7. management's disposition for every finding;
8. remediation tickets and due dates;
9. evidence of corrected code or configuration;
10. retest results or documented risk acceptance by authorized management;
11. linkage to incidents or broader corrective action where applicable.

A penetration-test cover page may identify a test and its stated dates. By itself, it does not establish that the planned procedures were completed, that findings were resolved, or that the test covered the SOC 2 system.

## Timing and Frequency Are Not Universal

Annual testing is common because organizations and buyers often choose that cadence. The AICPA criteria do not create a universal annual rule for every service.

Set frequency using:

- rate and significance of system change;
- exposure and data sensitivity;
- results of previous tests and other monitoring;
- threat intelligence and incident history;
- customer and regulatory commitments;
- release of major features or architectural changes;
- dependence on the test as a control evaluation.

A major authentication rewrite soon after an annual test may justify targeted retesting. A test performed just outside a Type II period may still be relevant to design or risk assessment, but do not assume it proves operation within the period. Agree evidence timing with the service auditor.

## A Practical Decision Record

Write one of two conclusions and support it.

### Penetration test selected

State the risks, criteria, control wording, scope, provider, cadence or trigger, remediation process, evidence owner, and customer commitments.

### Another evaluation mix selected

State the same risks and criteria, the alternative ongoing and separate evaluations, how they cover the attack surface, why they provide appropriate challenge, and who approved the residual risk. Review the conclusion with the CPA firm and any buyer that separately requires a test.

Avoid the conclusion `SOC 2 does not require it, so we did nothing`. Even when a particular technique is not universally prescribed, the underlying risks and criteria still require a designed response.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: Ethics tools and aids, including Ethics Questions and Answers](https://www.aicpa-cima.com/resources/landing/ethics-tools-and-aids)
- [NIST: SP 800-115 Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final)
- [OWASP: Web Security Testing Guide stable documentation](https://owasp.org/www-project-web-security-testing-guide/stable/)

## Conclusion

Penetration testing is explicitly recognized in a CC4.1 point of focus as one possible evaluation technique, but SOC 2 does not prescribe the same test to every organization. Trace the decision from commitments and risk to criteria, controls, scope, evidence, and remediation. If the test is promised or selected, perform and evidence the whole lifecycle, not just the scan date.
