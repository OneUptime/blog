# Validation Summary: How to Set Up AWS Network Load Balancer with IPv4 Target Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elastic Load Balancing
- Network Load Balancer
- Application Load Balancer
- AWS CLI elbv2 commands
- Target groups
- TCP and TLS listeners
- IPv4 target groups
- Elastic IP addresses
- AWS PrivateLink

## Sources Consulted
- AWS Elastic Load Balancing: What is a Network Load Balancer? https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
- AWS Elastic Load Balancing: Target groups for your Network Load Balancers https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Elastic Load Balancing: Edit target group attributes for your Network Load Balancer https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Elastic Load Balancing: Listeners for your Network Load Balancers https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- AWS Elastic Load Balancing: Create a Network Load Balancer https://docs.aws.amazon.com/elasticloadbalancing/latest/network/create-network-load-balancer.html
- AWS Elastic Load Balancing: Security policies for your Network Load Balancer https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html
- AWS CLI Command Reference: elbv2 create-target-group https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: elbv2 create-load-balancer https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI Command Reference: elbv2 create-listener https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: elbv2 register-targets https://docs.aws.amazon.com/cli/latest/reference/elbv2/register-targets.html
- AWS Elastic Load Balancing: HTTP headers and Application Load Balancers https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html
- AWS PrivateLink: Create a service powered by AWS PrivateLink https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html

## Issues Found
- The introduction said NLB preserves client source IP addresses without qualification. Updated it to say NLB can preserve source IP addresses because AWS documents protocol and target-type-specific behavior, including disabled-by-default preservation for TCP/TLS IP target groups.
- The introduction said NLB is required for PrivateLink-based services. Updated it to say NLB can be used for PrivateLink endpoint services because AWS endpoint services can use Network Load Balancers or Gateway Load Balancers.
- The IP target group section described IP targets as being for Lambda. Removed Lambda from that heading because Network Load Balancers do not support Lambda target groups.
- The NLB vs ALB table said ALB source IP preservation is available through Proxy Protocol. Changed it to X-Forwarded-For because Application Load Balancers pass client IP information using HTTP headers, not Proxy Protocol.
- The NLB vs ALB table listed exact latency figures that were not supported by the official documentation consulted. Replaced them with qualitative wording that matches AWS documentation.
- The conclusion implied TLS target groups are used for TLS termination. Changed it to TLS listeners, which are the NLB component that terminates front-end TLS connections.
- Several placeholder AWS resource IDs and the ACM certificate ARN were not shaped like valid AWS identifiers. Replaced them with syntactically realistic placeholder values.

## Review Notes
- The AWS CLI commands and elbv2 options in the examples are current and match the AWS CLI command reference.
- The TLS security policy shown is still a valid Network Load Balancer policy. AWS currently recommends newer post-quantum TLS policies for new TLS listeners where compatible.
