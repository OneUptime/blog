# Validation Summary: How to Use Pulumi Automation API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi Automation API
- Pulumi TypeScript SDK
- Pulumi Python SDK
- Pulumi AWS provider
- AWS S3
- AWS EC2
- AWS RDS
- AWS ElastiCache
- AWS CloudFront
- AWS Application Load Balancer
- Express.js
- OneUptime monitoring API integration

## Sources Consulted
- Pulumi Automation API concepts: https://www.pulumi.com/docs/iac/concepts/automation-api/
- Pulumi Automation API guide and prerequisites: https://www.pulumi.com/docs/iac/guides/building-extending/automation-api/
- Pulumi Node.js Automation API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/modules/automation.html
- Pulumi StackReference reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/StackReference.html
- Pulumi AWS S3 Bucket reference: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucket/
- Pulumi AWS S3 BucketVersioning reference: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketversioning/
- Pulumi AWS S3 BucketServerSideEncryptionConfiguration reference: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketserversideencryptionconfiguration/
- Pulumi AWS S3 BucketWebsiteConfiguration reference: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketwebsiteconfiguration/
- Pulumi AWS EC2 getAmi reference: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/getami/
- AWS RDS DB subnet group documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- AWS Application Load Balancer subnet documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html

## Issues Found
- The installation section omitted the Pulumi CLI runtime prerequisite. Added a note that the Automation API needs the CLI on `PATH` or installed programmatically.
- S3 examples used deprecated `aws.s3.Bucket` inline properties for versioning, website hosting, and server-side encryption. Replaced them with `BucketVersioning`, `BucketWebsiteConfiguration`, and `BucketServerSideEncryptionConfiguration` resources.
- Several EC2 examples used a hardcoded AMI ID that is region-specific and stale. Replaced it with `aws.ec2.getAmiOutput()` filtered to the latest Amazon Linux 2 AMI.
- The RDS tenant example created a DB subnet group with only one subnet. Added a second private subnet in a different Availability Zone and used both subnet IDs.
- The self-service template descriptions claimed resources that were not created. Updated the descriptions to match the actual resources in the examples.
- The stack reference example imported `StackReference` from the Automation API namespace and constructed it outside the Pulumi program. Updated it to use `pulumi.StackReference` inside the program and to use a fully qualified stack name placeholder.
- The monitoring example used empty ALB subnet/security group placeholders and an HTTPS listener without a certificate. Updated it to use the default VPC/subnets, create an ALB security group, use an HTTP listener, and generate matching `http://` monitor URLs.
- Current Express type definitions inferred route parameters too broadly in two handlers. Added explicit `Request<{ deploymentId: string }>` parameter types.
- Removed unused TypeScript imports and identifiers from the main examples.

## Review Notes
- Verified the primary TypeScript examples with `tsc --noEmit` against `@pulumi/pulumi` 3.246.0 and `@pulumi/aws` 7.32.0.
- Verified the Python example parses successfully and checked the current Pulumi Python symbols used by the S3 examples.
- Some examples are still illustrative and require real AWS credentials, a Pulumi backend/login, and suitable account defaults such as a default VPC for the monitoring example.
