# Validation Summary: How to Configure AWS PrivateLink with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS PrivateLink
- Amazon VPC endpoints
- AWS VPC endpoint services
- Amazon S3 gateway endpoints
- Amazon DynamoDB gateway endpoints
- Amazon SNS

## Sources Consulted
- AWS PrivateLink concepts: https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html
- Gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Create a service powered by AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- Share your services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
- Receive alerts for endpoint service events: https://docs.aws.amazon.com/vpc/latest/privatelink/create-notification-endpoint-service.html
- EC2 API `CreateVpcEndpointConnectionNotification`: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVpcEndpointConnectionNotification.html
- Terraform AWS Provider `aws_vpc_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_endpoint.html.markdown
- Terraform AWS Provider `aws_vpc_endpoint_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_endpoint_service.html.markdown
- Terraform AWS Provider `aws_vpc_endpoint_connection_notification`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_endpoint_connection_notification.html.markdown
- OpenTofu `jsonencode`: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/

## Issues Found
- The introduction and description treated gateway endpoints as AWS PrivateLink. AWS currently documents gateway endpoints as a separate VPC endpoint type that does not use AWS PrivateLink, so I corrected the wording.
- The S3 gateway endpoint policy tried to interpolate `var.allowed_buckets[*]` directly into ARN strings, which does not produce valid per-bucket ARN entries. I replaced it with OpenTofu `for` expressions and `concat(...)` to build correct bucket and object ARN lists.
- The post used `aws_vpc_endpoint_service_notification`, which is not a valid Terraform/OpenTofu AWS provider resource. I replaced it with `aws_vpc_endpoint_connection_notification`.
- The endpoint notification example referenced an SNS topic that was never defined and omitted the topic access policy AWS PrivateLink needs to publish notifications. I added an SNS topic plus a policy allowing `vpce.amazonaws.com` with `aws:SourceArn` and `aws:SourceAccount` conditions.
- The notification events omitted `Connect`, which is the event AWS uses when a consumer creates the interface endpoint and the connection request is generated. I added it.
- The consumer-side note said custom services require custom DNS. I corrected it to reflect AWS behavior: consumers use endpoint-specific DNS unless the provider has configured and verified a private DNS name for the endpoint service.

## Review Notes
- The post now accurately distinguishes AWS PrivateLink resources from gateway VPC endpoints while still covering both because they are commonly deployed together.
- The custom service section still focuses on the PrivateLink-specific resources and assumes the internal NLB already fronts a working service.
