# Validation Summary: How to Set Up AWS WAF Bot Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS WAF
- AWS WAF Bot Control managed rule group
- AWS CLI WAFV2 commands
- Terraform AWS provider `aws_wafv2_web_acl`
- AWS WAF CAPTCHA and Challenge actions
- AWS WAF logging filters

## Sources Consulted
- AWS WAF Bot Control overview: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control.html
- AWS WAF Bot Control components: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control-components.html
- AWS WAF Bot Control rule group and rule listing: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html
- AWS WAF Bot Control simple configuration example: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control-example-basic.html
- AWS WAF Bot Control targeted inspection example: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control-example-targeted-inspection-level.html
- AWS WAF verified bots example: https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control-example-allow-verified-bots.html
- AWS CLI `wafv2 update-web-acl` command reference: https://docs.aws.amazon.com/cli/latest/reference/wafv2/update-web-acl.html
- AWS CloudFormation `AWS::WAFv2::LoggingConfiguration` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-loggingconfiguration.html
- AWS WAF `LabelNameCondition` API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_LabelNameCondition.html
- Terraform AWS provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The AWS CLI JSON snippets used `AWSManagedRulesBotControlRuleSetProperty`, but AWS's current WAFV2 API examples use `AWSManagedRulesBotControlRuleSet`. Updated all affected JSON snippets.
- The Bot Categories table listed non-existent rule names such as `CategoryVerifiedSearchEngine`, `CategoryVerifiedSocialMedia`, and `CategoryVerifiedScraping`. Replaced them with current Bot Control rule names and corrected the default action descriptions.
- The post described several Bot Control category rules as defaulting to Count. AWS's current managed rule group documentation lists those category rules as Block for matching unverified bots, while verified bots receive labels and are not matched by those category rules. Updated the table accordingly.
- The rule action override example attempted to override verified bot categories that are not managed rule names. Removed those invalid overrides and kept valid rule action overrides.
- The logging example used an S3 bucket name that did not meet AWS WAF logging destination naming requirements. Updated it to an `aws-waf-logs-` bucket name.
- The logging filter used a Bot Control namespace prefix as a `LabelNameCondition`. AWS requires a fully qualified label name. Updated the filter to use fully qualified Bot Control labels and set the default behavior to `DROP` so the filter actually keeps only matching Bot Control records.
- The best-practice note recommended allowing `CategoryVerifiedSearchEngine`, which is not a valid rule name. Updated it to describe allowing the `awswaf:managed:aws:bot-control:bot:verified` label when other web ACL rules might block verified bots.

## Review Notes
- The Terraform configuration shape for `managed_rule_group_configs`, `aws_managed_rules_bot_control_rule_set`, and `rule_action_override` matches the Terraform AWS provider documentation.
- The post's mention of CAPTCHA and Challenge is technically accurate, but AWS notes that these actions require browser clients on HTTPS secure contexts and can incur additional fees.
- The referenced OneUptime homepage and related WAF Account Takeover Prevention blog URL resolve successfully.
