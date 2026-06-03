# Validation Summary: How to Set Up API Gateway Mutual TLS (mTLS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Mutual TLS and X.509 certificates
- AWS CLI
- Amazon S3 truststores
- AWS CloudFormation
- Terraform AWS provider
- AWS Lambda and Lambda authorizers
- OpenSSL
- curl

## Sources Consulted
- Amazon API Gateway Developer Guide: How to turn on mutual TLS authentication for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mutual-tls.html
- Amazon API Gateway Developer Guide: How to turn on mutual TLS authentication for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-mutual-tls.html
- AWS CLI Command Reference: `apigateway create-domain-name`: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-domain-name.html
- AWS CLI Command Reference: `apigatewayv2 create-domain-name`: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-domain-name.html
- AWS CloudFormation Template Reference: `AWS::ApiGateway::DomainName` `MutualTlsAuthentication`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigateway-domainname-mutualtlsauthentication.html
- Terraform AWS provider: `aws_api_gateway_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name
- Amazon API Gateway Developer Guide: Lambda proxy integrations in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Amazon API Gateway Developer Guide: Lambda proxy integrations for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS Compute Blog: Introducing mutual TLS authentication for Amazon API Gateway: https://aws.amazon.com/blogs/compute/introducing-mutual-tls-authentication-for-amazon-api-gateway/
- OpenSSL documentation: `openssl-req`, `openssl-x509`, and `openssl-verify`: https://docs.openssl.org/

## Issues Found
- The post said API Gateway rejects revoked certificates at the TLS level. AWS documentation states that API Gateway does not verify whether a certificate has been revoked. I changed the wording to list the native checks API Gateway performs and clarified that revocation checks require an authorizer.
- The truststore description only mentioned CA certificates generally. AWS requires the complete chain of trust from issuing CA to root CA, so I updated the prerequisite and truststore explanation.
- The REST API custom domain CLI example omitted the required TLS 1.2 security policy for mutual TLS. I added `--security-policy TLS_1_2`.
- The HTTP API CLI example used REST-style lowercase `truststoreUri`; AWS CLI v2 for `apigatewayv2` uses `TruststoreUri`. I corrected the casing and added `SecurityPolicy=TLS_1_2` to the domain name configuration.
- The curl failure comments only mentioned SSL handshake errors. AWS documents that API Gateway can deny the request with a 403 for failed mTLS validation, so I changed the expected result to "TLS handshake failure or a 403 response."
- The CloudFormation section called the snippet a complete setup even though it does not upload the S3 object and references `MyApi` without defining it. I changed the intro to say it assumes `truststore.pem` and `MyApi` exist, and added `SecurityPolicy: TLS_1_2`.
- The Lambda example implied one client certificate event path for all Lambda integrations. I clarified that the shown path is for REST API Lambda proxy integrations and added the HTTP API payload format 2.0 path.
- The truststore update section only showed the REST API update command. I added the corresponding HTTP API `apigatewayv2 update-domain-name` note with `TruststoreVersion`.

## Review Notes
The OpenSSL examples are suitable for testing, but production deployments should use a proper CA profile and certificate lifecycle process. The Terraform snippet is syntactically aligned with the current AWS provider resource shape, but like the CloudFormation snippet, it assumes the surrounding API mapping and DNS resources are handled elsewhere.
