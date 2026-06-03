# Validation Summary: How to Set Up ACM Certificates with Application Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Certificate Manager
- AWS Application Load Balancer
- Elastic Load Balancing v2 listeners and listener certificates
- AWS CLI
- Terraform AWS provider
- Route 53 DNS validation
- TLS security policies
- Security groups

## Sources Consulted
- AWS CLI `elbv2 create-listener` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI `elbv2 add-listener-certificates` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/add-listener-certificates.html
- AWS CLI `acm request-certificate` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS Elastic Load Balancing SSL certificates for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html
- AWS Elastic Load Balancing HTTPS listener guide: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
- AWS Elastic Load Balancing Application Load Balancer quotas: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html
- AWS Elastic Load Balancing security policies for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing target groups for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Certificate Manager managed renewal docs: https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- Terraform AWS provider `aws_lb_listener` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_lb_listener_certificate` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_certificate
- Terraform AWS provider `aws_acm_certificate` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider `aws_acm_certificate_validation` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation

## Issues Found
- The post stated that ALBs support up to 25 certificates per listener through SNI. AWS documents the quota as 25 additional certificates per Application Load Balancer, excluding default certificates. Updated the wording to match the official quota.
- The post described `ELBSecurityPolicy-2016-08` simply as "the default." AWS now documents different defaults depending on creation method: the console uses a newer TLS 1.3 post-quantum policy, while CLI/API/CloudFormation/CDK use `ELBSecurityPolicy-2016-08`. Updated the sentence to specify the default context.
- The backend HTTPS section implied end-to-end encryption without mentioning target certificate behavior. AWS documents that Application Load Balancers do not validate target certificates. Added that caveat.

## Review Notes
The AWS CLI examples, Terraform resource names and arguments, SNI explanation, ACM regional requirement for ALB certificates, HTTP-to-HTTPS redirect examples, host-based routing rules, and ACM managed-renewal statement are consistent with the official documentation reviewed. Local `aws` and `terraform` binaries were not installed in the workspace, so command validation was performed against official documentation rather than local `--help` output or `terraform validate`.
