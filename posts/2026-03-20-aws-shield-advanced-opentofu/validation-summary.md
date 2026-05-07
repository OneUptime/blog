# Validation Summary: How to Set Up AWS Shield Advanced with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Shield Advanced
- AWS WAFv2
- AWS IAM
- AWS CLI
- Amazon CloudFront
- Amazon Route 53
- Elastic Load Balancing

## Sources Consulted
- AWS Shield Advanced pricing: https://aws.amazon.com/shield/pricing/
- AWS Shield Advanced capabilities and options: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html
- List of AWS resources that AWS Shield Advanced protects: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-protected-resources.html
- Grouping your AWS Shield Advanced protections: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-protection-groups.html
- Setting up AWS Shield Response Team (SRT) support for DDoS event response: https://docs.aws.amazon.com/waf/latest/developerguide/authorize-srt.html
- Requesting a credit in AWS Shield Advanced after an attack: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-request-service-credit.html
- AWS CLI `shield list-attacks` reference: https://docs.aws.amazon.com/cli/latest/reference/shield/list-attacks.html
- Terraform AWS provider `aws_shield_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_subscription
- Terraform AWS provider `aws_shield_protection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection
- Terraform AWS provider `aws_shield_protection_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_protection_group
- Terraform AWS provider `aws_shield_drt_access_role_arn_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/shield_drt_access_role_arn_association

## Issues Found
- The post stated that Shield Advanced provided 24/7 DDoS Response Team access as part of the base setup. I updated the description, introduction, and prerequisites to reflect current AWS documentation: Shield Response Team access requires AWS Business or Enterprise Support.
- The pricing prerequisite said Shield Advanced was a `$3,000/month minimum`. I changed it to the current pricing model AWS documents: a `$3,000/month` subscription with a 1-year commitment plus Shield Advanced data transfer out usage fees.
- The introduction overstated supported resource coverage by saying Shield Advanced protects `EC2` directly. I corrected this to match AWS documentation: EC2 instances are protected through associated Elastic IP addresses, and Elastic IPs are a first-class protected resource type.
- The Elastic IP example referenced `data.aws_caller_identity.current.account_id` without declaring that data source. I added the missing `aws_caller_identity` data block.
- The Shield protection resources had no dependency on the Shield subscription, even though the article deploys everything in one `tofu apply`. I added explicit `depends_on = [aws_shield_subscription.main]` to the Shield protection resources and the relevant follow-on resources so the tutorial's apply order is valid.
- The protection group example used `aws_shield_protection.*.id` values in `members`. The provider documentation requires resource ARNs, not Shield protection IDs. I changed the example to use `var.alb_arn` and `var.cloudfront_distribution_arn`, and I added an explicit dependency on the underlying protections.
- The SRT/DRT access section implied that granting SRT access automatically creates AWS WAF mitigation rules. That is inaccurate. I rewrote the comments so the code is described correctly as optional SRT authorization, and I added the required dependency on `AWSShieldDRTAccessPolicy` before associating the role.
- The `aws shield list-attacks` example used a non-runnable `<arn>` placeholder and labeled the output as `active attacks` even though the command example was time-bounded. I changed it to a syntactically valid example ARN and the supported `--start-time` structure syntax, and I corrected the description to `attack summaries for a protected resource during a time window`.
- The conclusion described cost protection as reimbursing AWS charges caused by attack traffic. AWS documents this as eligibility-based Shield Advanced service credits for specific charges, so I tightened the wording accordingly.

## Review Notes
- As of March 26, 2026, AWS documentation states that the Anti-DDoS Managed Rule Group became the default HTTP flood protection path for new Shield Advanced customers and superseded the legacy Layer 7 Auto Mitigation feature. This post now stays within the validated scope of Shield subscription setup, resource protections, WAF association, protection groups, and optional SRT authorization, but it does not cover that newer application-layer flow.
