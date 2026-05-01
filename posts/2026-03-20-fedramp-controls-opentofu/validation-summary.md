# Validation Summary: How to Implement FedRAMP Controls with OpenTofu

## Status
validated

## Post Type
Guide / infrastructure tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS GovCloud (US)
- AWS Organizations service control policies
- AWS CloudTrail
- Elastic Load Balancing v2
- AWS Security Hub
- AWS Config
- Amazon S3 Object Lock
- AWS KMS

## Sources Consulted
- FedRAMP Important Considerations: https://www.fedramp.gov/docs/rev5/playbook/csp/authorization/considerations/
- FedRAMP System Security Plan guidance: https://www.fedramp.gov/docs/rev5/playbook/csp/authorization/ssp/
- FedRAMP Policy for Cryptographic Module Selection and Use v1.1.0: https://www.fedramp.gov/assets/resources/documents/FedRAMP_Policy_for_Cryptographic_Module_Selection_v1.1.0.pdf
- AWS GovCloud (US) Compared to Standard AWS Regions: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-differences.html
- Amazon Resource Names (ARNs) in GovCloud (US) Regions: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/using-govcloud-arns.html
- AWS CloudTrail `EventSelector` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CLI `put-event-selectors` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html
- Application Load Balancer security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Security Hub enable standards: https://docs.aws.amazon.com/securityhub/latest/userguide/enable-standards.html
- AWS Security Hub custom actions and EventBridge: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-custom-actions.html
- AWS Config `approved-amis-by-id`: https://docs.aws.amazon.com/config/latest/developerguide/approved-amis-by-id.html
- Terraform Registry `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform Registry `aws_securityhub_standards_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform Registry `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform Registry `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
- The intro said FedRAMP only has Moderate and High impact baselines. I updated it to include Low, which is part of the current FedRAMP baseline set.
- The “FedRAMP-Specific Requirements” section overstated GovCloud as a generic requirement and used outdated or overly broad wording for several bullets. I rephrased those claims to match current FedRAMP and AWS guidance.
- The GovCloud examples hard-coded commercial-partition ARNs in places where GovCloud uses the `aws-us-gov` partition. I replaced those with `data.aws_partition.current.partition` and `data.aws_region.current.name` so the snippets are partition-correct.
- The CloudTrail example used `arn:aws:s3:::` to represent “all S3 data events,” but AWS documents `arn:aws:s3` / `arn:<partition>:s3` for that basic event-selector case. I corrected the S3 and Lambda data resource values.
- The load balancer example used the older `aws_alb_listener` resource name and a string port value. I updated it to the current `aws_lb_listener` resource and numeric port syntax.
- The Security Hub standards subscription hard-coded a commercial-partition ARN for a GovCloud example. I changed it to a partition-aware and region-aware standard ARN.
- The Security Hub custom action was described as automatically forwarding findings to the ISSO, but AWS documents that custom actions send selected findings to EventBridge and require downstream rules or targets. I reworded the example accordingly.
- The S3 Object Lock example omitted the versioning prerequisite. I added `aws_s3_bucket_versioning` before the Object Lock configuration.
- The conclusion repeated the earlier overstatements around GovCloud and automatic Security Hub forwarding. I updated it to reflect the corrected implementation details.

## Review Notes
- No further technical issues found after correction.
- The snippets are still partial examples and rely on surrounding resources not shown in the post, such as the referenced KMS key, S3 log bucket, load balancer, and target group.
- I did not run `tofu plan` or deploy these examples; this was a documentation and configuration review against official sources.
