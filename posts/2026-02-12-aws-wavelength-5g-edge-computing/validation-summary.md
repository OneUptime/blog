# Validation Summary: How to Use AWS Wavelength for 5G Edge Computing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Wavelength
- Amazon EC2
- Amazon VPC
- Carrier gateways and Carrier IP addresses
- AWS CLI
- Boto3 for Python
- Amazon CloudWatch
- VPC endpoints
- AWS Local Zones

## Sources Consulted
- AWS Wavelength Developer Guide: What is AWS Wavelength? https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html
- AWS Wavelength Developer Guide: How AWS Wavelength works https://docs.aws.amazon.com/wavelength/latest/developerguide/how-wavelengths-work.html
- AWS Wavelength Developer Guide: Carrier gateway for AWS Wavelength https://docs.aws.amazon.com/wavelength/latest/developerguide/carrier-gateways.html
- AWS Wavelength Developer Guide: Quotas and considerations for Wavelength Zones https://docs.aws.amazon.com/wavelength/latest/developerguide/wavelength-quotas.html
- AWS Wavelength Developer Guide: Available Wavelength Zones https://docs.aws.amazon.com/wavelength/latest/developerguide/available-wavelength-zones.html
- AWS CLI Command Reference: describe-availability-zones https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-availability-zones.html
- AWS CLI Command Reference: modify-availability-zone-group https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-availability-zone-group.html
- AWS CLI Command Reference: create-carrier-gateway https://docs.aws.amazon.com/cli/latest/reference/ec2/create-carrier-gateway.html
- AWS CLI Command Reference: create-route https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: allocate-address https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: associate-address https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference: create-vpc-endpoint https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- Amazon VPC User Guide: Gateway endpoints https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS Local Zones User Guide: How AWS Local Zones work https://docs.aws.amazon.com/local-zones/latest/ug/how-local-zones-work.html
- OneUptime linked blog URL: https://oneuptime.com/blog/post/2026-02-12-aws-local-zones-low-latency-applications/view

## Issues Found
- The opt-in example used a Wavelength Zone name as the availability zone group without showing the actual `GroupName`. Updated the `describe-availability-zones` query to include `GroupName` and changed the opt-in example to use the Wavelength zone group.
- The VPC endpoint guidance did not mention that interface VPC endpoints must be created in regular Availability Zone subnets, not Wavelength subnets. Added that caveat and clarified that the sample command is for a gateway endpoint route table association.
- The multi-location Boto3 example assumed a single VPC could span `us-east-1` and `us-west-2`. Reworked the sample to use one VPC and one EC2 client per parent Region.
- The monitoring section implied standard EC2 CloudWatch metrics include latency metrics. Updated it to state that EC2 provides network throughput metrics and that latency should be measured with custom client or application probes.
- The Local Zones comparison said Local Zones "still connect through the public internet." Updated it to reflect local internet ingress/egress and private connectivity to the parent Region.
- The comparison implied Wavelength always gives better latency for 5G users. Narrowed the claim to users in the right carrier network and metro area.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI Command Reference instead of local `--help` output. Python snippets were syntax-checked with Python 3.
