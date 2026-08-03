# AWS SOC 2 and Shared Responsibility: What You Still Need to Audit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOC 2, AWS, Shared Responsibility, AWS Artifact, Cloud Compliance, CUECs, Audit Evidence

Description: Use AWS assurance for AWS-operated controls while auditing your own governance, configuration, identity, applications, data, operations, and evidence under shared responsibility.

---

AWS having a SOC 2 report does not give an AWS customer a SOC 2 report for its SaaS product. The two reports concern different service organizations, system descriptions, controls, and responsibilities.

AWS's report can provide valuable evidence about controls AWS operates for the AWS services and infrastructure in its scope. Your SOC 2 examination still addresses your service organization's system: the product customers use, the commitments you make, the AWS services and accounts you configure, the software you deploy, the people who operate it, and the controls you perform.

The dividing principle is the AWS Shared Responsibility Model:

- AWS is responsible for security **of** the cloud, including the infrastructure that runs AWS services.
- The customer is responsible for security **in** the cloud, with the exact division changing according to the services selected and how they are used.

That model also extends to the management, operation, and verification of IT controls. It reduces duplicated work only when you identify which AWS controls are relevant, verify that the services and Regions are covered, and implement the customer side of every shared or customer-owned control.

## What the AWS SOC 2 Report Tells You

AWS says its SOC reports are independent third-party examination reports intended to help customers and their auditors understand AWS controls. Its SOC 2 report is available to AWS customers through AWS Artifact and currently addresses Security, Availability, Confidentiality, and Privacy for the AWS control environment described in the report. AWS publishes separate scope information for covered services and describes Region coverage in its report materials.

Read the actual report rather than relying on an AWS logo. Check:

1. **Entity and report:** Which AWS entity and report series are you reviewing?
2. **Period:** Does the Type II period overlap or otherwise support your examination period?
3. **Opinion:** What exactly did the AWS service auditor conclude, and was the opinion modified?
4. **Categories:** Which Trust Services Categories are included? Do not infer Processing Integrity coverage when AWS's SOC 2 scope does not include it.
5. **Services and features:** Are the AWS services on which your system depends listed in the current SOC scope?
6. **Regions:** Are the Regions relevant to your workloads covered?
7. **Controls and tests:** Which AWS controls and auditor test results support your control mapping?
8. **Exceptions:** Were deviations reported, and are they relevant to your use?
9. **Subservice organizations:** What further dependencies and presentation methods does AWS describe?
10. **Complementary user entity controls:** Which controls does AWS assume customers implement for the overall control design to work as intended?

AWS's SOC FAQ says SOC 2 reports are available through Artifact and require acceptance of applicable terms. AWS Artifact documentation warns that downloaded reports are confidential, uniquely watermarked, and must be shared securely within the permitted audience. Do not email the report as an attachment or upload it to a public trust center.

## Match the Report to the Current Period

AWS states that it publishes SOC 2 reports twice per year, with each report covering the previous 12 months. The current report dates and publication timing can change, so obtain the current document rather than embedding an old schedule in a control.

For the interval after the most recent report period, AWS provides a SOC Continued Operations Letter, often called a bridge letter or COL, in Artifact and says it updates that letter monthly. A bridge letter is AWS management's representation for the subsequent interval; it is not another auditor's Type II opinion and does not extend the tests in the report.

Your service auditor determines how the AWS report, its period, a continued-operations letter, and other evidence affect your engagement.

## Translate Shared Responsibility by Service

The responsibility boundary is not identical for every AWS service.

### Amazon EC2 example

AWS operates the facilities, hardware, networking foundation, and virtualization layer. The customer generally manages matters including:

- guest operating system configuration and patching;
- installed application software;
- security group and network configuration;
- identity and instance access;
- workload logging and monitoring;
- data classification, encryption choices, backup, and recovery;
- application vulnerabilities and deployment.

An AWS control over hypervisor patching does not prove that your EC2 guest operating systems were patched.

### Abstracted managed-service example

For services such as Amazon S3 and DynamoDB, AWS operates more of the platform and underlying software. The customer still decides and controls matters such as:

