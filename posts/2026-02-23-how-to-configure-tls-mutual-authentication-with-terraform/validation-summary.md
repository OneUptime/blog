# Validation Summary: How to Configure TLS Mutual Authentication with Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform
- AWS API Gateway HTTP APIs
- AWS Application Load Balancer
- AWS Lambda authorizers
- AWS Certificate Manager
- Amazon S3
- TLS/mTLS and X.509 certificates
- OpenSSL
- curl

## Sources Consulted
- AWS API Gateway Developer Guide: HTTP API mutual TLS authentication - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-mutual-tls.html
- AWS API Gateway Developer Guide: HTTP API Lambda authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
- AWS CloudFormation Template Reference: AWS::ApiGatewayV2::Authorizer - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer.html
- AWS Compute Blog: Introducing mutual TLS authentication for Amazon API Gateway - https://aws.amazon.com/blogs/compute/introducing-mutual-tls-authentication-for-amazon-api-gateway/
- AWS Elastic Load Balancing docs: Configuring mutual TLS on an Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/configuring-mtls-with-elb.html
- AWS Elastic Load Balancing docs: Mutual authentication with TLS in Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/mutual-authentication.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS Provider Registry: aws_apigatewayv2_api - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS Provider Registry: aws_apigatewayv2_domain_name - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name
- Terraform AWS Provider Registry: aws_apigatewayv2_authorizer - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_authorizer
- Terraform AWS Provider Registry: aws_acm_certificate_validation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS Provider Registry: aws_lb_listener - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS Provider Registry: aws_lb_trust_store - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_trust_store
- Terraform AWS Provider Registry: aws_lb_trust_store_revocation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_trust_store_revocation
- Local OpenSSL 3.0.13 help output for `openssl req` and `openssl x509`
- Local curl help output for `--cert` and `--key`

## Issues Found
- The API Gateway example enabled mTLS only on the custom domain but left the default `execute-api` endpoint enabled. Added `disable_execute_api_endpoint = true` so clients cannot bypass mTLS by using the default API endpoint.
- The ACM certificate was requested with DNS validation but used before Terraform waited for certificate issuance. Added Route 53 validation records, `aws_acm_certificate_validation`, and updated API Gateway and ALB to use the validated certificate ARN.
- The API Gateway truststore object version was referenced without enabling S3 bucket versioning in the main configuration. Added `aws_s3_bucket_versioning`, made the truststore object depend on it, and updated the rotation example to apply with a new truststore file.
- The Lambda authorizer example used the REST API client certificate context path for an HTTP API payload v2 authorizer. Changed the identity source to `$context.authentication.clientCert.subjectDN`.
- The Lambda permission used a broad API execution ARN. Scoped it to the HTTP API authorizer ARN pattern documented by AWS.
- The Lambda function used the deprecated `nodejs18.x` runtime. Updated it to `nodejs24.x`, which is listed as a supported Lambda runtime.
- The Lambda authorizer section implied that creating an authorizer alone was enough for granular certificate validation. Added a note that the authorizer must be attached to routes.
- The ALB trust store and revocation examples did not pin the S3 object versions even though versioning is enabled. Added `ca_certificates_bundle_s3_object_version` and `revocations_s3_object_version`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets still reference surrounding infrastructure not shown in the post, such as VPC, subnet, target group attachments, API routes, and integrations; this is acceptable for a focused mTLS configuration guide but would need completion before direct deployment.
