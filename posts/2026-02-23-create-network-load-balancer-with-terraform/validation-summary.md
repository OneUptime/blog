# Validation Summary: How to Create Network Load Balancer with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Elastic Load Balancing Network Load Balancers
- AWS NLB listeners and target groups
- AWS Elastic IP addresses
- AWS Certificate Manager
- Amazon S3 access logging
- Amazon Route 53 alias records
- Proxy Protocol v2

## Sources Consulted
- Terraform AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_lb_listener_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_certificate
- Terraform AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS Network Load Balancer listener documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- AWS Network Load Balancer target group documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Network Load Balancer health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS Network Load Balancer access log documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/enable-access-logs.html
- AWS Application Load Balancer gRPC support announcement: https://aws.amazon.com/about-aws/whats-new/2020/10/application-load-balancers-enable-grpc-workloads-end-to-end-http-2-support/

## Issues Found
- The decision guide listed "gRPC without HTTP/2" as an NLB use case. gRPC uses HTTP/2, and ALB supports gRPC over HTTP/2, so I changed this to "TCP pass-through protocols."
- The listener section stated that NLBs support TCP, UDP, TCP_UDP, and TLS. Current AWS documentation also lists QUIC and TCP_QUIC, so I updated the protocol list.
- The UDP target group health check comment said health checks are always TCP or HTTP. AWS documentation also supports HTTPS health checks, so I corrected the comment.
- The IP target group section said to use IP target groups for targets outside the VPC without stating the address restrictions. AWS documentation does not allow publicly routable IP targets, so I added the supported-private-address caveat.
- The access logging section implied all NLB traffic could be logged to S3. AWS documentation states NLB access logs are created only for TLS listeners and contain TLS request information, so I clarified the wording.

## Review Notes
- The Terraform examples are partial snippets and assume resources such as VPCs, subnets, Route 53 zones, ACM certificates, target groups, and variables are defined elsewhere.
- The S3 bucket policy follows the log delivery service-principal pattern, but production configurations should also include `aws:SourceAccount` and `aws:SourceArn` conditions as shown in current AWS documentation.
