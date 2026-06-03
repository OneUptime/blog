# Validation Summary: How to Enable EFS Encryption at Rest and in Transit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic File System (Amazon EFS)
- AWS Key Management Service (AWS KMS)
- AWS CLI
- EFS mount helper / amazon-efs-utils
- TLS encryption in transit
- stunnel
- AWS CloudFormation
- AWS DataSync

## Sources Consulted
- Amazon EFS User Guide: Encrypting data at rest - https://docs.aws.amazon.com/efs/latest/ug/encryption-at-rest.html
- Amazon EFS User Guide: Using AWS KMS keys for Amazon EFS - https://docs.aws.amazon.com/efs/latest/ug/EFSKMS.html
- Amazon EFS User Guide: Encrypting data in transit - https://docs.aws.amazon.com/efs/latest/ug/encryption-in-transit.html
- Amazon EFS User Guide: Using IAM to control access to file systems - https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS User Guide: Creating file system policies - https://docs.aws.amazon.com/efs/latest/ug/create-file-system-policy.html
- AWS CloudFormation Template Reference: AWS::EFS::FileSystem - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-efs-filesystem.html
- Amazon EFS User Guide: Using AWS DataSync to transfer data - https://docs.aws.amazon.com/efs/latest/ug/trnsfr-data-using-datasync.html
- AWS DataSync User Guide: Configuring AWS DataSync transfers with Amazon EFS - https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html

## Issues Found
- The post stated that the EFS mount helper always starts a `stunnel` process for TLS. AWS now documents that amazon-efs-utils 2.0.0 and later use `efs-proxy`, while earlier versions use `stunnel`. Updated the mount-helper explanation, under-the-hood steps, verification command, and performance note to refer to the local proxy and name both implementations.
- The EFS file system policy examples used `"Action": "*"` / `Action: '*'` for enforcing in-transit encryption. EFS file system policies are for NFS client access actions such as `elasticfilesystem:ClientMount`, `ClientWrite`, and `ClientRootAccess`. Updated the examples to use `elasticfilesystem:Client*`, which matches the documented EFS client-action model.

## Review Notes
- The AWS CLI examples use current EFS and KMS parameters, including `--encrypted`, `--kms-key-id`, `put-file-system-policy`, and `describe-file-system-policy`.
- The CloudFormation template uses current `AWS::EFS::FileSystem`, `AWS::EFS::MountTarget`, and `AWS::KMS::Key` properties.
- The manual `stunnel` section remains technically valid as an alternative when not using the EFS mount helper, but AWS recommends the EFS mount helper for normal TLS mounts.
- The internal OneUptime link referenced in the post returned HTTP 200 during validation.
