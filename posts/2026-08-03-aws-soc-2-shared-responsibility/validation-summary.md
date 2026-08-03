# Validation Summary: AWS SOC 2 and Shared Responsibility: What You Still Need to Audit

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- AWS Shared Responsibility Model
- AWS SOC 2 reports and AWS Artifact
- Complementary user entity controls (CUECs)
- Amazon EC2, Amazon S3, and Amazon DynamoDB
- AWS Identity and Access Management (IAM) and IAM Identity Center
- AWS CloudTrail and AWS Config
- AWS Security Hub CSPM and Amazon GuardDuty
- AWS Organizations and AWS Backup
- AWS Audit Manager
- AICPA Trust Services Criteria and SOC 2 Description Criteria

## Sources Consulted

- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS SOC reports and frequently asked questions](https://aws.amazon.com/compliance/soc-faqs/)
- [AWS Services in Scope by Compliance Program: SOC](https://aws.amazon.com/compliance/services-in-scope/SOC/)
- [AWS Artifact: Downloading reports and securing documents](https://docs.aws.amazon.com/artifact/latest/ug/downloading-documents.html)
- [AWS Well-Architected Security Pillar: Shared responsibility](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/shared-responsibility.html)
- [AWS AICPA SOC 2 Compliance Guide on AWS](https://d1.awsstatic.com/whitepapers/compliance/AICPA_SOC2_Compliance_Guide_on_AWS.pdf)
- [AWS Audit Manager: What is AWS Audit Manager?](https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html)
- [AWS Audit Manager availability change](https://docs.aws.amazon.com/audit-manager/latest/userguide/audit-manager-availability-change.html)
- [AWS CloudTrail: Working with trails](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-trails.html)
- [AWS Config: Multi-account, multi-Region data aggregation](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html)
- [AWS Security Hub CSPM: Generating and updating control findings](https://docs.aws.amazon.com/securityhub/latest/userguide/controls-findings-create-update.html)
- [Amazon GuardDuty: Understanding and generating findings](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings.html)
- [IAM Identity Center API: ListAccountAssignments](https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_ListAccountAssignments.html)
- [AWS Organizations API operations by account type](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_actions-by-account.html)
- [AWS Backup API: ListBackupJobs](https://docs.aws.amazon.com/aws-backup/latest/APIReference/API_ListBackupJobs.html)
- [AICPA 2017 Trust Services Criteria with Revised Points of Focus 2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
- [AICPA 2018 SOC 2 Description Criteria with Revised Implementation Guidance 2022](https://www.aicpa-cima.com/resources/download/get-description-criteria-for-your-organizations-soc-2-r-report)

## Issues Found

- The evidence-service list said that AWS Security Hub CSPM “aggregates supported security checks.” AWS documentation describes Security Hub CSPM as running enabled security checks and generating or aggregating their findings. The text now says that it “runs supported security checks and aggregates their findings.”

No other technical issues were found.

## Review Notes

- The post contains no code examples, commands, configuration snippets, or version-specific API examples. The review therefore focused on its implementation-level AWS service, report-scope, evidence, and audit claims.
- Current AWS public documentation confirms that AWS SOC 2 covers Security, Availability, Confidentiality, and Privacy; is issued twice per year for rolling 12-month periods; and is supplemented by a monthly SOC Continued Operations Letter. Processing Integrity is not in the current AWS SOC 2 scope.
- AWS Audit Manager stopped accepting new customers on April 30, 2026. Existing customers can continue using the service, subject to the expansion limitations described in the availability-change documentation.
- The detailed AWS SOC 2 report requires an NDA and access through AWS Artifact. Its confidential control descriptions, test results, deviations, and CUECs could not be reproduced in this public validation; the post correctly tells readers to inspect their current report.
- `ListBackupJobs` returns AWS Backup jobs from the last 30 days. Evidence needed for a longer examination period must be retained or collected through the longer-term monitoring mechanisms AWS documents; this is consistent with the post's warnings about complete period coverage and retention.
- Every URL in the post returned a successful HTTP response during validation.
