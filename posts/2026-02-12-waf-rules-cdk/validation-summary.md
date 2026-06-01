# Validation Summary: How to Create WAF Rules with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS WAFv2
- AWS CDK v2
- AWS CloudFormation WAFv2 resources
- TypeScript
- Amazon CloudFront
- Application Load Balancer
- Amazon API Gateway REST API
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CDK API Reference: `aws-cdk-lib.aws_wafv2.CfnWebACL` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_wafv2.CfnWebACL.html
- AWS CloudFormation Template Reference: `AWS::WAFv2::WebACL` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-webacl.html
- AWS CloudFormation Template Reference: `AWS::WAFv2::WebACL ManagedRuleGroupStatement` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-wafv2-webacl-managedrulegroupstatement.html
- AWS CloudFormation Template Reference: `AWS::WAFv2::WebACL RateBasedStatement` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-wafv2-webacl-ratebasedstatement.html
- AWS CloudFormation Template Reference: `AWS::WAFv2::WebACLAssociation` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webaclassociation.html
- AWS CloudFormation Template Reference: `AWS::WAFv2::LoggingConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-loggingconfiguration.html
- AWS CDK API Reference: `aws-cdk-lib.aws_cloudfront.Distribution` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html
- AWS WAF Developer Guide: Rate-based rule high-level settings - https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html

## Issues Found
- The managed rule group example used `excludedRules`. AWS still documents the property, but current CloudFormation guidance says to use `RuleActionOverrides` instead because it supports any valid action, including `Count`. Changed the example to `ruleActionOverrides` with `actionToUse: { count: {} }` for `SizeRestrictions_BODY`.
- The managed rule group count-mode explanation advised changing `overrideAction` to `{ count: {} }`. Updated it to recommend `ruleActionOverrides` for count-only testing while preserving per-rule metrics, matching current AWS guidance.
- The rate limiting section said AWS uses a fixed 5-minute window. AWS WAF now supports configurable evaluation windows of 60, 120, 300, or 600 seconds, with 300 seconds as the default. Updated the text and snippets to use `evaluationWindowSec: 300`.

## Review Notes
The remaining CDK and CloudFormation examples use valid WAFv2 property names and resource patterns. The API Gateway association example applies to API Gateway REST API stages, not API Gateway HTTP APIs; that distinction could be made clearer in a future editorial pass.
