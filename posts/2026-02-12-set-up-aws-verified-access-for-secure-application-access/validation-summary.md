# Validation Summary: How to Set Up AWS Verified Access for Secure Application Access

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Verified Access
- AWS CLI
- OpenID Connect (OIDC)
- Cedar policy language
- AWS Route 53
- Amazon CloudWatch Logs
- Amazon S3
- AWS Certificate Manager
- Elastic Load Balancing
- CrowdStrike device trust

## Sources Consulted
- AWS Verified Access User Guide: How Verified Access works - https://docs.aws.amazon.com/verified-access/latest/ug/how-it-works.html
- AWS Verified Access User Guide: User-identity trust providers - https://docs.aws.amazon.com/verified-access/latest/ug/user-trust.html
- AWS Verified Access User Guide: Third-party trust provider context - https://docs.aws.amazon.com/verified-access/latest/ug/trust-data-third-party-trust.html
- AWS Verified Access User Guide: Verified Access policies - https://docs.aws.amazon.com/verified-access/latest/ug/auth-policies.html
- AWS Verified Access User Guide: Verified Access policy statement structure - https://docs.aws.amazon.com/verified-access/latest/ug/auth-policies-policy-statement-struct.html
- AWS Verified Access User Guide: Verified Access example policies - https://docs.aws.amazon.com/verified-access/latest/ug/trust-data-iam-add-pol.html
- AWS Verified Access User Guide: Get started tutorial - https://docs.aws.amazon.com/verified-access/latest/ug/getting-started.html
- AWS CLI Command Reference: create-verified-access-trust-provider - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-trust-provider.html
- AWS CLI Command Reference: create-verified-access-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-verified-access-endpoint.html
- AWS CLI Command Reference: modify-verified-access-instance-logging-configuration - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-verified-access-instance-logging-configuration.html

## Issues Found
- The post said no client software is required. That is only accurate for browser-based access without device trust; device trust integrations require browser extensions or provider-specific components. Changed the VPN comparison to say no VPN client is required, and added a note about device trust components.
- The CrowdStrike device trust provider example omitted `PublicSigningKeyUrl`, which is part of the AWS CLI device options structure. Added the field as a provider-specific placeholder.
- The CrowdStrike Cedar examples used `context.crowdstrike.overall_assessment` string values. AWS documents CrowdStrike trust data under `context.<policy-reference-name>.assessment.overall` as a numeric score. Updated the examples to use `context.crowdstrike.assessment.overall > 50` and `<= 50`.
- The Verified Access group ID placeholder used `vag-`; AWS examples and resource IDs use the `vagr-` prefix. Updated the endpoint example.
- The Verified Access endpoint DNS example used an inaccurate simplified domain format. Updated it to the documented `edge-...vai-...prod.verified-access.<region>.amazonaws.com` style.

## Review Notes
The remaining examples are representative placeholders and still require environment-specific values such as real OIDC endpoints, ACM certificate ARN, subnet IDs, load balancer ARN, security group ID, Route 53 hosted zone ID, and trust provider IDs. AWS CLI was not installed in the local workspace, so CLI verification was performed against the official AWS CLI reference rather than local `aws ... help` output.
