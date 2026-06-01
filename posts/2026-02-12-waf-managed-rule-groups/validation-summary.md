# Validation Summary: How to Use WAF Managed Rule Groups

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS WAF
- AWS WAFv2 API and CLI
- AWS Managed Rules rule groups
- Terraform AWS provider `aws_wafv2_web_acl`
- Web ACL Capacity Units (WCU)

## Sources Consulted
- AWS WAF Developer Guide: AWS Managed Rules for AWS WAF - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html
- AWS WAF Developer Guide: AWS Managed Rules rule groups list - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
- AWS WAF Developer Guide: Baseline rule groups - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html
- AWS WAF Developer Guide: Use-case specific rule groups - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html
- AWS WAF Developer Guide: IP reputation rule groups - https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html
- AWS WAF Developer Guide: Overriding rule group actions - https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-rule-group-override-options.html
- AWS WAF Developer Guide: AWS WAF quotas - https://docs.aws.amazon.com/waf/latest/developerguide/limits.html
- AWS CLI Command Reference: `wafv2 update-web-acl` - https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html
- AWS CLI Command Reference: `wafv2 describe-managed-rule-group` - https://docs.aws.amazon.com/cli/latest/reference/wafv2/describe-managed-rule-group.html
- Terraform Registry: `aws_wafv2_web_acl` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The post said `AWSManagedRulesCommonRuleSet` covers SQL injection and broadly "covers the OWASP Top 10 vulnerabilities." AWS documents SQL injection under the separate `AWSManagedRulesSQLiRuleSet`, while the Common Rule Set covers a wide range of common vulnerabilities including some high-risk vulnerabilities described in OWASP publications. Updated the table and Common Rule Set description to avoid overstating SQLi/OWASP coverage.
- The Common Rule Set bullet list included "SQL injection patterns." Replaced it with path traversal/local file inclusion and remote file inclusion, which are documented Common Rule Set protections.
- The Anonymous IP List example used `OverrideAction: Count` as the recommended test mode. AWS now recommends using `RuleActionOverrides` to set individual managed rules to `Count` when testing rule behavior; `OverrideAction: Count` only overrides the rule group's returned result. Updated the example to use `RuleActionOverrides` for `AnonymousIPList` and `HostingProviderIPList`.
- The individual-rule override example used `ExcludedRules`. AWS still accepts it, but documents `RuleActionOverrides` as the current setting and recommends updating `ExcludedRules`. Replaced the example and explanation with `RuleActionOverrides`.
- The deployment best-practice section recommended setting `OverrideAction` to `Count` for new rule groups. Updated it to recommend `RuleActionOverrides` for Count-mode testing and to remove those overrides when switching to block behavior.

## Review Notes
- The AWS CLI examples use current `wafv2` commands and documented flags. The local workspace does not have the AWS CLI installed, so command syntax was verified against the official AWS CLI reference rather than local `--help` output.
- Terraform is not installed in the local workspace, so the HCL snippet could not be validated with `terraform validate`. The resource shape and argument names were checked against the Terraform AWS provider documentation.
- The referenced OneUptime internal links returned HTTP 200 during review.
