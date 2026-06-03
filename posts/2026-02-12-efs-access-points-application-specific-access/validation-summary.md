# Validation Summary: How to Set Up EFS Access Points for Application-Specific Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EFS
- EFS access points
- AWS CLI
- IAM and EFS file system policies
- Amazon ECS Fargate EFS volumes
- AWS Lambda EFS file system configuration
- Terraform AWS provider

## Sources Consulted
- Amazon EFS User Guide - Creating access points: https://docs.aws.amazon.com/efs/latest/ug/create-access-point.html
- Amazon EFS API Reference - CreateAccessPoint: https://docs.aws.amazon.com/efs/latest/ug/API_CreateAccessPoint.html
- Amazon EFS User Guide - Enforcing a root directory with an access point: https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html
- Amazon EFS User Guide - Mounting with EFS access points: https://docs.aws.amazon.com/efs/latest/ug/mounting-access-points.html
- Amazon EFS User Guide - Using access points in IAM policies: https://docs.aws.amazon.com/efs/latest/ug/access-points-iam-policy.html
- Amazon EFS User Guide - Using IAM to control access to file systems: https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticfilesystem.html
- Amazon ECS Developer Guide - Specify an Amazon EFS file system in an Amazon ECS task definition: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- AWS Lambda Developer Guide - Configuring Amazon EFS file system access: https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html
- AWS IAM User Guide - Condition operators and Null checks: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- Terraform Registry - aws_efs_access_point: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point

## Issues Found
- Several example EFS file system IDs and access point IDs were invalid placeholders, including non-hex characters or too-short IDs. Updated them to valid-looking `fs-` and `fsap-` identifiers that match current EFS API patterns.
- The file system policy used `StringEquals` with an empty `elasticfilesystem:AccessPointArn` value to deny mounts without an access point. Because IAM string conditions do not match when a key is absent, changed this to a `Null` condition on `elasticfilesystem:AccessPointArn`.
- The explanation after the file system policy said the policy blocks attempts that lack both an access point and TLS. Updated it to clarify that either missing an access point or missing TLS is denied.
- The shared-data CLI example labelled the data processor access point as read-only while the shared directory permissions grant group write. Updated the comment to say it accesses shared data.
- The Terraform shared-data example used one shared access point, which conflicts with the post's "one access point per application" guidance and loses application-specific POSIX identity. Split it into separate shared-data access points for the web app and data processor, both using secondary group ID `2000`.

## Review Notes
The post is technically sound after the fixes. Future improvements could include explicitly noting that IAM authorization with EC2 mounts requires the EFS mount helper and the `iam` mount option when identity-based IAM policies are intended for the client.
