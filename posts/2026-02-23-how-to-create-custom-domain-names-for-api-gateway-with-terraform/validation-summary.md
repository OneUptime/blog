# Validation Summary: How to Create Custom Domain Names for API Gateway with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- API Gateway custom domain names
- AWS Certificate Manager
- Amazon Route 53
- Amazon S3
- Amazon CloudWatch Logs
- Mutual TLS

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_api_gateway_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name
- HashiCorp Terraform AWS Provider documentation for `aws_api_gateway_base_path_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_base_path_mapping
- HashiCorp Terraform AWS Provider documentation for `aws_api_gateway_deployment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- HashiCorp Terraform AWS Provider documentation for `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- HashiCorp Terraform AWS Provider documentation for `aws_apigatewayv2_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name
- HashiCorp Terraform AWS Provider documentation for `aws_apigatewayv2_api_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- AWS API Gateway documentation for Regional custom domain names: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html
- AWS API Gateway documentation for edge-optimized custom domain names: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-edge-optimized-custom-domain-name.html
- AWS API Gateway documentation for mock integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html
- AWS CloudFormation reference for API Gateway V2 mutual TLS authentication: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigatewayv2-domainname-mutualtlsauthentication.html

## Issues Found
- The REST API example created a `/health` method but did not define an API Gateway integration, so the deployed method would not return the demonstrated response. Added a `MOCK` integration plus method and integration responses, and made the deployment depend on the integration response.
- The ACM certificate example only covered `api.example.com` and `*.api.example.com`, but later examples reused it for `global-api.example.com` and `secure-api.example.com`. Added both hostnames to the certificate SAN list so the certificate matches every custom domain used in the post.
- The certificate-region wording implied edge-optimized custom domains were tied to APIs in `us-east-1`. Clarified that edge-optimized custom domain certificates must be in `us-east-1`, while Regional custom domain certificates must be in the API Region.
- The multiple-service base path mapping snippet referenced a `prod` stage for each API without saying those stages must already exist. Clarified that each API needs a deployed `prod` stage before creating the mappings.

## Review Notes
Terraform was not installed in the workspace, so I could not run `terraform validate`. The HCL was reviewed statically against current HashiCorp AWS Provider documentation and AWS API Gateway documentation. The REST deployment example still omits deployment `triggers`; that is acceptable for an initial tutorial apply, but production configurations should add triggers so API changes cause redeployment.
