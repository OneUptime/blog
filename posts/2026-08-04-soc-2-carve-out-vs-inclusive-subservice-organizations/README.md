# SOC 2 Carve-Out vs Inclusive Treatment of Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, Subservice Organizations, Cloud Security, Third-Party Risk, Audit Scope, Trust Services Criteria, Vendor Management

Description: Choose and document the carve-out or inclusive method for cloud providers without confusing vendor reliance, audit scope, or complementary controls.

---

Most SaaS companies rely on a cloud platform, identity provider, support system, and other vendors. That does not mean every vendor belongs in the SOC 2 report as a subservice organization. It also does not mean that naming AWS, Azure, or Google Cloud makes the provider's controls part of the service auditor's testing.

The first decision is whether a vendor performs services that are part of the service organization's system and whether controls at that vendor are necessary, together with the service organization's controls, to meet the applicable Trust Services Criteria. For a qualifying subservice organization, management then uses either the carve-out method or the inclusive method in its system description.

The choice changes what the report describes and what the service auditor examines. It should follow the system architecture and the availability of suitable assurance, not a marketing preference.

## Vendor Does Not Always Mean Subservice Organization

A vendor inventory is intentionally broad. It may include office suppliers, recruiting platforms, expense software, and production infrastructure. A subservice organization is a narrower reporting concept.

Start with the services and controls, not the vendor's brand:

1. What function does the vendor perform for the in-scope service?
2. Is that function part of how management meets its service commitments or system requirements?
3. Are controls at the vendor necessary for the service organization's controls to achieve the applicable criteria?
4. Does management operate additional controls to govern, configure, or monitor the dependency?

A production cloud hosting provider will often meet this analysis. A lunch-delivery vendor ordinarily will not. An identity provider, managed support provider, payment processor, or data-processing API may or may not, depending on the scoped system and commitments.

Document the conclusion for material vendors. Calling every vendor a subservice organization makes the description unreadable; omitting a critical dependency makes the system boundary misleading.

## What the Carve-Out Method Means

Under the carve-out method, management's description identifies the relevant services performed by the subservice organization but excludes the subservice organization's detailed system and controls from the scope of the service auditor's examination.

The report should make that boundary visible. Management typically describes:

- the nature of the carved-out service;
- the functions and system components that depend on it;
- the service organization's controls over selecting, configuring, and monitoring it;
- complementary subservice organization controls that management assumes the provider operates;
- how those assumed controls interact with controls operated by the service organization.

The service auditor tests the in-scope controls at the service organization according to the engagement. The auditor does not test the carved-out provider's controls merely because the provider is named. Management may use the provider's own SOC report and other monitoring as evidence for a vendor-management control, but that separate report does not silently expand the scope of the service organization's SOC 2 examination.

Carve-out is common for large cloud providers because the service organization cannot direct the provider's auditors or place the provider's control environment inside its own examination. Common does not mean automatic: management and the service auditor still need to evaluate whether the description, assumptions, and monitoring controls are appropriate.

## What the Inclusive Method Means

Under the inclusive method, the relevant subservice organization services, system components, and controls are included in management's description and in the service auditor's examination scope. The report identifies the participating subservice organization and the controls attributed to it. The engagement also requires the appropriate management representations for the included organization.

Inclusive reporting can provide readers a more integrated view when:

- the organizations have a close operational relationship;
- the subservice organization will participate in management's description and assertion process;
- the service auditor can obtain access and sufficient appropriate evidence;
- responsibilities for control ownership and evidence are stable;
- both parties accept the reporting timetable and distribution restrictions.

It is not simply a request to attach a cloud provider's SOC report. It is a broader examination scope with operational, legal, and evidence implications. For a hyperscale public cloud dependency, obtaining the necessary participation is generally impractical. For an affiliated data center or tightly integrated managed service, it may be feasible.

## Compare the Two Methods

| Question | Carve-out method | Inclusive method |
| --- | --- | --- |
| Are provider services described? | Yes, at the nature-of-services and dependency level | Yes, as part of the included system |
| Are provider controls included in the service auditor's tests? | No | Yes, for the included controls and period or date |
| Are assumed provider controls relevant? | Often described as complementary subservice organization controls | Included controls are directly described and examined |
| Does the service organization still operate vendor-governance controls? | Yes | Usually yes; inclusion does not remove management oversight |
| Is the provider's separate SOC report the same as inclusion? | No | No |
| Does either method remove user responsibilities? | No; complementary user entity controls may still apply | No; complementary user entity controls may still apply |

