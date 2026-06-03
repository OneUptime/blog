# Validation Summary: How to Configure ALB Authentication with Cognito and OIDC

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Application Load Balancer
- Amazon Cognito user pools and hosted UI domains
- OpenID Connect and OAuth 2.0 authorization code flow
- AWS CLI
- AWS CloudFormation
- Okta OIDC
- Google OpenID Connect
- Node.js Express
- JSON Web Tokens

## Sources Consulted
- AWS Elastic Load Balancing documentation: Authenticate users using an Application Load Balancer, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html
- AWS CLI Command Reference: elbv2 modify-listener, https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-listener.html
- AWS CLI Command Reference: elbv2 create-rule, https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- AWS CLI Command Reference: cognito-idp create-user-pool, https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- AWS CLI Command Reference: cognito-idp create-user-pool-client, https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- AWS CloudFormation reference: AWS::ElasticLoadBalancingV2::Listener AuthenticateCognitoConfig, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-listener-authenticatecognitoconfig.html
- AWS CloudFormation reference: AWS::Cognito::UserPoolClient, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html
- AWS CloudFormation reference: AWS::Cognito::UserPoolDomain, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpooldomain.html
- Okta OpenID Connect and OAuth 2.0 API documentation, https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/orgas/
- Google OpenID Connect documentation, https://developers.google.com/identity/openid-connect/openid-connect
- jsonwebtoken documentation, https://github.com/auth0/node-jsonwebtoken

## Issues Found
- The Node.js JWT verification example used `jwks-rsa` with `https://public-keys.auth.elb.us-east-1.amazonaws.com` as a JWKS URI. AWS ALB authentication exposes public keys by key ID at `https://public-keys.auth.elb.<region>.amazonaws.com/<key-id>`, not as a JWKS document. Replaced the example with a per-`kid` PEM fetch using Node's `https` module.
- The JWT verification example only verified the signature. AWS recommends also validating that the JWT header `signer` field contains the expected ALB ARN before authorizing based on claims. Added an `EXPECTED_ALB_ARN` check.
- The sample `x-amzn-oidc-identity` value showed an email address while AWS documents this header as the subject (`sub`) from the user info endpoint. Changed the example value to an opaque subject-style identifier.
- The CloudFormation Cognito user pool domain used `auth-${AWS::StackName}`. Cognito prefix domains must be lowercase letters, numbers, and hyphens, while CloudFormation stack names can include uppercase letters. Changed the example to `app-auth-${AWS::AccountId}`.
- The mixed authentication comment said the `deny` mode allowed programmatic access. ALB authentication is browser-session oriented; AWS documents `deny` as returning HTTP 401 for unauthenticated AJAX/API-style calls instead of redirecting. Updated the wording.

## Review Notes
- The AWS CLI binary was not installed locally, so CLI syntax was checked against the official AWS CLI command reference rather than local `--help` output.
- The edited JavaScript snippet was syntax-checked with the local Node.js runtime.
