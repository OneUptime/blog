# Validation Summary: How to Configure AWS SDK for Java with Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS SDK for Java v2
- Java
- AWS credential provider chain
- AWS shared credentials and config files
- AWS STS AssumeRole
- IAM roles
- EC2 instance profiles
- ECS task roles
- Spring Boot dependency injection

## Sources Consulted
- AWS SDK for Java 2.x Developer Guide: Default credentials provider chain: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html
- AWS SDK for Java 2.x Developer Guide: Using credentials providers: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials.html
- AWS SDK for Java 2.x Developer Guide: Specify a specific credentials provider: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-providers.html
- AWS SDK for Java 2.x Developer Guide: Setting the AWS Region: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/region-selection.html
- AWS SDK for Java API Reference: StsAssumeRoleCredentialsProvider: https://docs.aws.amazon.com/java/api/latest/software/amazon/awssdk/services/sts/auth/StsAssumeRoleCredentialsProvider.html
- AWS STS API Reference: AssumeRole: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html

## Issues Found
- The default credential provider chain listed the shared credentials file and shared config file as two separate chain entries. AWS SDK for Java v2 documents these as a single `ProfileCredentialsProvider` step that reads both shared files. Updated the list accordingly and renumbered ECS and EC2 entries.
- The default chain list omitted optional temporary credential fields for system properties and environment variables. Added `aws.sessionToken` and `AWS_SESSION_TOKEN` to align with AWS documentation.
- Several Java snippets used `Region.US_EAST_1` or `S3Client` without importing the corresponding SDK classes in that snippet. Added the missing `Region` and `S3Client` imports so the examples are technically complete.

## Review Notes
- The STS role-assumption examples use current AWS SDK for Java v2 APIs. `StsAssumeRoleCredentialsProvider` is still current and refreshes temporary credentials.
- Role chaining is valid, but AWS STS limits chained role sessions to a maximum of one hour. The post does not set a longer duration in the chaining example, so no correction was required.
- The internal links point to existing local posts.
