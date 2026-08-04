# SOC 2 Readiness Consultant vs CPA Auditor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Audit Readiness, CPA Auditor, Auditor Independence, Governance, Controls, Compliance Consulting

Description: Separate readiness advice from the independent SOC 2 examination while keeping scope, control design, evidence, and management decisions properly owned.

---

A readiness consultant and a SOC 2 service auditor can examine the same control matrix, ask for similar evidence, and identify similar gaps. Their responsibilities are still fundamentally different.

The consultant helps management prepare. The independent CPA performs an attestation examination and expresses an opinion. Management remains responsible for the system, its description, its assertion, the selection and application of criteria, and the design, implementation, and operation of controls.

The practical boundary is not that advisers may never suggest anything. It is that advice must not become management decision-making, and an attest firm must evaluate independence under the AICPA Code and applicable state rules for the actual combination of services.

## Three Roles, Three Accountabilities

| Role | Primary purpose | What the role does not transfer |
| --- | --- | --- |
| Management | Own the system, commitments, risks, controls, description, and assertion | Responsibility cannot be outsourced to consultant or auditor |
| Readiness consultant | Help identify gaps and organize a sustainable readiness program | Does not issue the independent SOC 2 opinion |
| Service auditor | Independently examine the subject matter and express an opinion under professional standards | Does not operate the client's controls or make management decisions |

Software vendors, penetration testers, lawyers, and internal audit may add other roles. Put every participant on the map so that a bundled commercial package does not hide who is responsible for each deliverable.

## Appropriate Readiness Work

A readiness consultant can add value by helping management understand the reporting framework and expose weaknesses before the examination period. Typical work can include:

- facilitating system-boundary and data-flow workshops;
- comparing management's draft description with the AICPA description criteria;
- mapping existing controls to applicable Trust Services Criteria;
- identifying missing owners, evidence, or process steps;
- reviewing control language for testable, accurate statements;
- running dry-run evidence requests and population exports;
- creating remediation options and implementation plans;
- training control owners on evidence retention;
- coordinating preparation across security, engineering, HR, legal, and operations.

The consultant may recommend alternatives. Management should select the scope, decide which controls to implement, set control frequencies, approve policies, accept risks, and determine whether the resulting system reflects its commitments.

For example, a consultant can explain several ways to restrict production access. The authorized management owner decides which design fits the company, directs implementation, evaluates whether it works, and accepts responsibility for it.

## Work That Crosses into Management Responsibility

Red flags appear when an adviser or prospective auditor:

- acts as the control owner;
- approves access, vendors, risks, policies, or changes for management;
- decides which exceptions management will accept;
- operates the evidence collector without management oversight;
- prepares and approves management's assertion;
- determines scope or criteria without management's informed approval;
- represents that the adviser, rather than management, is responsible for the system description;
- selects only clean evidence and removes failed transactions from populations.

A document's author field does not settle the issue. A consultant can help draft a policy, but a competent management owner must understand, evaluate, approve, implement, and maintain it. Copying generic language into an approved PDF is not meaningful ownership.

## What the Independent CPA Must Preserve

The service auditor must be independent in fact and appearance and comply with applicable ethics, attestation, quality-management, and licensing requirements. Independence risks can arise when the same firm or an associated entity provides readiness, implementation, software, referral, or other nonattest services.

The AICPA's nonattest-services interpretations do not reduce to a blanket rule that the attest firm may never advise an attest client. They require evaluation of the services and threats, satisfaction of management-responsibility conditions, and safeguards where permitted and effective. Some services or circumstances impair independence. State-board requirements may be more restrictive.

Ask the CPA firm to document its independence conclusion for the actual arrangement, including:

- services supplied before and during the examination;
- financial ties, commissions, referral payments, and related entities;
- whether the firm helped configure a compliance platform or controls;
- who made every material management decision;
- how self-review and management-participation threats were evaluated;
- what safeguards and engagement-team separations apply.

