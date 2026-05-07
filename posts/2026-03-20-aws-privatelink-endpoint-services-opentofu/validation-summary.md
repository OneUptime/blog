# Validation Summary: How to Create AWS PrivateLink Endpoint Services with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS PrivateLink
- Amazon VPC endpoint services
- Interface VPC endpoints
- Network Load Balancer
- AWS CLI
- AWS Certificate Manager (ACM)

## Sources Consulted
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- AWS PrivateLink endpoint service creation: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- AWS PrivateLink endpoint service configuration: https://docs.aws.amazon.com/vpc/latest/privatelink/configure-endpoint-service.html
- AWS PrivateLink service-sharing overview: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
- AWS PrivateLink interface endpoint configuration: https://docs.aws.amazon.com/vpc/latest/privatelink/interface-endpoints.html
- AWS PrivateLink DNS name management: https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html
- AWS CLI `describe-vpc-endpoint-service-configurations`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoint-service-configurations.html
- AWS CLI `describe-vpc-endpoint-connections`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoint-connections.html
- AWS CLI `accept-vpc-endpoint-connections`: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-endpoint-connections.html
- Network Load Balancer TLS security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html
- Network Load Balancer target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS provider `aws_vpc_endpoint_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_service
- AWS provider `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS provider `aws_vpc_endpoint_private_dns`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_private_dns

## Issues Found
- The Step 2 comment incorrectly implied that leaving `allowed_principals` empty would still let any account request access. AWS documents that endpoint services are not available by default and require explicit permissions, so I replaced that guidance with the correct wildcard note.
- Step 3 incorrectly created a second `aws_vpc_endpoint_service` resource for connection acceptance. AWS requires accepting or rejecting pending connections on the existing endpoint service, so I replaced that block with the correct `describe-vpc-endpoint-connections` and `accept-vpc-endpoint-connections` commands.
- The original post exposed only the service name, but the provider-side acceptance and status commands need the service ID. I added a `service_id` output.
- Step 4 enabled private DNS directly on `aws_vpc_endpoint`. Current AWS provider documentation exposes `aws_vpc_endpoint_private_dns` for managing that setting and warns against configuring it in both places, so I moved private DNS enablement to the dedicated resource.
- Step 5 used `describe-vpc-endpoint-services` and queried `ServiceDetails[0].ServiceState`, which is the wrong API for checking a provider-owned endpoint service configuration. I corrected it to `describe-vpc-endpoint-service-configurations --service-ids <service-id>` with the matching `ServiceConfigurations[0].ServiceState` query.

## Review Notes
- The NLB TLS listener configuration and `ELBSecurityPolicy-TLS13-1-2-2021-06` value are valid.
- The HTTPS target-group health check is valid, but AWS notes that targets using HTTPS health checks must support TLS 1.2 or earlier in addition to TLS 1.3.
- The consumer-side private DNS example assumes the provider's `private_dns_name` has already been verified and that the consumer VPC has DNS resolution and DNS hostnames enabled.
