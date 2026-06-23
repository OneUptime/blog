# Validation Summary: How to Configure WAF Rules for API Gateway

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- AWS WAF (WAFv2)
- AWS API Gateway (REST APIs)
- AWS CloudFormation
- AWS CLI (`aws wafv2`)
- Amazon CloudWatch Logs Insights
- Amazon Kinesis Data Firehose (WAF logging destination)

## Sources Consulted
- AWS WAFv2 API Reference — ByteMatchStatement: https://docs.aws.amazon.com/waf/latest/APIReference/API_ByteMatchStatement.html
- AWS CloudFormation — RateBasedStatementCustomKey: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-wafv2-rulegroup-ratebasedstatementcustomkey.html
- AWS WAFv2 API Reference — RateBasedStatement / RateBasedStatementCustomKey: https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html
- AWS WAF Developer Guide — Rate limit requests missing a specific header: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rate-based-example-limit-missing-header.html
- AWS WAFv2 API Reference — CreateWebACL: https://docs.aws.amazon.com/waf/latest/APIReference/API_CreateWebACL.html

## Issues Found
1. **`RequireApiKey` rule used an invalid and logically broken `ByteMatchStatement`.** The original rule attempted to block requests missing the `x-api-key` header with:
   ```yaml
   NotStatement:
     Statement:
       ByteMatchStatement:
         SearchString: ""
         FieldToMatch:
           SingleHeader:
             Name: x-api-key
         PositionalConstraint: CONTAINS
   ```
   This is wrong on two counts. First, `SearchString` in a `ByteMatchStatement` is a required, non-empty value (the API rejects an empty search string). Second, the logic is broken even conceptually: every string "contains" the empty string, so `NotStatement(CONTAINS "")` can never match and the rule would never block anything.

   **Fix:** Replaced it with the AWS-documented pattern for requiring a header's presence — a `NotStatement` wrapping a `SizeConstraintStatement` on the `SingleHeader` field with `ComparisonOperator: GT` and `Size: 0`. This matches (and therefore blocks) requests where the `x-api-key` header is missing or empty. Verified against the AWS WAF Developer Guide example for handling requests that are missing a specific header.

## Review Notes
- The `RateBasedStatementCustomKey` `Header` structure (`Name` + `TextTransformations`) used in the "Rate Limiting by API Key" example is correct per the CloudFormation reference.
- Managed rule group names (`AWSManagedRulesCommonRuleSet`, `AWSManagedRulesSQLiRuleSet`, `AWSManagedRulesKnownBadInputsRuleSet`) and the excluded rule name `SizeRestrictions_BODY` are all valid.
- The API Gateway stage resource ARN format (`arn:aws:apigateway:<region>::/restapis/<id>/stages/<stage>`) and the `associate-web-acl` usage are correct. Worth noting for readers: WAF association with API Gateway is supported for REST APIs only (not HTTP APIs), which the post implicitly assumes by using `restapis`.
- `ExcludedRules` still works but AWS now recommends `RuleActionOverrides` for overriding individual managed-rule actions to Count. Not an error; a possible future modernization.
- Rate-limit `Limit` values (2000, 1000, 100) are within the valid range (minimum is 10), so the login limit of 100 is acceptable.
- CloudWatch Logs Insights field names (`httpRequest.clientIp`, `httpRequest.uri`, `action`, `terminatingRuleId`) match the WAF log schema.
- The Mermaid diagram shows the `COUNT` path flowing to API Gateway; in reality `COUNT` only increments a metric and continues rule evaluation rather than terminating. This is an acceptable simplification for an architecture overview, not a technical error.
