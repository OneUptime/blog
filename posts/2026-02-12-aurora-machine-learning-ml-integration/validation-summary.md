# Validation Summary: How to Use Aurora Machine Learning (ML) Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora MySQL
- Amazon Aurora PostgreSQL
- Aurora machine learning
- Amazon SageMaker AI endpoints
- Amazon Comprehend sentiment analysis
- Amazon Bedrock
- AWS IAM
- AWS CLI
- SQL

## Sources Consulted
- Amazon Aurora User Guide: Using Amazon Aurora machine learning: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-ml.html
- Amazon Aurora User Guide: Using Amazon Aurora machine learning with Aurora MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/mysql-ml.html
- Amazon Aurora User Guide: Using Amazon Aurora machine learning with Aurora PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/postgresql-ml.html
- Amazon Aurora User Guide: Supported Regions and DB engines for Aurora machine learning: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Aurora_ML.html
- AWS CLI Command Reference: rds add-role-to-db-cluster: https://docs.aws.amazon.com/cli/latest/reference/rds/add-role-to-db-cluster.html
- AWS CLI Command Reference: rds modify-db-cluster-parameter-group: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster-parameter-group.html
- AWS managed policy reference: ComprehendReadOnly: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/ComprehendReadOnly.html
- Amazon SageMaker AI Developer Guide: AWS managed policies for Amazon SageMaker AI: https://docs.aws.amazon.com/sagemaker/latest/dg/security-iam-awsmanpol.html

## Issues Found
- The post said Aurora can call any SageMaker endpoint. AWS documents Aurora ML SageMaker support for endpoints that read and write CSV with `ContentType` `text/csv`, so the wording was narrowed to CSV-compatible SageMaker endpoints.
- The IAM setup attached `AmazonSageMakerReadOnly` as a SageMaker runtime policy. AWS documents this as read-only access, not endpoint invocation access, so the example now uses a least-privilege inline policy with `sagemaker:InvokeEndpoint`.
- The Aurora PostgreSQL prerequisites did not mention the required `aws_ml` extension. Added the `CREATE EXTENSION IF NOT EXISTS aws_ml CASCADE;` step.
- The Aurora PostgreSQL Comprehend example used a nonexistent `aws_comprehend.detect_sentiment_confidence` function. AWS documents `aws_comprehend.detect_sentiment` as returning both `sentiment` and `confidence`, so the example now selects from the composite result.
- Database user grants were missing. Added Aurora MySQL v3 role grants, Aurora MySQL v2 privilege grants, and a PostgreSQL note to grant `EXECUTE` on the relevant functions.
- The Aurora PostgreSQL SageMaker wrapper omitted the documented `COST 5000` recommendation for batch-mode/parallel query planning. Added it to the function declaration.

## Review Notes
- Aurora ML support varies by engine version and AWS Region. The post gives minimum versions, but readers should still check the current regional engine support matrix before implementing.
- Amazon Bedrock integration is supported in newer Aurora versions, but setup and function syntax differ from SageMaker and Comprehend. The post only mentions Bedrock at a high level, which is acceptable for this guide.
