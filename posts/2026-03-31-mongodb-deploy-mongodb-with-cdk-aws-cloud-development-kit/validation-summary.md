# Validation Summary: How to Deploy MongoDB with CDK (AWS Cloud Development Kit)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- AWS CDK v2 (TypeScript)
- AWS EC2
- AWS EBS (gp3 volumes)
- AWS VPC and Security Groups
- AWS IAM
- AWS Systems Manager (SSM)
- Ubuntu 22.04 (Jammy)

## Sources Consulted
- AWS CDK v2 API Reference for `aws-cdk-lib/aws-ec2` — `MachineImage` static methods, `Instance`, `Vpc`, `SecurityGroup`, `BlockDeviceVolume`, `EbsDeviceVolumeType`
- AWS CDK v2 API Reference for `aws-cdk-lib/aws-iam` — `Role`, `ManagedPolicy`
- AWS CDK v2 Getting Started guide — `cdk init` scaffolding and `aws-cdk-lib` bundling
- MongoDB 7.0 installation guide for Ubuntu — GPG key URL and apt repository format

## Issues Found

1. **CDK v1 package install command (line 20)**: The project setup included `npm install @aws-cdk/aws-ec2 @aws-cdk/aws-iam`, which are CDK v1 scoped packages. The code throughout the post uses CDK v2 imports (`aws-cdk-lib/aws-ec2`, `aws-cdk-lib/aws-iam`), and `aws-cdk-lib` is already included as a dependency by `cdk init`. Removed the unnecessary and incorrect install command.

2. **Incorrect MachineImage method name (line 83)**: `ec2.MachineImage.fromSsm(...)` does not exist in CDK v2. The correct static method is `ec2.MachineImage.fromSsmParameter(...)`. Fixed the method name.

## Review Notes
- The post describes deploying a single "primary" EC2 instance, but the description mentions a "replica set." A production replica set would need at least three nodes. The code is correct for a single-node deployment; the title/description is slightly aspirational but not technically wrong as a starting point.
- The user data script does not configure the EBS volume mounted at `/dev/sdf` (no mkfs, mount, or fstab entry), nor does it configure mongod to use that volume for data. A production deployment would need additional user data commands to format, mount, and point mongod's `dbPath` to the EBS volume.
- The `Construct` type from the `constructs` package is the conventional first parameter type for CDK v2 stack constructors rather than `cdk.App`, but using `cdk.App` compiles and works for simple single-stack apps.