- which data to store;
- account and resource policies;
- IAM permissions;
- public access and network options;
- encryption and key choices available to the customer;
- logging, monitoring, retention, and lifecycle rules;
- application behavior that reads and writes the data.

Managed does not mean configured correctly for your requirements.

### Shared controls

AWS gives patch management, configuration management, and awareness and training as examples of shared controls operating in different contexts. AWS patches its infrastructure and trains its people; you patch customer-managed layers and train your people. The evidence must match the layer and owner.

Build the division at the individual service and control level, not with one diagram pasted into the audit folder.

## What Your SOC 2 Examination Still Covers

AWS cannot operate controls over facts and decisions that belong to your organization.

### Governance and risk

You still define oversight, responsibility, ethical expectations, competence, accountability, risk assessment, objectives, and control monitoring. AWS's governance of AWS does not prove your board or management reviews your risks.

Typical customer evidence includes:

- approved risk assessments and treatment decisions;
- management and governance review records;
- policies that match actual operation;
- control ownership and exception tracking;
- communications about responsibilities and incidents.

### Workforce and logical access

You authorize and remove your workforce's access to AWS accounts, production, source control, support, and data. You configure IAM Identity Center or other federation, roles, permission sets, root-account safeguards, workload identities, and temporary elevation.

AWS's controls over AWS employee access do not prove that a departing developer lost access to your production account.

### Architecture and configuration

You select Regions and services and configure networks, resource policies, logging, encryption, backups, retention, multi-account boundaries, and resilience. Service defaults are inputs to your design, not evidence that the design meets your commitments.

Maintain approved baselines, configuration histories, exception processes, and complete inventories of in-scope accounts and resources.

### Software development and change

You design, review, test, approve, build, and deploy your application and infrastructure code. AWS secures the underlying service; it does not peer-review your pull requests, authorize an emergency deployment, or validate your business logic.

Preserve complete deployment populations and links to source changes, checks, approvals, artifacts, and rollback where applicable.

### Vulnerability and incident management

You identify vulnerabilities in customer-managed operating systems, applications, dependencies, images, infrastructure configuration, and code. You configure relevant AWS detections, triage alerts, declare incidents, communicate, contain, recover, and track remediation.

AWS responds to incidents within AWS's responsibility. Your incident process covers your service and your responsibilities, including evaluation of AWS notifications that may affect you.

### Data protection and lifecycle

You classify customer data and implement your contractual, confidentiality, retention, deletion, backup, export, and privacy practices. AWS provides capabilities and operates underlying controls; it does not decide whether your application collects too much personal information or honors your deletion promise.

### Availability and recovery

You architect the workload to meet your availability and recovery objectives. Using an AWS service with an availability design or service commitment does not prove your application is redundant, your quotas are sufficient, your backups are usable, or your recovery process works.

Test restoration and recovery for the customer system, including customer-managed dependencies and procedures.

### Vendors and subservice organizations

You identify AWS as a relevant provider, assess its service and report scope, monitor changes, protect the downloaded report, and address relevant complementary controls. You also assess the other providers in your service chain.

Management should determine the presentation of relevant subservice organizations and discuss it with the CPA firm, which evaluates the description and reporting implications. Do not describe AWS controls as if your auditor retested them directly unless that is what the report actually says.

## Build a Control Responsibility Matrix

Use a row per control activity, not one row per broad criterion.

| Field | Example |
| --- | --- |
| Criterion and risk | Unauthorized production access could expose customer data |
| AWS responsibility | AWS controls physical access to covered data-center infrastructure |
| Customer responsibility | Customer authorizes IAM roles and reviews privileged access |
| Shared or inherited basis | AWS SOC 2 control and test relevant to physical infrastructure |
| Customer control | Security lead reviews effective privileged access at the stated cadence |
| AWS evidence | Current AWS SOC 2 report section and applicable test result |
| Customer evidence | IAM population, review decisions, removals, and completion evidence |
| CUEC reference | Exact complementary control stated in the AWS report, if applicable |
| Scope validation | Covered service, feature, Region, account, and period confirmed |
| Owner | Named customer control owner |

Avoid vague rows such as `CC6 covered by AWS`. CC6 contains several access considerations across different layers, and most customer identity controls remain yours.

