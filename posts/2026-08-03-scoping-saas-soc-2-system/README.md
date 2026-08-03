# Scoping a SaaS SOC 2 System: Components, Data, and Vendors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, SaaS, System Scope, Description Criteria, Cloud Security, Data Flows, Subservice Organizations

Description: Define a defensible SaaS SOC 2 boundary by tracing customer commitments through products, dependencies, cloud environments, people, procedures, data, and vendors.

---

The SOC 2 boundary is not the list of resources that a scanner happens to discover. It is the service organization's system used to provide the in-scope services, described for report users and evaluated against the applicable Trust Services Criteria.

The AICPA's description criteria require management to prepare a description of the service organization's system. That description addresses the nature of the services and relevant components such as infrastructure, software, people, procedures, and data. It also addresses boundaries, principal service commitments and system requirements, identified system incidents that resulted from controls that were not suitably designed or operating effectively or otherwise caused a significant failure to achieve those commitments and requirements, and relevant subservice organizations as applicable. For a Type II description, it also addresses significant changes to the system and controls during the period.

For a SaaS provider, scope should follow the customer service and its risks. Begin with commitments, trace the delivery chain, and document every inclusion and exclusion.

## Start with the Service Users Think They Buy

Write a concise service statement:

```text
Acme provides a hosted workflow application and API to business customers.
The in-scope system processes customer account data and workflow content in the
production environment and includes customer support needed to operate the service.
```

Then test it against reality:

- Which user interfaces, APIs, mobile applications, and integrations deliver the service?
- Are separate product editions built on the same control environment?
- Does a legacy product still process customer data?
- Are preview or beta features available to production customers?
- Does support have a privileged path into customer tenants?
- Are customer-facing status, authentication, billing, or notification services necessary to meet commitments?

Do not call the scope `the SaaS platform` without naming what that means. Report users need to understand whether the product they use is included.

## Anchor Scope in Commitments and Requirements

Principal service commitments are promises management makes to user entities and others, while system requirements are specifications for how the system should function to meet those commitments, comply with relevant laws, regulations, and industry guidelines, and achieve other relevant objectives. Sources can include:

- customer contracts and data-processing terms;
- security and privacy statements;
- service-level commitments;
- product documentation;
- internal architecture and security requirements;
- regulatory obligations management has determined apply;
- policies and risk decisions.

Build a traceability chain:

```text
Commitment or requirement
  -> risk to meeting it
  -> applicable Trust Services Criterion
  -> system component
  -> control
  -> evidence
```

If a customer commitment depends on a component, excluding that component requires a coherent explanation. Scope is not defensible when marketing promises encryption, availability, or deletion while the systems implementing those promises are omitted.

## Inventory the Five System Components

### 1. Infrastructure

Include the physical and virtual infrastructure relevant to the service, whether operated by the organization or a provider:

- production cloud organizations and accounts;
- regions and availability zones;
- networks, load balancers, compute, orchestration, and storage;
- managed databases, queues, caches, and serverless services;
- DNS, certificates, content delivery, and edge security;
- backup, disaster recovery, and logging infrastructure;
- employee endpoints or office infrastructure when they perform relevant control functions.

Do not include every development sandbox by reflex. Include nonproduction environments when they can affect production, contain in-scope data, host control operation, or are necessary to understand relevant change and testing procedures. State the rationale.

### 2. Software

Inventory more than the application repository:

- customer-facing application and API code;
- infrastructure as code;
- CI/CD and artifact registries;
- identity, secrets, and key-management systems;
- monitoring, alerting, case-management, and support tools;
- administrative portals and internal control tooling;
- third-party libraries or hosted software with material roles.

Map repositories to deployed services and owners. A source repository that cannot be connected to a production workload is not a reliable scope inventory.

### 3. People

Scope relevant roles and responsibilities, not only full-time engineering employees:

- executives responsible for governance and commitments;
- engineering, operations, security, and IT;
- customer support with data or administrative access;
- human resources for workforce lifecycle controls;
- legal, privacy, vendor, and risk owners as applicable;
- contractors and managed-service personnel;
- control owners and approvers.

People can be relevant even without production access. For example, HR may trigger access removal, and procurement may operate vendor-risk controls.

### 4. Procedures

Procedures are the automated and manual activities used to operate and control the service:

- access authorization and review;
- secure development and deployment;
- vulnerability and patch management;
- monitoring and incident response;
- backups, restoration, continuity, and capacity management;
- vendor selection and monitoring;
- data retention and deletion;
- workforce onboarding, training, and offboarding;
- risk assessment and governance review.

A tool does not replace the procedure. Describe who acts, what triggers the action, which information they evaluate, and how completion is recorded.

### 5. Data

Trace data through its lifecycle:

- customer content and account metadata;
- credentials, tokens, and cryptographic keys;
- logs, telemetry, backups, and derived analytics;
- support attachments and exports;
- employee and contractor data used by controls;
- configuration and evidence records.

