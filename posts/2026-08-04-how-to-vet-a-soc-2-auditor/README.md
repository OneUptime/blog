# How to Vet a SOC 2 Auditor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, CPA Licensure, Peer Review, Auditor Independence, Audit Quality, Sampling, Vendor Selection

Description: Vet a SOC 2 CPA firm through licensing, peer review, independence, engagement quality, evidence testing, and transparent reporting practices.

---

Choosing a SOC 2 auditor is choosing the independent practitioner whose name and opinion customers will rely on. A fast timeline, compliance-platform integration, or low fixed fee may be useful, but none substitutes for a properly licensed, independent CPA firm with relevant competence and a defensible examination process.

The diligence should verify four separate things:

1. the firm and responsible CPAs are legally authorized to provide the service;
2. the firm's peer-review status and quality history are understood;
3. independence is preserved across referral, readiness, software, and audit relationships;
4. the proposed team will perform substantive work over scope, populations, evidence, and exceptions.

This is procurement diligence, not an attempt to dictate the auditor's professional judgment.

## Verify the Legal Firm, Not Just the Brand

Obtain the exact legal name of the CPA firm that will contract, perform the examination, sign the report, and take responsibility for the opinion. Marketing sites can feature a compliance vendor, an advisory company, and an attest firm under related branding. Those roles are not interchangeable.

Ask for:

- the CPA firm's legal name and headquarters jurisdiction;
- the engagement partner's name and active CPA license jurisdiction;
- the firm's permit or registration information where applicable;
- the legal entity that will sign the report;
- any separate entity providing readiness or software services;
- an explanation of cross-state practice authority for the engagement.