## Collect Customer Evidence from AWS Carefully

AWS services can help collect customer-side evidence:

- AWS CloudTrail records supported API activity;
- AWS Config records supported configuration and change history;
- IAM and IAM Identity Center APIs expose assignments and policies;
- Security Hub CSPM aggregates supported security checks;
- GuardDuty produces supported threat findings;
- AWS Organizations exposes account structure and policy data;
- AWS Backup provides job and recovery-point records;
- Existing AWS Audit Manager customers can use it to collect and organize certain evidence. AWS no longer accepts new Audit Manager customers.

Coverage and configuration still matter. For example:

- Is CloudTrail configured for every in-scope account and relevant Region?
- Are data events needed for the control enabled?
- Are logs retained for the full period and protected from alteration?
- Does the Config aggregator include every account and resource type needed?
- Are suspended, closed, newly created, and delegated-administrator accounts included?
- Does the query paginate and use exact period boundaries?

AWS Audit Manager explicitly states that it assists with evidence collection but does not assess the customer's compliance and may not collect all information needed for an audit. It is no longer open to new customers, although existing customers can continue using it. A framework mapping or green check is not the service auditor's opinion.

## Common Mistakes

### Treating AWS certification as customer certification

SOC 2 is an examination report, not a transferable certificate. AWS's report concerns AWS's described system and controls.

### Assuming every AWS service is covered

Check the current Services in Scope page and the actual report. AWS says absence from the current scope does not by itself prohibit use; it means your organization must evaluate how the service affects the compliance of the workload.

### Copying AWS controls into your control list

Reference relevant AWS controls through the report and chosen subservice-organization presentation. Do not claim to operate AWS's physical controls.

### Ignoring CUECs

Do not treat applicable complementary user entity controls as optional suggestions when management relies on the provider's control design. Map each relevant CUEC to a customer control, evidence, and owner, or document why it is not applicable to the specific AWS services and features used and discuss that rationale with the auditor.

### Using AWS Config as the whole audit

Technical configuration evidence cannot prove governance meetings, workforce training, contract review, code approval, incident communications, or other human and organizational controls.

### Sharing Artifact reports incorrectly

Follow AWS terms and confidentiality instructions. Provide the report to your authorized auditor through a secure channel and keep access records.

## A Practical Review Sequence

1. Inventory in-scope AWS organizations, accounts, Regions, services, features, and customer data.
2. Download the current AWS SOC 2 report and relevant continued-operations letter from Artifact.
3. Verify report period, opinion, categories, services, Regions, exceptions, subservice organizations, and CUECs.
4. Map each relevant AWS control to your risk-control matrix.
5. Identify every customer and shared responsibility by service.
6. Design customer controls for governance, people, configuration, application, operations, data, and vendors.
7. Test evidence collection for complete account and period coverage.
8. Review mappings and subservice presentation with the service auditor.
9. Monitor AWS report updates, service-scope changes, and architecture changes.
10. Preserve both provider assurance and your own operating evidence.

## Official Documentation

- [AWS: Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS: SOC reports and frequently asked questions](https://aws.amazon.com/compliance/soc-faqs/)
- [AWS: Services in Scope by Compliance Program](https://aws.amazon.com/compliance/services-in-scope/)
- [AWS Artifact: Downloading reports and securing confidential documents](https://docs.aws.amazon.com/artifact/latest/ug/downloading-documents.html)
- [AWS: AICPA SOC 2 Compliance Guide on AWS](https://d1.awsstatic.com/whitepapers/compliance/AICPA_SOC2_Compliance_Guide_on_AWS.pdf)
- [AWS Well-Architected Security Pillar: Shared responsibility](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/shared-responsibility.html)
- [AWS Audit Manager: What the service does and does not assess](https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html)
- [AICPA and CIMA: 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA and CIMA: 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)

## Conclusion

AWS assurance can support the part of your control environment AWS operates, but it does not cross the shared-responsibility boundary and become assurance over your SaaS. Validate AWS report scope, map AWS controls and CUECs precisely, and audit your own governance, identities, configuration, software, operations, data, resilience, and evidence. That is how provider assurance reduces duplicate work without creating a control gap.
