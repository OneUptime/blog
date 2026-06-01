# Validation Summary: How to Set Up VPC Lattice for Service-to-Service Networking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon VPC Lattice
- AWS CLI
- AWS IAM and SigV4 request signing
- AWS CloudFormation
- Python with boto3, botocore, and requests

## Sources Consulted
- Amazon VPC Lattice User Guide: What is Amazon VPC Lattice? https://docs.aws.amazon.com/vpc-lattice/latest/ug/what-is-vpc-lattice.html
- Amazon VPC Lattice User Guide: Service networks https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-networks.html
- Amazon VPC Lattice User Guide: Control traffic using security groups https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-groups.html
- Amazon VPC Lattice User Guide: Auth policies https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html
- Amazon VPC Lattice User Guide: Custom domain names and generated service DNS names https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-custom-domain-name.html
- AWS CLI Command Reference: vpc-lattice create-service-network https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/create-service-network.html
- AWS CLI Command Reference: vpc-lattice create-service-network-vpc-association https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/create-service-network-vpc-association.html
- AWS CLI Command Reference: vpc-lattice create-service, create-target-group, register-targets, create-listener, put-auth-policy, update-listener, and update-rule https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/
- AWS CloudFormation Template Reference: AWS::VpcLattice::Service, TargetGroup, Listener, and ServiceNetworkServiceAssociation https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/
- botocore documentation for SigV4Auth and AWSRequest https://botocore.amazonaws.com/v1/documentation/api/latest/reference/auth.html

## Issues Found
- The service network example used `--auth-type AWS_IAM` but did not attach a service network auth policy. AWS documents that an IAM-enabled service network without an auth policy denies traffic, so the example now uses `--auth-type NONE` and explains when a service network auth policy is required.
- Several placeholder VPC, service, listener, and target group identifiers did not match VPC Lattice or EC2 ID patterns. Replaced them with valid placeholder-shaped IDs.
- The generated service DNS name used an incorrect service-network-based format. Updated it to the documented VPC Lattice generated DNS format: `service_name-service_id.partition_id.vpc-lattice-svcs.region.on.aws`.
- The Python client used an HTTPS URL while the listener example created an HTTP listener on port 80. Updated the URL to `http://` so the signed request matches the listener configuration.
- The canary deployment example used `update-rule` against a default listener rule. AWS CLI documentation states default listener rules must be modified with `update-listener`, so the command now updates the listener default action.
- The CloudFormation section claimed to set up the whole environment, but the template only creates the core service resources and assumes an existing service network and VPC association. Adjusted the wording to avoid overstating the template's scope.
- The auth policy explanation implied the resource policy alone was sufficient. Updated it to note that callers also need identity-based IAM permissions.
- The description of VPC Lattice as working "at the network layer" was imprecise for an application networking service. Reworded it as managed service-mesh-like networking built into AWS networking.

## Review Notes
The CloudFormation template remains a focused core-service example. A production CloudFormation version should usually add service network/VPC associations, auth policies, access logs, and security group rules explicitly.
