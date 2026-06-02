# Validation Summary: How to Configure Global Accelerator Custom Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Global Accelerator custom routing accelerators
- AWS CLI
- Amazon EC2 and VPC subnet endpoints
- Amazon CloudWatch metrics
- Python boto3

## Sources Consulted
- AWS Global Accelerator Developer Guide: How custom routing accelerators work - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-how-it-works.html
- AWS Global Accelerator Developer Guide: Guidelines and restrictions for custom routing accelerators - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-guidelines.html
- AWS Global Accelerator Developer Guide: Amazon VPC subnet endpoints for custom routing accelerators - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoints.html
- AWS CLI Command Reference: create-custom-routing-accelerator - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-custom-routing-accelerator.html
- AWS CLI Command Reference: create-custom-routing-listener - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-custom-routing-listener.html
- AWS CLI Command Reference: create-custom-routing-endpoint-group - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-custom-routing-endpoint-group.html
- AWS CLI Command Reference: add-custom-routing-endpoints - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/add-custom-routing-endpoints.html
- AWS CLI Command Reference: allow-custom-routing-traffic - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/allow-custom-routing-traffic.html
- AWS CLI Command Reference: deny-custom-routing-traffic - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/deny-custom-routing-traffic.html
- AWS CLI Command Reference: list-custom-routing-port-mappings - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/list-custom-routing-port-mappings.html
- AWS CLI Command Reference: list-custom-routing-port-mappings-by-destination - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/list-custom-routing-port-mappings-by-destination.html
- Boto3 GlobalAccelerator client documentation: list_custom_routing_port_mappings_by_destination - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/globalaccelerator/client/list_custom_routing_port_mappings_by_destination.html
- AWS Global Accelerator Developer Guide: Using Amazon CloudWatch with AWS Global Accelerator - https://docs.aws.amazon.com/global-accelerator/latest/dg/cloudwatch-monitoring.html

## Issues Found
- Corrected the explanation of port mappings. The original text implied that each EC2 instance is assigned ports and that Global Accelerator discovers instances in a subnet. AWS documents custom routing as static mappings from listener ports to destination IP address and port combinations in subnet endpoints.
- Corrected the scaling guidance. The original text said new EC2 instances automatically get new port mappings. AWS documents that port mappings do not change when EC2 instances are added or removed from an existing subnet endpoint; new mappings are created when subnet endpoints are added.
- Corrected the boto3 example. `list_custom_routing_port_mappings_by_destination` returns `AcceleratorSocketAddresses`, not `AcceleratorPort`, so the example now reads the accelerator IP and port from `mapping['AcceleratorSocketAddresses'][0]`.

## Review Notes
The AWS CLI examples match current command names and parameter shapes. The local environment did not have the AWS CLI installed, so CLI verification was performed against the official AWS CLI command reference rather than local `--help` output.
