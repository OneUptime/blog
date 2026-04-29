# Validation Summary: How to Implement ISO 27001 Controls with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Application Load Balancer
- Amazon Cognito
- Amazon GuardDuty
- Amazon Inspector
- Amazon Macie
- Amazon S3 and AWS KMS
- Amazon CloudWatch
- Amazon VPC network ACLs
- ISO/IEC 27001 Annex A

## Sources Consulted
- ISO/IEC JTC 1/SC 27 Journal 2025 PDF, which states that ISO/IEC 27002:2022 has 93 controls grouped into four themes: https://committee.iso.org/files/live/sites/jtc1sc27/files/resources/Journal%202025.pdf
- HashiCorp AWS provider docs for `aws_lb_listener`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown
- HashiCorp AWS provider docs for `aws_cognito_user_pool`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cognito_user_pool.html.markdown
- HashiCorp AWS provider docs for `aws_guardduty_detector`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector.html.markdown
- HashiCorp AWS provider docs for `aws_guardduty_detector_feature`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector_feature.html.markdown
- HashiCorp AWS provider docs for `aws_inspector2_enabler`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/inspector2_enabler.html.markdown
- HashiCorp AWS provider docs for `aws_macie2_account`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/macie2_account.html.markdown
- HashiCorp AWS provider docs for `aws_s3_bucket_server_side_encryption_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- HashiCorp AWS provider docs for `aws_cloudwatch_log_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_log_group.html.markdown
- HashiCorp AWS provider docs for `aws_cloudwatch_metric_alarm`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- HashiCorp AWS provider docs for `aws_network_acl`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/network_acl.html.markdown
- AWS Application Load Balancer metrics reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS VPC network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS custom network ACL guidance, including response traffic and ephemeral port handling: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- Amazon GuardDuty User Guide: https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html
- GuardDuty feature-object migration and feature mapping: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-feature-object-api-changes-march2023.html
- Amazon Cognito MFA documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- Amazon Macie overview: https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html
- AWS CLI reference for CodeGuru Security, including the November 20, 2025 end-of-support notice: https://docs.aws.amazon.com/cli/latest/reference/codeguru-security/index.html

## Issues Found
- The introduction mixed older ISO control-domain language with the 2022 Annex A structure. I changed it to say that Annex A has 93 controls across four themes and that the post maps organizational and technological controls to infrastructure.
- The ALB listener example used the older `aws_alb_listener` name. I changed it to `aws_lb_listener`, which is the current documented resource name.
- The A.5.14 comment overstated what the snippet does. I changed the wording to say the redirect supports secure transfer with HTTPS, which is a narrower and more accurate claim than fully implementing the control.
- The GuardDuty example previously enabled only a detector, which is foundational threat detection and not specifically malware protection. I added `aws_guardduty_detector_feature` with `EBS_MALWARE_PROTECTION` so the snippet matches the A.8.7 malware-protection claim.
- The A.8.25 note referenced CodeGuru Security even though AWS discontinued support on November 20, 2025. I replaced it with a generic CI/CD-integrated security-scanning note instead of naming a discontinued service.
- The CloudWatch log retention comment implied that ISO 27001 requires one year of retention. I changed the comment to make clear that retention should align with policy requirements rather than implying a fixed ISO mandate.
- The CloudWatch alarm used an invalid ALB metric name, `5XXError`. I changed it to `HTTPCode_ELB_5XX_Count`, which is the documented Application Load Balancer metric, and added the `LoadBalancer` dimension required by the AWS metric reference.
- The network ACL example allowed only inbound database traffic. Because network ACLs are stateless and custom ACLs require explicit response rules, I added egress rules to allow return traffic on ephemeral ports and an explicit outbound deny rule.

## Review Notes
- The snippets remain illustrative rather than fully standalone: they reference supporting resources such as `aws_lb.main`, `aws_s3_bucket.data`, `aws_kms_key.data`, `aws_kms_key.logs`, `aws_sns_topic.ops_alerts`, and `data.aws_caller_identity.current` that must exist elsewhere in a real configuration.
- The post is technically valid after correction, but ISO/IEC 27001 control implementation still depends on policy, process, scope, and evidence outside infrastructure code alone.
