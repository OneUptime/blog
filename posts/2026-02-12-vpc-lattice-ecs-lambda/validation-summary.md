# Validation Summary: How to Use VPC Lattice with ECS and Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC Lattice
- Amazon ECS and AWS Fargate
- AWS Lambda
- AWS CLI
- AWS IAM and SigV4
- AWS CloudFormation
- Python
- Node.js

## Sources Consulted
- AWS CLI Command Reference: create-target-group - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/create-target-group.html
- AWS CLI Command Reference: register-targets - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/register-targets.html
- AWS CLI Command Reference: update-listener - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/update-listener.html
- AWS CLI Command Reference: update-rule - https://docs.aws.amazon.com/cli/latest/reference/vpc-lattice/update-rule.html
- Amazon ECS Developer Guide: Create a service that uses VPC Lattice - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-vpc-lattice-create-service.html
- Amazon VPC Lattice User Guide: Lambda functions as targets - https://docs.aws.amazon.com/vpc-lattice/latest/ug/lambda-functions.html
- Amazon VPC Lattice User Guide: Configure a custom domain name - https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-custom-domain-name.html
- AWS CloudFormation: AWS::VpcLattice::TargetGroup TargetGroupConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-vpclattice-targetgroup-targetgroupconfig.html
- AWS Service Authorization Reference: Amazon VPC Lattice Services - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonvpclatticeservices.html

## Issues Found
- The ECS section recommended a custom EventBridge and Lambda workflow to register and deregister ECS task IPs. Current ECS VPC Lattice integration supports `vpcLatticeConfigurations`, where ECS registers and deregisters service tasks automatically. Replaced the custom registrar flow with an ECS service configuration example.
- The ECS target group example used an invalid VPC ID placeholder. Updated it to a valid placeholder format.
- The Lambda target group used the default event structure while the handler used V2-style field names. Added `lambdaEventStructureVersion: V2` in the AWS CLI example and `LambdaEventStructureVersion: V2` in CloudFormation.
- The Lambda handler response omitted `isBase64Encoded`, which VPC Lattice expects in Lambda responses. Added it to success and error responses.
- The VPC Lattice service DNS name in the Node.js example did not match the documented generated DNS format. Replaced it with a generated-domain-style VPC Lattice service hostname.
- The Node.js signing example used the old `@aws-sdk/signature-v4` import path. Updated it to `@smithy/signature-v4` and added protocol and content length fields to the request being signed.
- Several placeholder service, target group, listener, and service network IDs did not match documented AWS ID formats. Updated them to valid placeholder shapes.
- The IAM policy used a stale service ID in one resource ARN. Updated it to match the corrected service ID.
- The gradual migration example used `update-rule` against a default listener rule. AWS documents that default listener rules are modified with `update-listener`, so the command was corrected.

## Review Notes
- The CloudFormation snippet is still intentionally partial because it references a `ProcessorFunction` that would be defined elsewhere in a full stack. The VPC Lattice resource properties shown in the snippet are aligned with the current CloudFormation documentation.
