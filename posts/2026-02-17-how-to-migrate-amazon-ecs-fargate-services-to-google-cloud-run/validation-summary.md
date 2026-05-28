# Validation Summary: How to Migrate Amazon ECS Fargate Services to Google Cloud Run

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon ECR
- AWS CLI
- Google Cloud Run
- Google Artifact Registry
- Google Cloud CLI
- Google Cloud Load Balancing
- Cloud Monitoring
- Cloud Logging

## Sources Consulted
- AWS ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS LogConfiguration API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- Google Cloud CLI `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run YAML reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1
- Google Cloud Run access control with IAM: https://cloud.google.com/run/docs/securing/managing-access
- Google Cloud Run public access documentation: https://cloud.google.com/run/docs/authenticating/public
- Google Cloud Run request timeout documentation: https://cloud.google.com/run/docs/configuring/request-timeout
- Google Artifact Registry Docker push/pull documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Google Artifact Registry repository creation documentation: https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud CLI `gcloud beta run domain-mappings` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/run/domain-mappings
- Google Cloud Load Balancing with serverless NEGs documentation: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud CLI `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The ECS Fargate `awslogs` example only included `awslogs-group`. Added `awslogs-region` and `awslogs-stream-prefix`, which are required options for ECS/Fargate logging with the `awslogs` driver.
- The networking section said Cloud Run services are publicly accessible by default. Updated it to state that Cloud Run services get an HTTPS endpoint, while invocation is controlled by IAM and ingress settings.
- The custom domain example used `gcloud run domain-mappings create`. Updated it to `gcloud beta run domain-mappings create`, which is the documented command for fully managed Cloud Run domain mappings.
- The load balancer comment implied the shown commands fully configured a Global HTTPS Load Balancer. Updated the wording to clarify that the commands start the load balancer setup with a serverless NEG and backend service.
- The Cloud Monitoring alert command used unsupported flags, `--condition-threshold-value` and `--condition-threshold-comparison`. Replaced them with the documented `--duration` and `--if` flags, and changed the description from error rate to 5xx response counts.

## Review Notes
Cloud Run domain mappings are documented as limited availability and preview, and Google recommends a global external Application Load Balancer for production custom-domain setups. The post now uses the correct beta command, but future revisions could mention the production caveat explicitly.