The method does not transfer management's responsibility for presenting the system fairly. Management must understand the dependency under either approach.

## Do Not Confuse CSOCs with CUECs

Two similar terms address different boundaries:

- **Complementary subservice organization controls**, often shortened to CSOCs, are controls management assumes a carved-out subservice organization implements.
- **Complementary user entity controls**, or CUECs, are controls user entities are expected to implement for the service organization's controls to provide reasonable assurance that commitments and requirements are achieved.

Suppose a SaaS provider uses a cloud platform. A CSOC might assume that the cloud provider restricts physical access to data centers. A CUEC might require the SaaS customer's administrators to protect their own privileged credentials. The SaaS provider may still need its own controls for logical access, secure configuration, encryption, monitoring, and vendor oversight.

Not every customer responsibility is a CUEC. Reports may describe other user entity responsibilities that help customers receive the intended benefit of the service but were not assumed in the design of the service organization's controls. Keep the report's labels intact when mapping the shared-responsibility model.

List only controls that are necessary and relevant. A generic dump of every responsibility in a vendor report makes it hard for readers to understand the actual control chain.

## Build a Defensible Cloud Dependency Record

For every potentially relevant provider, maintain a record like this:

```text
Provider: Example Cloud
In-scope service: Compute, managed database, object storage
System use: Hosts the production application and customer data
Reporting conclusion: Subservice organization, carve-out method
Reason: Provider controls are necessary for physical and infrastructure security
Our controls: Account configuration, IAM, encryption, logging, vendor review
Assumed provider controls: Defined CSOCs mapped to applicable criteria
Assurance reviewed: Current provider SOC report and bridge material, if applicable
Owner: Security and infrastructure leadership
Review date: 2026-07-15
```

Keep the record synchronized with architecture diagrams, the data-flow inventory, vendor register, risk assessment, and report description. A new managed service can change the dependency analysis even when the vendor name stays the same.

## Review the Provider's Report Without Over-Relying on It

When management relies on a carved-out provider's SOC report, review more than the cover page:

- confirm the exact provider service and region are in scope;
- read the auditor's opinion and report period;
- evaluate noted exceptions and management responses;
- identify CSOCs and CUECs that affect your system;
- compare the provider's period end with your examination period;
- assess relevant changes and any management-issued bridge letter;
- retain evidence that the review occurred and that follow-up actions were tracked.

A provider report can support management's monitoring process. It does not prove that your tenant is configured securely or that your controls operated effectively.

## Make the Decision Before the Examination Period

Late boundary decisions create evidence gaps. Before the Type II period begins:

1. Inventory critical third parties and map them to system functions.
2. Decide which are vendors only and which are subservice organizations.
3. Select carve-out or inclusive treatment with the service auditor.
4. Define the service organization's own controls and relevant complementary controls.
5. Confirm access to current provider assurance documents.
6. Establish a process for changes, exceptions, and renewal gaps.
7. Check that the system description, contracts, diagrams, and control matrix agree.

The CPA firm applies professional judgment to the engagement. Management should not promise a buyer that a provider is included until the issued report actually says so.

## Official Documentation

- [AICPA and CIMA: SOC for Service Organizations Engagements Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)
- [AICPA and CIMA: Illustrative SOC 2 Report with CSOC and CUEC examples](https://www.aicpa-cima.com/resources/download/illustrative-soc-2-r-report-with-illustrative-system-description)
- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AWS: Compliance reports and continued-operations letters](https://aws.amazon.com/compliance/faq/)
- [Google Cloud: SOC 2 report scope and access](https://cloud.google.com/security/compliance/soc-2)

## Conclusion

Carve-out keeps a subservice organization's detailed controls outside the service auditor's examination while describing the dependency and assumed controls. Inclusive treatment brings the relevant provider system and controls into scope. Classify providers from the actual control chain, document the boundary clearly, and preserve management's own configuration and monitoring evidence under either method.
