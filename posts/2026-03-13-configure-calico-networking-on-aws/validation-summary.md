# Validation Summary: Configure Calico Networking on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- Helm
- AWS EC2
- AWS VPC route tables
- AWS security groups
- Terraform

## Sources Consulted
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- AWS CLI `modify-instance-attribute` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI `create-route` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- Amazon EC2 source/destination check documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html

## Issues Found
- The post description claimed the guide covered BGP setup, but the post does not configure BGP. Changed the description to refer to encapsulation setup instead.
- The Helm install snippet omitted the current Calico-documented CRD installation step. Added namespace creation and CRD application before installing the Tigera Operator chart.
- The post showed a direct `IPPool` with the same CIDR as the operator-created pool from the Helm install, which could be interpreted as creating a second overlapping pool. Clarified that this is the equivalent pool configuration and added the block size to the Helm values.
- The `IPPool` example set both `ipipMode: CrossSubnet` and `vxlanMode: CrossSubnet`. Calico documents these fields as mutually exclusive, so the example was corrected to use only `vxlanMode: CrossSubnet`, matching the VXLAN configuration used elsewhere in the post.
- The native routing example used `--instance-id` as the route target. AWS supports instance route targets in constrained cases, but the route table target for pod CIDR routing is clearer and less ambiguous when using the node network interface. Changed the example to use `--network-interface-id`.

## Review Notes
- The security group examples are syntactically valid AWS CLI examples. The IP-in-IP rule is only needed if the deployment uses IP-in-IP encapsulation instead of the VXLAN configuration shown earlier.
- The source/destination check command and Terraform setting are valid for EC2 instances used as routing targets.
