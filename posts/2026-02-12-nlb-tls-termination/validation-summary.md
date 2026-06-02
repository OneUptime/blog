# Validation Summary: How to Set Up NLB with TLS Termination

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Load Balancer
- Elastic Load Balancing v2 listeners and target groups
- TLS termination and TLS passthrough
- AWS Certificate Manager
- AWS CLI
- AWS CloudFormation
- CloudWatch metrics
- Proxy protocol v2

## Sources Consulted
- AWS Elastic Load Balancing: Listeners for your Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- AWS Elastic Load Balancing: Server certificates for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/tls-listener-certificates.html
- AWS Elastic Load Balancing: Security policies for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html
- AWS Elastic Load Balancing: Target groups for your Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Elastic Load Balancing: CloudWatch metrics for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-cloudwatch-metrics.html
- AWS CloudFormation: AWS::ElasticLoadBalancingV2::Listener: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listener.html
- AWS CloudFormation: AWS::ElasticLoadBalancingV2::TargetGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html
- AWS CLI Command Reference: create-trust-store: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-trust-store.html

## Issues Found
- The post incorrectly stated that NLB TLS listeners only work with ACM certificates and that custom certificates cannot be uploaded. AWS recommends ACM, but NLB TLS listeners can use server certificates created or imported into ACM, and AWS documentation also discusses IAM-imported certificates. I changed the prerequisite wording to require a server certificate and recommend ACM.
- The post incorrectly claimed that NLB supports load-balancer-managed mutual TLS with a trust store. AWS documentation states that Network Load Balancers do not support mutual TLS authentication; mTLS must be implemented on targets by using a TCP listener for passthrough, or an Application Load Balancer should be used when the load balancer must validate client certificates. I replaced the unsupported trust-store and `modify-listener --mutual-authentication` NLB example with a TCP passthrough listener example and corrected the explanation.
- The client IP preservation section implied that IP targets always require proxy protocol v2. AWS documents that client IP preservation is disabled by default for TCP and TLS target groups with IP targets, but it can be enabled when supported; proxy protocol v2 is another option when preservation is disabled or unavailable. I updated the wording accordingly.

## Review Notes
The local environment does not have the AWS CLI installed, so CLI syntax was checked against AWS documentation rather than local `aws --help` output. The remaining listener, target group, security policy, CloudFormation, and CloudWatch metric examples match the official AWS documentation reviewed.
