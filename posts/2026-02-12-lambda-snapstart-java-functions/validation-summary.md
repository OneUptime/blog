# Validation Summary: How to Use Lambda SnapStart for Java Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Lambda SnapStart
- Java managed runtimes
- CRaC runtime hooks
- AWS CLI
- AWS SAM
- AWS CloudFormation
- AWS SDK for Java v2
- Spring Boot on AWS Lambda
- aws-serverless-java-container
- Amazon CloudWatch Logs

## Sources Consulted
- AWS Lambda Developer Guide: Improving startup performance with Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS Lambda Developer Guide: Activating and managing Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-activate.html
- AWS Lambda Developer Guide: Lambda SnapStart runtime hooks for Java - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-runtime-hooks-java.html
- AWS Lambda Developer Guide: Handling uniqueness with Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-uniqueness.html
- AWS Lambda Developer Guide: Monitoring for Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-monitoring.html
- AWS Lambda API Reference: SnapStart - https://docs.aws.amazon.com/lambda/latest/api/API_SnapStart.html
- AWS Serverless Java Container GitHub repository - https://github.com/aws/serverless-java-container
- Maven Central: org.crac:crac - https://central.sonatype.com/artifact/org.crac/crac/1.4.0
- Maven Central: com.amazonaws.serverless:aws-serverless-java-container-springboot3 - https://central.sonatype.com/artifact/com.amazonaws.serverless/aws-serverless-java-container-springboot3

## Issues Found
- The post described SnapStart as using CRaC directly. Updated this to distinguish Firecracker microVM snapshots from CRaC runtime hooks, matching AWS documentation.
- The Firecracker snapshot description said Lambda snapshots "memory, CPU state, everything." Updated it to AWS's documented memory and disk state wording.
- The CRaC Maven dependency used older coordinates (`io.github.crac:org-crac:0.1.3`). Updated it to AWS's current documented coordinates (`org.crac:crac:1.4.0`).
- The resource guidance listed DynamoDB clients as needing hooks, while AWS documents that most AWS SDK-established connections resume automatically. Narrowed the example to JDBC-style database connections and clarified AWS SDK v2 behavior.
- The CloudWatch `REPORT` example omitted `Billed Restore Duration`, which AWS documents for SnapStart invocation logs. Added it to the sample output.
- The Spring Boot container dependency used an older version. Updated it to the latest observed Maven Central release for `aws-serverless-java-container-springboot3`.
- The limitations section was outdated: SnapStart now supports Java 11 and later, Python 3.12 and later, and .NET 8 and later. Updated the runtime limitation wording.
- Removed the incorrect x86_64-only limitation and the incorrect "snapshot must be under 250 MB" claim.
- Added current unsupported cases from AWS documentation: Amazon S3 mounted files, OS-only runtimes, and container images.

## Review Notes
- The local environment does not have the AWS CLI installed, so CLI command verification was performed against AWS's official SnapStart activation documentation rather than local `aws --help` output.
- Performance numbers such as "100-200 milliseconds" and "under 200 ms" are plausible examples, but actual restore times vary by application, configuration, and workload.
