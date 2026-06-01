# Validation Summary: How to Use Lambda with EFS for Shared File Storage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon Elastic File System (Amazon EFS)
- AWS CLI
- AWS CloudFormation
- IAM
- VPC security groups
- JavaScript / Node.js file APIs
- Python file APIs

## Sources Consulted
- AWS Lambda Developer Guide: Configuring Amazon EFS file system access - https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html
- AWS Lambda API Reference: FileSystemConfig - https://docs.aws.amazon.com/lambda/latest/api/API_FileSystemConfig.html
- AWS Lambda Developer Guide: Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda Developer Guide: Configure ephemeral storage - https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html
- Amazon EFS User Guide: Creating access points - https://docs.aws.amazon.com/efs/latest/ug/create-access-point.html
- Amazon EFS User Guide: CreateMountTarget API - https://docs.aws.amazon.com/efs/latest/ug/API_CreateMountTarget.html
- Amazon EFS User Guide: Throughput modes - https://docs.aws.amazon.com/efs/latest/ug/throughput-modes.html
- Amazon EFS User Guide: Using IAM to control access to file systems - https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- AWS CloudFormation: AWS::Lambda::Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html
- AWS CloudFormation: AWS::EC2::SecurityGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroup.html
- AWS CloudFormation: AWS::EC2::SecurityGroupEgress - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroupegress.html

## Issues Found
- The architecture description said EFS mount targets must exist in the same subnets as Lambda. AWS documents the requirement as a mount target in every Availability Zone where the function connects, or reachable subnets in those Availability Zones. Updated the wording.
- The access point explanation implied the root directory is created immediately and unconditionally. EFS creates it on first mount only when `CreationInfo` is supplied. Updated the wording.
- Several AWS CLI examples used placeholder IDs that did not match current documented ID patterns, including the Lambda access point ARN. Replaced them with valid-looking example IDs.
- The security group CloudFormation example cross-referenced two security groups with embedded rules, which AWS warns can create circular dependencies. Changed the snippet to standalone `AWS::EC2::SecurityGroupIngress` and `AWS::EC2::SecurityGroupEgress` resources.
- The CloudFormation Lambda function omitted the required deployment package/code configuration. Added a minimal inline `Code.ZipFile` example and changed the comment from "Complete" to "Core" because surrounding resources such as subnets, role, and security groups remain references.
- The file-processing Python snippet used `os.makedirs` and `os.path.dirname` without importing `os`. Added the missing import.
- The bursting-throughput performance note overstated that a nearly empty file system will be slow. Updated it to distinguish sustained baseline throughput from burst-credit behavior and mention Elastic or Provisioned throughput for heavier access.
- The IAM section stated that the Lambda execution role always needs EFS client permissions. AWS documents that these role permissions are required when a user-configured EFS file system policy is present; otherwise the default file system policy grants access to clients that can connect. Updated the wording.

## Review Notes
- JavaScript snippets passed `node --check`.
- Python snippets compiled successfully with Python 3.
- The ML example assumes the loaded model object exposes a `predict` method; that can be valid for a wrapped model artifact, but PyTorch modules more commonly use `model(input)`.