Changing the logo on a related consulting entity does not by itself resolve a threat. An internal team separation also cannot cure a relationship the Code prohibits or a significant threat that available safeguards do not eliminate or reduce to an acceptable level. Conversely, buying readiness and audit services from one firm is not automatically prohibited in every circumstance. The facts and applicable rules control.

## Advice Ends Where Independent Testing Begins

Use these examples to make the boundary concrete:

| Activity | Readiness role | Auditor role | Management role |
| --- | --- | --- | --- |
| Control mapping | Propose mappings and identify gaps | Evaluate controls against criteria | Approve design and own accuracy |
| Evidence dry run | Check whether artifacts support stated attributes | Independently determine and perform procedures | Supply complete, reliable information |
| Population export | Help define a reproducible export | Test relevance, completeness, and accuracy as needed | Own source access and export process |
| Exception | Suggest remediation options | Evaluate test result and reporting effect | Investigate, remediate, and respond truthfully |
| System description | Facilitate or provide drafting assistance | Examine whether description meets criteria | Prepare, approve, and assert responsibility |
| Opinion | No role | Express independent conclusion | Receive and distribute under report terms |

The audit team may request corrections to factual inaccuracies and communicate findings. It should not promise the desired opinion, choose management's response, or manufacture evidence.

## Choose an Operating Model

### Separate readiness and audit providers

This often makes roles easier to explain and reduces perceived self-review pressure. It can also create duplicated onboarding, conflicting advice, and additional coordination. Management must arbitrate differences rather than treating either provider as the control owner.

### One CPA firm provides permitted readiness assistance and the audit

This may reduce handoffs, but the firm must evaluate independence and structure the services accordingly. Get a precise statement of what readiness work is included, who performs it, and what management must do. Do not accept a sales claim that separation inside a portal settles independence.

### Internal readiness with an independent audit firm

An experienced internal security, compliance, or internal-audit team can run readiness. This keeps system knowledge in-house but consumes significant internal time and requires technical reporting expertise. External specialists can still address narrow areas such as privacy, penetration testing, or employment law.

There is no universal model required by SOC 2. Choose based on competence, independence, complexity, and sustainable ownership.

## Establish a Readiness-to-Audit Handoff

Before the examination period, management should approve a handoff package containing:

1. the legal service organization and system boundary;
2. selected Trust Services Categories and applicable criteria;
3. current system description and architecture;
4. risk assessment and service commitments;
5. control matrix with named owners and actual frequencies;
6. subservice organization analysis;
7. evidence specifications and authoritative populations;
8. open gaps, accepted risks, and remediation dates;
9. readiness limitations and unresolved judgment areas;
10. management confirmation that controls are implemented and owned.

The service auditor independently plans and performs the examination. A readiness conclusion is not evidence that the controls operated effectively.

## Questions to Put in Both Engagement Letters

- Which legal entity performs each service?
- Which deliverables are advice, management-prepared information, or auditor work product?
- Who owns the control matrix and system description after the engagement?
- Can management export its evidence if it changes providers?
- How are independence threats evaluated and communicated?
- Who investigates and decides remediation for exceptions?
- Are fees contingent on a clean opinion or report issuance? They should not be framed that way.
- What happens when readiness advice conflicts with the auditor's professional judgment?

Keep the answers with the vendor-selection record. Independence is a continuing condition, not a one-time checkbox at contracting.

## Official Documentation

- [AICPA and CIMA: Professional responsibilities, objectivity, and independence](https://www.aicpa-cima.com/resources/article/professional-responsibilities)
- [AICPA and CIMA: Standards and Statements, including the Code of Professional Conduct](https://www.aicpa-cima.com/resources/landing/standards-and-statements)
- [AICPA Professional Ethics Division: Ethics risks with SOC tool providers](https://www.journalofaccountancy.com/issues/2026/apr/soc-engagements-ethics-risks-with-tool-providers/)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: FAQs on software tools in SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)

## Conclusion

Readiness consultants can teach, facilitate, map, and recommend. Management must decide, own, operate, describe, and assert. The CPA auditor must independently examine and report. Make those boundaries explicit in contracts and day-to-day work so useful advice never turns into outsourced management or compromised assurance.