Use [CPAverify](https://cpaverify.org/) as a starting point. NASBA explains that it aggregates current licensing data supplied by participating boards, but it does not hold all historical, education, employment, or complaint information. Follow the link to the relevant state board of accountancy and verify directly when records are incomplete or the jurisdiction requires a separate firm permit.

Search exact legal names. A trade name that resembles a licensed firm is not enough.

## Inspect Peer Review Status Carefully

Peer review evaluates a firm's accounting and auditing or attestation practice under the applicable program and jurisdictional requirements. Ask the proposed firm for its latest accepted peer-review report and acceptance letter, plus any letter of response or required-action completion letter that applies.

Verify:

- the reviewed firm's legal name matches the contracting attest firm;
- the review is current for the applicable cycle;
- the type and scope of peer review fit the firm's practice;
- the result was pass, pass with deficiencies, or fail;
- required corrective actions were completed where relevant;
- mergers, new entities, or practice changes do not make the document misleading.

Many records are available through the AICPA Peer Review Public File or an administering entity, but not every document is necessarily public. An empty search result is a prompt to contact the firm and administering entity, not automatic proof of either compliance or noncompliance.

Confirm that the review type covers a SOC examination practice. AICPA peer-review guidance treats SOC 1 and SOC 2 examinations as must-select engagements within a System Review when applicable; an Engagement Review for lower-level accounting work is not a substitute. Current AICPA reviewer guidance also calls for deeper work when high-volume delivery, third-party platforms, implausible timelines, or identical procedures indicate elevated SOC 2 risk.

Ask whether SOC engagements were within the firm's practice during the peer-review period and how the firm monitors SOC-specific quality. Do not claim that a particular SOC 2 engagement was selected unless the peer-review documentation supports that statement.

## Evaluate SOC 2 Competence

A valid license establishes authority, not depth of experience. Ask the partner and manager to explain how they handle:

- scoping a system across products, entities, locations, and subservice organizations;
- the AICPA Trust Services Criteria and description criteria;
- Type I versus Type II reporting;
- carve-out and inclusive presentation methods;
- privacy criteria when Privacy is in scope;
- information produced by the entity, including completeness and accuracy;
- changes to controls during a period;
- deviations, management responses, and modified opinions;
- emerging evidence sources such as infrastructure APIs and CI/CD platforms.

Request a redacted sample report or the AICPA illustrative structure the firm follows. Look for clear procedures and results, not proprietary control language or another client's confidential details.

References should come from clients with a similar delivery model and scope, with permission. A firm that has examined a traditional data center is not automatically equipped for a multi-tenant serverless platform, and the reverse is also true.

## Ask About Sampling Without Demanding a Magic Number

Professional standards do not give buyers a universal sample count for every SOC 2 control. Sample design depends on the control, frequency, population, assessed risk, expected deviation, evidence quality, and the auditor's professional judgment.

Good diligence asks about method:

- How does the team establish that a population is complete and accurate?
- How are automated, manual, periodic, and event-driven controls tested differently?
- How are samples selected and documented?
- How does the team handle empty or unexpectedly small populations?
- How are control changes during the period addressed?
- How are failed, rolled-back, emergency, and bypass transactions considered?
- What happens when supplied evidence conflicts with the source system?
- How does the team avoid relying only on screenshots or a compliance dashboard?

Be cautious if the answer is a fixed sample number for every control, if management is allowed to choose only clean examples, or if the firm never tests report parameters and population completeness.

The auditor should determine procedures independently. The prospective client may ask for transparency about the approach but should not pressure the firm to reduce work or avoid exceptions.

## Test Independence Across the Whole Commercial Arrangement

The AICPA Code requires independence in fact and appearance for attestation services. Identify every financial and operational relationship involving the attest firm, related advisory entities, the compliance-tool vendor, referral partners, and the service organization.

Ask in writing:

1. Who receives referral fees, commissions, revenue share, equity value, or other benefits?
2. Did the attest firm or an associated entity design controls, operate controls, make management decisions, or prepare the assertion?
3. Who selected the criteria, scope, control owners, and remediation decisions?
4. Can the client choose another auditor without losing access to its evidence?
5. How did the firm evaluate self-review, management-participation, advocacy, and other independence threats?
6. Which safeguards or structural separations apply?

Providing some nonattest assistance to an attest client is not universally prohibited, but the firm must comply with applicable independence interpretations and cannot assume management responsibilities. State-board rules may also apply. Ask the firm to explain its conclusion for the actual services, not merely state that a partner approved it.

## Look Beyond the Sales Timeline

An engagement proposal should identify:

- report type, categories, system, entities, locations, and period;
- anticipated use of subservice organizations;
- readiness versus examination deliverables;
- client responsibilities and evidence milestones;
- staffing by level and partner involvement;
- handling of scope changes and extra work;
- draft-review and factual-correction process;
- report issuance conditions;
- confidentiality, retention, and secure evidence exchange;
- fees, dependencies, and assumptions.

Treat a guaranteed clean opinion or guaranteed zero exceptions as a disqualifying signal. The firm cannot know its conclusion before performing the examination. A promised report date should be conditional on readiness, evidence availability, completion of procedures, and required quality review.

## Interview the Delivery Team

The sales lead may not perform the work. Meet the partner, manager, and primary testing team and use a short case:

> A production deployment population contains 480 events. Twelve are emergency deployments, seven were rolled back, and three lack a linked pull request. Explain how you would establish the population, select procedures, and evaluate the results.

A strong answer should explore the control wording, population source, exclusions, timing, emergency-change procedure, other evidence, and effect of deviations. It should not immediately promise that three missing links will be ignored or will qualify the report.

Also ask who makes final technical decisions, who reviews test work, whether contractors or offshore teams participate, and how access to confidential evidence is controlled.

## Use a Weighted Selection Record

Score evidence rather than impressions:

| Area | Suggested evidence |
| --- | --- |
| Licensure and authority | CPAverify and state-board records for firm and partner |
| Peer review | Latest accepted report, acceptance letter, responses and completion letters |
| Independence | Written relationship map and firm conclusion for proposed services |
| SOC competence | Named team, relevant experience, sample report, technical interview |
| Examination quality | Population, information-reliability, sampling, and exception approach |
| Scope fit | Written agreement on system, criteria, period, and subservice boundaries |
| Operations | Secure portal, staffing, milestones, escalation, and quality review |
| Commercial terms | Comparable fee assumptions, change-order terms, and no opinion guarantee |

Retain the selection memo. A lower-priced firm can be the right choice when its authority and method are sound; a famous name can be the wrong choice when staffing or scope does not fit.

## Official Documentation

- [NASBA: What is CPAverify](https://nasba.org/blog/2023/11/13/what-is-cpaverify/)
- [CPAverify: Official license lookup](https://cpaverify.org/)
- [AICPA and CIMA: Peer review as a component of audit quality](https://www.aicpa-cima.com/news/article/peer-review-a-vital-component-in-audit-quality)
- [Journal of Accountancy: AICPA guidance for peer reviewers addressing SOC 2 risks](https://www.journalofaccountancy.com/issues/2026/may/aicpa-guides-peer-reviewers-to-address-soc-2-risks/)
- [AICPA and CIMA: Links to Peer Review Administering Entities](https://www.aicpa-cima.com/resources/article/peer-review-links)
- [AICPA and CIMA: SOC services notice on licensure and peer review](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)
- [AICPA Professional Ethics Division: Ethics risks with SOC tool providers](https://www.journalofaccountancy.com/issues/2026/apr/soc-engagements-ethics-risks-with-tool-providers/)
- [AICPA and CIMA: FAQs on software tools in SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)

## Conclusion

Vet the exact attest firm through state licensing records, peer-review evidence, SOC 2 competence, independence, and examination method. The most useful auditor is not the one promising a clean report fastest; it is the independent CPA firm that defines scope clearly, tests reliable evidence, reports exceptions honestly, and can defend its professional judgment.
