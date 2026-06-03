# Validation Summary: How to Set Up API Gateway Custom Domain with Route 53

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Amazon Route 53
- AWS Certificate Manager
- AWS CLI
- AWS CloudFormation
- Terraform AWS Provider
- DNS and HTTPS custom domains

## Sources Consulted
- AWS API Gateway Developer Guide: Get certificates ready in AWS Certificate Manager - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-specify-certificate-for-custom-domain-name.html
- AWS API Gateway Developer Guide: Set up a Regional custom domain name in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html
- AWS API Gateway Developer Guide: Set up an edge-optimized custom domain name in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-edge-optimized-custom-domain-name.html
- AWS CLI Command Reference: apigateway create-domain-name - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-domain-name.html
- AWS CLI Command Reference: apigateway create-base-path-mapping - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-base-path-mapping.html
- AWS CLI Command Reference: apigatewayv2 create-domain-name - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-domain-name.html
- AWS CLI Command Reference: apigatewayv2 create-api-mapping - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api-mapping.html
- AWS CLI Command Reference: acm request-certificate - https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS CLI Command Reference: acm wait certificate-validated - https://docs.aws.amazon.com/cli/latest/reference/acm/wait/certificate-validated.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::DomainName - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-domainname.html
- AWS General Reference: Amazon API Gateway endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/apigateway.html
- HashiCorp Terraform Registry: aws_api_gateway_base_path_mapping - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_base_path_mapping
- HashiCorp Terraform Registry: aws_api_gateway_domain_name - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name

## Issues Found
- The REST API root base path mapping example used `--base-path ""`. AWS CLI documentation says the base path is optional and uses `(none)` semantics for no base path, and Terraform documentation also treats omitted `base_path` as root. I changed the root mapping command to omit `--base-path` and kept a note showing how to use `--base-path "v1"` for a non-root mapping.
- The Route 53 alias example for a `us-west-2` regional API used hosted zone ID `Z1UJRXOUMOOFQ8`, which is the API Gateway data plane hosted zone ID for `us-east-1`. I changed it to `Z2OJLYMUO9EFXC`, the documented hosted zone ID for `execute-api.us-west-2.amazonaws.com`.

## Review Notes
The remaining AWS CLI, CloudFormation, and Terraform examples match current documented field names and resource shapes. The examples assume the certificate, API Gateway custom domain, and API resources are created in the same AWS Region for regional endpoints.