Document collection, transmission, processing, storage, replication, backup, retention, deletion, and return. Classifications should match the organization's confidentiality and privacy decisions.

## Scope Cloud Accounts by Dependency and Control

For each cloud organization, account, subscription, project, or cluster, classify it:

| Classification | Example |
| --- | --- |
| Direct service delivery | Production application account |
| Shared control plane | Organization identity, logging, security, or CI/CD account |
| Recovery | Backup or disaster-recovery account |
| Nonproduction with production impact | Build system that publishes production artifacts |
| Nonproduction without relevant impact | Isolated experiment with synthetic data and no deployment path |
| Excluded with rationale | Dormant account blocked from production and customer data |

Central security, identity, logging, and deployment accounts are easy to omit because they do not host customer workloads. They may be more important to the controls than an individual workload account.

Validate the list against organization APIs, billing, infrastructure code, single sign-on assignments, security tooling, and network connectivity. A manually maintained spreadsheet should not be the only evidence of completeness.

## Follow Data Across Vendor Boundaries

Cloud providers, payment processors, support platforms, email services, identity providers, and monitoring vendors may perform functions relevant to the service. Determine whether each is a vendor generally or a subservice organization relevant to the scoped system and criteria.

SOC reports can present relevant subservice organizations using methods addressed by AICPA guidance. In simplified terms:

- Under a carve-out presentation, the service organization's description identifies the relevant subservice functions, but the subservice organization's controls are excluded from the scope of the service auditor's examination. The description includes complementary subservice organization controls assumed in the design where applicable.
- Under an inclusive presentation, the description and examination include the relevant subservice organization's controls, which requires the necessary participation and evidence.

Do not assume that listing AWS as a vendor makes AWS-controlled infrastructure disappear from the system narrative. Describe the function, presentation method, expected complementary controls, and the service organization's own monitoring and customer-side responsibilities.

Management should select the presentation method and discuss it with the CPA firm, which evaluates the description and reporting implications. The method has formal reporting implications that cannot be selected by a generic blog checklist.

## Define Interfaces and Boundaries

For every major component, record:

- owner and operator;
- environment and location;
- data handled;
- inbound and outbound interfaces;
- authentication and trust relationship;
- customer or vendor responsibility;
- relevant risks and controls;
- inclusion status and rationale.

Then draw at least three views:

1. **Service architecture:** user entry points and runtime dependencies.
2. **Data flow:** data types, stores, transfers, backups, and deletion paths.
3. **Control plane:** identity, source control, CI/CD, logging, security, support, and evidence systems.

One architecture diagram rarely explains all three.

## Avoid Common Scoping Errors

- **Scanner scope:** including only assets supported by a compliance connector.
- **Production-only scope:** omitting CI/CD, identity, logging, support, and backup systems that control production.
- **Entity-wide default:** including every corporate application without connecting it to the scoped service or controls.
- **Product-name ambiguity:** assuming an umbrella brand tells report users which features are covered.
- **Current-state inventory:** missing resources or workers removed during the Type II period.
- **Vendor disappearance:** excluding outsourced functions without describing dependencies and responsibilities.
- **Data blind spots:** omitting logs, backups, support exports, or analytics derived from customer data.
- **Policy mismatch:** promising a boundary in policy that differs from deployment and evidence collection.

## Operate Scope as a Controlled Inventory

Assign an owner and update the inventory when:

- a product, region, or cloud account is launched;
- a service migrates or a vendor changes;
- a new data type is processed;
- a support or administrative path is added;
- an acquisition or legal-entity change occurs;
- a major incident exposes an unrecorded dependency;
- a control moves to another system.

During a Type II period, record significant changes with dates and discuss them with the service auditor. A system can change during the period, but management's description must remain fairly presented and the controls must continue to provide reasonable assurance that service commitments and system requirements are achieved based on the applicable criteria.

## Scope Approval Checklist

- In-scope services are named in customer language.
- Commitments and requirements are documented.
- All five system components are inventoried.
- Cloud accounts reconcile to authoritative organization data.
- Shared identity, CI/CD, logging, support, and recovery planes are assessed.
- Data flows include logs, backups, exports, and deletion.
- Relevant people include contractors and business control owners.
- Vendor and subservice functions have an agreed presentation.
- Exclusions have a risk-based rationale.
- Controls and evidence sources map to the same boundary.
- Planned and actual significant changes are tracked.
- Management has approved the proposed boundary and discussed the engagement implications with the CPA firm before the examination period.

## Official Documentation

- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)
- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: SOC 2 Reporting authoritative guide](https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy)
- [AICPA and CIMA: SOC for Service Organizations Engagements Overview](https://www.aicpa-cima.com/resources/download/soc-for-service-organizations-engagements-overview)
- [AWS: Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)

## Conclusion

Scope a SaaS SOC 2 system by following customer commitments through every component required to deliver and control the service. Products, cloud accounts, people, procedures, data, and subservice functions should reconcile to authoritative inventories and evidence sources. A defensible boundary is specific enough for report users and complete enough to represent the real system.
