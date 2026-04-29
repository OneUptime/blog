# Validation Summary: How to Deploy ML Pipeline Infrastructure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS S3 (buckets, versioning, lifecycle configuration)
- AWS Step Functions (Amazon States Language, optimized service integrations)
- AWS Lambda
- AWS Glue (startJobRun.sync integration)
- AWS SageMaker (createTrainingJob.sync integration)
- AWS SNS
- AWS EventBridge (CloudWatch Events Rules / Targets)
- AWS ECS Fargate (task definitions)
- AWS RDS (PostgreSQL)
- AWS IAM
- MLflow (self-hosted tracking server)

## Sources Consulted
- AWS Provider docs — `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- AWS Provider docs — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS Provider docs — `aws_sfn_state_machine`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine
- AWS Step Functions — Passing parameters to a service API: https://docs.aws.amazon.com/step-functions/latest/dg/connect-parameters.html
- AWS Step Functions — Optimized integrations (SageMaker, Glue, SNS): https://docs.aws.amazon.com/step-functions/latest/dg/connect-supported-services.html
- MLflow Docker docs: https://mlflow.org/docs/latest/ml/docker/
- AWS EventBridge cron expressions: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html

## Issues Found

1. **Step Functions JSONPath substitution missing `.$` suffix**
   - **Where:** `TrainModel` state, `Parameters` block.
   - **Original:** `TrainingJobName = "$.trainingJobName"`
   - **Problem:** Without the `.$` suffix on the parameter name, ASL passes the literal string `"$.trainingJobName"` to the SageMaker `CreateTrainingJob` API rather than resolving the JSONPath against the state input. This produces an invalid SageMaker training job name (must match `^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$`).
   - **Fix:** Changed to `"TrainingJobName.$" = "$.trainingJobName"`, per the AWS Step Functions docs ("To specify that a parameter use a path, end the parameter name with `.$`").

2. **Deprecated `is_enabled` on `aws_cloudwatch_event_rule`**
   - **Where:** `aws_cloudwatch_event_rule.ml_pipeline`.
   - **Original:** `is_enabled = var.environment == "production"`
   - **Problem:** The `is_enabled` attribute has been deprecated since AWS provider v5.26.0 (Nov 2023) in favor of `state`. The provider emits a deprecation warning and the two attributes conflict.
   - **Fix:** Changed to `state = var.environment == "production" ? "ENABLED" : "DISABLED"`. Valid values for `state` per the docs: `ENABLED`, `DISABLED`, `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.

## Review Notes
- The MLflow `--backend-store-uri postgresql://${aws_db_instance.mlflow.endpoint}/${var.db_name}` URI omits credentials. `aws_db_instance.endpoint` returns `host:port`, so the resulting URI is syntactically valid SQLAlchemy/psycopg2 form but would not authenticate in practice. Real deployments should inject the username/password (typically via Secrets Manager → ECS task secret env vars) or use the SQLAlchemy URI form `postgresql://user:pass@host:port/db`. This is an example-level simplification rather than a syntactic error, so left as-is.
- The MLflow image `ghcr.io/mlflow/mlflow:latest` is the correct registry path per the official MLflow Docker docs. Pulling from GHCR may require `docker login ghcr.io`; in production, pinning to a specific tag (e.g. `v2.x`) rather than `latest` is preferable but is a stylistic call.
- Pipeline architecture, S3 bucket / versioning / lifecycle resources, ECS Fargate task definition fields (`requires_compatibilities`, `network_mode = "awsvpc"`, cpu/memory pairs), and the optimized service-integration ARNs (`arn:aws:states:::glue:startJobRun.sync`, `arn:aws:states:::sagemaker:createTrainingJob.sync`, `arn:aws:states:::sns:publish`) are all correct.
- The EventBridge cron expression `cron(0 2 * * ? *)` follows the AWS 6-field cron syntax correctly (one of day-of-month or day-of-week must be `?`).
- `States.TaskFailed` and `States.ALL` are valid built-in error names in ASL.
- The Choice state's `Variable = "$.accuracy"` is correct — `Variable` always takes a JSONPath directly and does not need the `.$` suffix.
