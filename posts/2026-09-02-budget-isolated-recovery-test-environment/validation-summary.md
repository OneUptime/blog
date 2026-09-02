# Validation Summary: How to Build an Isolated Recovery Test Environment with Limited Cloud Budget

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Disaster recovery testing, RTO, RPO, failover, and failback
- Cloud account, project, subscription, VPC, and virtual-network isolation
- Identity policies, organization guardrails, private DNS, and private service access
- Infrastructure as code, YAML run metadata, lifecycle automation, and scoped cleanup
- Backup restore testing, snapshot initialization, and representative-volume performance testing
- AWS Elastic Disaster Recovery, Amazon EC2, Amazon EBS, AWS Budgets, Spot Instances, and Capacity Reservations
- Azure Site Recovery and Azure virtual networks
- Google Cloud Billing budgets and Google Cloud VPC firewall rules

## Sources Consulted

- [AWS: Drill planning for cross-Region disaster recovery](https://docs.aws.amazon.com/guidance/latest/deploying-cross-region-disaster-recovery-with-aws-elastic-disaster-recovery/drill-planning.html)
- [AWS Elastic Disaster Recovery: Best practices](https://docs.aws.amazon.com/drs/latest/userguide/best_practices_drs.html)
- [AWS: Disaster recovery implementation](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-of-on-premises-applications-to-aws/disaster-recovery-implementation.html)
- [AWS Account Management: What is an AWS account?](https://docs.aws.amazon.com/accounts/latest/reference/accounts-welcome.html)
- [AWS Well-Architected: Periodically recover data to verify backup integrity and processes](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html)
- [Amazon EBS: Initialize volumes](https://docs.aws.amazon.com/ebs/latest/userguide/initalize-volume.html)
- [Amazon EC2: Best practices for Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html)
- [Amazon EC2: Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
- [Amazon EC2: Tag resources](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html)
- [AWS IAM: `Resource` policy element](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html)
- [AWS Cost Management: Best practices for AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)
- [Azure Site Recovery: Run a test failover](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure)
- [Azure Virtual Network: How network security groups filter traffic](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works)
- [Azure Resource Manager: Use tags to organize resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources)
- [Google Cloud Billing: Create budgets and budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Google Cloud VPC: Firewall rules](https://docs.cloud.google.com/firewall/docs/firewalls)
- [Google Cloud Resource Manager: Labels overview](https://docs.cloud.google.com/resource-manager/docs/labels-overview)
- [Google Cloud Resource Manager: Supported services for labels](https://docs.cloud.google.com/resource-manager/docs/labels-supported-services)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)

## Issues Found

- The post described resource labels as immutable, implicitly assumed every resource could be tagged, and presented manifest values that are not portable as literal labels. User-defined cloud tags are ordinarily mutable, tag support varies by resource, Google Cloud label values cannot contain the uppercase letters or colons used by the example timestamps, and AWS deletion APIs require provider resource identifiers rather than tags alone. Changed the guidance to keep authoritative metadata in a protected manifest, mirror only provider-compatible identifiers to supported tags or labels, maintain an exact run inventory, and resolve provider resource IDs before cleanup.
- The production-isolation bullet implied that all production resources could be denied by ARN or resource ID through identity policy. Some cloud API actions, including some AWS actions, do not support resource-level policy scoping. Changed the text to require layered identity and organization guardrails and to use resource ARNs or IDs only where the provider supports resource-level controls; updated the matching preflight assertion.
- The post grouped capacity reservations with low-cost foundations. AWS On-Demand Capacity Reservations are billed at the equivalent On-Demand rate while provisioned, including when capacity is unused. Changed the wording to describe persistent foundations and separated capacity reservations from the explicitly low-cost items.
- The RTO/RPO guidance could be read as treating production-scale volume and write rate as sufficient evidence for both objectives. Clarified that RTO is measured through validated service readiness, RPO is checked against the recovered point's age, and completeness and consistency are validated separately.

## Review Notes

- Both YAML examples are syntactically valid. They are illustrative, provider-neutral run metadata rather than schemas accepted directly by AWS, Azure, or Google Cloud.
- The assertion block is intentionally pseudocode, not a command or executable configuration file.
- The RTO/RPO, isolated-network, AWS Elastic Disaster Recovery staging, snapshot-initialization, Spot interruption, and budget-refresh explanations agree with the current official documentation.
- Google Cloud now documents spend cap budgets in Preview for supported services. This does not contradict the post, which specifically states that alerts-only budgets do not impose a hard cap.
- Default cloud firewall and security-group behavior varies, and Azure and Google Cloud allow egress by default. The post correctly presents default-deny egress as a posture that must be configured rather than as a provider default.
- AWS forecast-based budget alerts require approximately five weeks of usage data, so a new or rarely used test account should not rely on forecast alerts as its immediate guardrail.
