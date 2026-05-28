# Validation Summary: How to Migrate AWS Secrets Manager Secrets to Google Secret Manager

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Secrets Manager
- Google Secret Manager
- AWS CLI
- Google Cloud CLI
- Python with boto3 and google-cloud-secret-manager
- Node.js with @aws-sdk/client-secrets-manager and @google-cloud/secret-manager
- Google Cloud IAM
- Google Cloud Pub/Sub

## Sources Consulted
- AWS Secrets Manager GetSecretValue API Reference: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
- AWS Secrets Manager rotation by Lambda function: https://docs.aws.amazon.com/en_us/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- AWS Secrets Manager FAQs: https://aws.amazon.com/secrets-manager/faqs
- Google Secret Manager quotas and limits: https://docs.cloud.google.com/secret-manager/quotas
- Google Secret Manager create a secret documentation: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Secret Manager access secret version documentation and samples: https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Google Secret Manager rotation schedules: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Secret Manager pricing: https://cloud.google.com/secret-manager/pricing
- gcloud secrets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- gcloud secrets update reference: https://cloud.google.com/sdk/gcloud/reference/secrets/update
- gcloud secrets versions add reference: https://cloud.google.com/sdk/gcloud/reference/secrets/versions/add
- gcloud scheduler jobs create http reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The service comparison described Google Secret Manager rotation as custom rotation via Cloud Functions. Updated it to reflect the current Secret Manager rotation model: rotation schedules send Pub/Sub notifications, which custom handlers such as Cloud Functions or Cloud Run can process.
- The service comparison listed Google Secret Manager encryption simply as Cloud KMS. Updated it to state that Secret Manager uses Google-managed encryption by default and supports optional Cloud KMS customer-managed encryption keys.
- The bulk export Python example claimed to write an encrypted file but wrote plaintext JSON. Updated the surrounding text and comments so the file is accurately described as a temporary JSON file that should be encrypted and deleted after migration.
- The bulk export Python example did not preserve binary secrets. Updated it to detect SecretBinary values and store them as base64 text in the JSON export.
- The direct AWS-to-GCP migration Python example did not migrate binary secrets correctly. Updated it to pass SecretBinary payload bytes through to Google Secret Manager.
- A gcloud example was labeled as creating a secret with a description, but the command did not set a description and gcloud secrets create does not use a description flag for that example. Updated the comment to say it creates a secret without an initial version.
- The rotation example used Cloud Scheduler with a `--body` flag, but the current gcloud scheduler command uses `--message-body`. Replaced the example with the native Secret Manager rotation schedule command using `--next-rotation-time`, `--rotation-period`, and `--add-topics`.

## Review Notes
The examples are technically correct as illustrative migration snippets, but production migrations should still add collision handling for AWS names that normalize to the same Google Secret Manager ID, retry and rate-limit handling, and explicit rollback validation before AWS secret deletion.
