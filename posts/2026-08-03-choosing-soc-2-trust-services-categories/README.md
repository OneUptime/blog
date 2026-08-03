# Choosing SOC 2 Trust Services Categories Without Overscoping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Trust Services Categories, Security, Availability, Confidentiality, Processing Integrity, Privacy, Audit Scope

Description: Select SOC 2 categories from service commitments, system requirements, buyer needs, and risk instead of adding criteria that do not improve the report.

---

Adding every Trust Services Category does not automatically make a SOC 2 report better. It makes the examination address more criteria, which is valuable only when those criteria are relevant to the service and the people using the report.

The AICPA Trust Services Criteria are organized around Security, Availability, Processing Integrity, Confidentiality, and Privacy. The common criteria associated with Security form the base used in SOC 2 examinations. Additional category-specific criteria apply when Availability, Processing Integrity, Confidentiality, or Privacy is included.

The selection should follow the service organization's facts:

- principal service commitments and system requirements;
- risks that could prevent those commitments and requirements from being met;
- the nature of information and processing in the service;
- contractual or procurement requirements of intended report users;
- whether the resulting scope can be described, controlled, and evidenced.

Management selects the categories after considering report-user needs and should discuss the planned scope with the service auditor before the examination period. The service auditor evaluates whether the selected criteria are suitable and available for the engagement. A sales questionnaire is an input, not the scoping authority by itself.

## What Each Category Is Trying to Address

### Security

Security concerns protection of information and systems against unauthorized access, unauthorized disclosure, and damage that could compromise the system and its objectives. The common criteria cover the broader internal-control foundation: governance, communication, risk assessment, monitoring, control activities, logical and physical access, system operations, change management, and risk mitigation.

Security is broader than a list of cybersecurity tools. It includes how management assigns responsibility, assesses risk, operates controls, responds to events, and oversees vendors.

Select the Security base because it is foundational to SOC 2, but still scope the system carefully. It does not make every corporate application or every security practice part of the report automatically.

### Availability

Availability concerns whether information and systems are available for operation and use to meet the entity's objectives. Its additional criteria focus on matters such as capacity, environmental protections, backup and recovery in the context of the organization's risks and commitments.

Availability does not prescribe a universal uptime percentage, require zero downtime, or prove that every service-level target was always achieved. Management's commitments and system requirements define the relevant availability objectives.

Availability is commonly relevant when:

- contracts include uptime, recovery, or continuity commitments;
- customers rely on the service for time-sensitive operations;
- loss of service creates significant customer impact;
- resilience and recovery are frequent buyer concerns.

It may add little if the report users have no availability concern beyond the security controls already in scope and management has made no meaningful availability commitment. Confirm that conclusion with the intended users and CPA firm rather than assuming.

### Confidentiality

Confidentiality concerns protection of information that the organization designates as confidential. The designation may come from contracts, policy, classification, law, regulation, or other commitments. The additional criteria address identifying confidential information and protecting it through its lifecycle, including disposal.

Confidentiality is relevant when the service handles information such as:

- customer business records or source code;
- proprietary models, designs, or financial data;
- authentication secrets and cryptographic material;
- contractually restricted support content;
- other classified nonpublic information.

Security and Confidentiality overlap, but they are not interchangeable. Security establishes the broad protective control environment. Confidentiality adds focus on information designated confidential and the commitments governing its protection.

### Processing Integrity

Processing Integrity concerns whether system processing is complete, valid, accurate, timely, and authorized to meet objectives. It is about the service's processing behavior, not merely database integrity or protection against attackers.

It can be relevant when customers depend on the system to:

- calculate amounts or transform records;
- accept, validate, and route transactions;
- produce complete and accurate outputs;
- execute workflows within defined time constraints;
- reject duplicates or unauthorized inputs.

Do not add Processing Integrity just because the application processes data. Identify specific processing commitments, failure modes, controls, and evidence. If the intended users only seek assurance over security and confidentiality, this category may not answer an additional need.

### Privacy

Privacy concerns personal information and the organization's privacy objectives across collection, use, retention, disclosure, and disposal. It is not a synonym for Confidentiality.

Confidential information can be nonpersonal, and personal information can be governed by requirements beyond secrecy, including notice, choice and consent, access, correction, retention, disclosure, and monitoring. The Privacy category should be considered when report users need assurance about those privacy activities and management can describe the applicable privacy commitments and practices.

Including Privacy does not declare compliance with every privacy law. Management must separately determine applicable legal and regulatory obligations, with qualified legal advice where needed. A SOC 2 examination evaluates the scoped description and controls against the applicable criteria; it is not a regulator's legal opinion.

