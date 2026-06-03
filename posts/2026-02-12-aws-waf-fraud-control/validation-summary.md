# Validation Summary: How to Use AWS WAF Fraud Control

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS WAFv2
- AWS WAF Fraud Control account creation fraud prevention (ACFP)
- AWS Managed Rules
- AWS CLI
- Terraform AWS provider
- AWS WAF JavaScript intelligent threat integration
- Amazon CloudWatch metrics

## Sources Consulted
- AWS WAF Developer Guide: AWS WAF Fraud Control account creation fraud prevention (ACFP): https://docs.aws.amazon.com/waf/latest/developerguide/waf-acfp.html
- AWS WAF Developer Guide: ACFP managed rule group and rule listing: https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-acfp.html
- AWS WAF API Reference: RequestInspectionACFP: https://docs.aws.amazon.com/waf/latest/APIReference/API_RequestInspectionACFP.html
- AWS WAF API Reference: ResponseInspection and ResponseInspectionStatusCode: https://docs.aws.amazon.com/waf/latest/APIReference/API_ResponseInspection.html
- AWS WAF JavaScript integrations: https://docs.aws.amazon.com/waf/latest/developerguide/waf-javascript-api.html
- AWS CLI Command Reference: wafv2 get-sampled-requests: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-sampled-requests.html
- AWS WAF metrics and dimensions: https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- Terraform AWS provider docs for aws_wafv2_web_acl: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The AWS CLI and Terraform examples configured `ResponseInspection` on a `REGIONAL` web ACL. AWS documents response inspection for ACFP as available only for web ACLs that protect CloudFront distributions. Changed the examples to `CLOUDFRONT` scope and added `us-east-1` where AWS WAF CloudFront operations require it.
- The ACFP rules table listed rule names that are not in the current AWS-published ACFP rule listing, including `UnsortedStolenCredentialCheck`, `VolumetricSession`, `AttributeCompromisedCredentials`, `AttributeUsernameTraversal`, `AttributeEmailDomainHigh`, and `TokenRejected`. Replaced them with current ACFP rule names such as `RiskScoreHigh`, `SignalCredentialCompromised`, `VolumetricSessionHigh`, `AttributeUsernameTraversalHigh`, `VolumetricIPSuccessfulResponse`, `VolumetricSessionSuccessfulResponse`, and `VolumetricSessionTokenReuseIp`.
- The rule action override example used outdated or incorrect rule names. Updated the overrides to use current ACFP rule names.
- The JavaScript SDK example implied that including `challenge.js` automatically injects tokens into all requests from the page. AWS documents the intelligent threat integration fetch wrapper for sending token-bearing requests to protected endpoints, so the example now submits the registration request through `AwsWafIntegration.fetch`.
- The sampled requests example used a regional web ACL ARN and `REGIONAL` scope after response inspection made the example CloudFront-specific. Updated it to a CloudFront/global ARN shape and `CLOUDFRONT` scope.
- The best-practice section referenced `AttributeEmailDomainHigh`, which is not in the current ACFP rule listing. Reworded the guidance to recommend reviewing ACFP labels and maintaining a disposable-email blocklist.

## Review Notes
The post is technically relevant and includes implementation details. The local workspace did not have the AWS CLI installed, so CLI validation was performed against official AWS CLI and AWS WAF documentation rather than local `--help` output.
