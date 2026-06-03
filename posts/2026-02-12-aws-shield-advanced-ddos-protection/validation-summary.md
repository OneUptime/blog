# Validation Summary: How to Configure AWS Shield Advanced for DDoS Protection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Shield Advanced
- AWS Shield Standard
- AWS Shield Response Team
- AWS Firewall Manager
- AWS Organizations
- AWS WAF
- Amazon Route 53 health checks
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS Shield Advanced protected resource types: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-protections-by-resource-type.html
- AWS Shield Advanced subscription guidance: https://docs.aws.amazon.com/waf/latest/developerguide/enable-ddos-prem.html
- AWS Firewall Manager Shield Advanced policies: https://docs.aws.amazon.com/waf/latest/developerguide/getting-started-fms-shield.html
- AWS Shield Advanced capabilities and WAF cost coverage: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html
- AWS Shield Advanced SRT access and associate-drt-role CLI reference: https://docs.aws.amazon.com/cli/latest/reference/shield/associate-drt-role.html
- AWS Shield Advanced proactive engagement: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-srt-proactive-engagement.html
- AWS Shield Advanced cost protection credits: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-request-service-credit.html
- AWS Shield Advanced CloudWatch metrics: https://docs.aws.amazon.com/waf/latest/developerguide/shield-metrics.html
- AWS CLI create-protection-group reference: https://docs.aws.amazon.com/cli/latest/reference/shield/create-protection-group.html
- AWS CLI Route 53 create-health-check reference: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- Terraform AWS provider shield_subscription, shield_protection, shield_protection_group, and shield_protection_health_check_association docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post referred to the AWS DDoS Response Team (DRT). Current AWS documentation uses AWS Shield Response Team (SRT), although some API and CLI operations still use `drt` in their names. Updated prose and comments to use SRT while keeping valid CLI operation names.
- The post stated Shield Advanced costs $3,000/month without the current organization-level qualifier. Updated the wording to "$3,000/month per organization plus data transfer fees."
- The WAF integration bullet said "at no additional WAF cost" too broadly. Updated it to clarify that standard AWS WAF costs are covered for protected resources within AWS's documented limits.
- The protected resource list omitted Classic Load Balancers and described Global Accelerator as "endpoints." Updated it to match AWS-supported resource types, including Global Accelerator standard accelerators and the EIP-based protection model for EC2 and NLB.
- The AWS Organizations section incorrectly used `aws shield enable-proactive-engagement` as if it enabled Shield Advanced across an organization. Updated the guidance to use AWS Firewall Manager for supported multi-account Shield Advanced automation and removed the misleading command.
- The Route 53 health check example used a documentation-only IP address with HTTPS SNI enabled. Updated it to use `FullyQualifiedDomainName`, which matches Route 53's documented host header and SNI behavior for HTTPS health checks.
- The SRT access section implied WAF logs need to be optionally shared. AWS documents that SRT access includes AWS WAF log access through the managed policy; optional sharing applies to additional logs such as ALB or CloudFront logs. Updated the wording.
- The cost protection section incorrectly listed NLB, ECS, and broad "scaling costs" coverage. Updated it to AWS's documented eligible charge categories and added the key prerequisites for protected resources and WAF rate-based rules for applicable CloudFront and ALB resources.

## Review Notes
AWS CLI and Terraform examples use current command/resource names and valid field names based on official documentation. The AWS CLI and Terraform binaries were not installed locally, so command verification was performed against official AWS CLI and Terraform provider documentation rather than local `--help` output.