## Use a Commitment-to-Category Matrix

Collect actual statements from contracts, product documentation, security materials, privacy notices, and internal requirements. Map each one to a category only when the category adds relevant criteria.

| Commitment or user need | Likely category consideration | Question to resolve |
| --- | --- | --- |
| Protect the platform from unauthorized access | Security | Which system and access paths support the service? |
| Maintain stated uptime and recovery objectives | Availability | What are the exact capacity, backup, and recovery requirements? |
| Protect customer source code as confidential | Confidentiality | How is it identified, retained, shared, and disposed? |
| Produce complete and accurate billing calculations | Processing Integrity | Which inputs, transformations, outputs, and timing rules matter? |
| Handle personal information under stated privacy practices | Privacy | Which notices, uses, disclosures, rights, retention, and disposal apply? |

One commitment may implicate several categories. For example, a hosted payroll service may need Security for access, Availability for payroll deadlines, Confidentiality for salary data, Processing Integrity for calculations, and Privacy for employee information. A simple uptime monitor may have a different set.

## Ask Buyers for the Actual Requirement

When a buyer says `SOC 2 with Security, Availability, and Confidentiality`, confirm:

- whether all three are a contract condition or a questionnaire default;
- which product and data use led to the request;
- whether a current report with Security only is acceptable temporarily;
- whether the buyer needs criteria coverage or a separate contractual assurance such as an SLA;
- whether Privacy or Processing Integrity is actually the concern being described imprecisely;
- whether the report period and system boundary must meet other conditions.

Do not represent an in-progress category as already covered. If a buyer requires a category not in the current report, identify the gap and agree a truthful plan.

## Calculate the Real Cost of Adding a Category

The cost is not merely an extra auditor fee. For each proposed category, identify:

1. commitments and system requirements that must be described;
2. risks that must be assessed;
3. systems, data, people, and vendors added to the boundary;
4. existing controls that already address the criteria;
5. new or redesigned controls needed;
6. recurring evidence and complete populations;
7. additional exceptions and disclosures that could result;
8. owners who must sustain the process after report issuance.

Availability might add capacity monitoring, backup restoration, continuity, and recovery evidence. Confidentiality might require a defensible classification inventory and lifecycle controls. Privacy can add substantial operational scope across product, legal, support, and data-subject processes. Processing Integrity may require end-to-end transaction populations and error handling.

The same control can support multiple criteria when it genuinely addresses each objective, but copying one artifact into several folders does not establish that relationship.

## Watch for Category Myths

### Myth: More categories mean a stronger opinion

The opinion applies to the scoped description and applicable criteria. Adding irrelevant criteria increases breadth, not the quality of control design or testing.

### Myth: Availability proves the SLA

The category addresses controls relevant to availability objectives. Read the description, commitments, controls, auditor's tests, and results. Do not infer a contractual uptime result from the category label alone.

### Myth: Confidentiality automatically covers privacy

Confidentiality focuses on designated confidential information. Privacy addresses personal information and privacy commitments across a wider lifecycle.

### Myth: Security covers every cybersecurity promise

Only the system, period, controls, and commitments described in the report are examined. A Security label does not extend the boundary.

### Myth: The AICPA supplies a mandatory control checklist for each category

The criteria state outcomes and include points of focus that help explain important characteristics. Management designs controls for its risks and facts; points of focus are not a universal set of separately required controls.

## Record the Category Decision

Maintain a decision memo containing:

- intended report users and their stated needs;
- scoped services and principal commitments;
- categories included and why;
- categories not included and why;
- contractual requests and any agreed roadmap;
- risk-control mapping for each selected category;
- systems and vendors added by the decision;
- evidence owners and readiness results;
- approval by management and discussion with the CPA firm.

Revisit the decision when the service, data types, contracts, or user needs change. A category that was unnecessary for the first report may become important after the product begins processing regulated personal information or supporting mission-critical workflows.

## Official Documentation

- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: Privacy Considerations in a SOC 2 Examination, identified as nonauthoritative guidance](https://www.aicpa-cima.com/resources/download/privacy-considerations-in-a-soc-2-r-examination)
- [AICPA and CIMA: SOC for Service Organizations Engagements Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)

## Conclusion

Security is the SOC 2 foundation; additional categories should answer real questions about availability, processing, confidential information, or personal information. Trace each choice to commitments, system requirements, risks, and report-user needs. The smallest truthful scope that answers those needs is more useful than an oversized report built for the category count.
