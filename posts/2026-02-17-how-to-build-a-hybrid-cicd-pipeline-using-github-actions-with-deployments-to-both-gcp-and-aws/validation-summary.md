# Validation Summary: How to Build a Hybrid CI/CD Pipeline Using GitHub Actions with Deployments to

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions
- GitHub Actions OIDC
- Google Cloud Workload Identity Federation
- Google Cloud Run
- Google Artifact Registry
- AWS IAM OIDC providers and roles
- Amazon ECR
- Amazon ECS
- Docker

## Sources Consulted
- Google Cloud IAM documentation for Workload Identity Federation with deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- google-github-actions/auth documentation: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud documentation: https://github.com/google-github-actions/setup-gcloud
- Google Cloud Run IAM roles documentation: https://docs.cloud.google.com/run/docs/reference/iam/roles
- Google Artifact Registry repository creation documentation: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud SDK gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- AWS CLI create-open-id-connect-provider reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- aws-actions/amazon-ecr-login documentation: https://github.com/aws-actions/amazon-ecr-login
- AWS CLI Amazon ECS describe-task-definition reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-task-definition.html
- AWS CLI Amazon ECS register-task-definition reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
- AWS CLI Amazon ECS update-service reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI Amazon ECR create-repository reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- GitHub Actions variables documentation: https://docs.github.com/en/actions/learn-github-actions/variables

## Issues Found
- The architecture diagram and description claimed the workflow updated a traffic split, but the shown workflow only performs a post-deploy notification. Updated the diagram and text to match the implementation.
- The post described both clouds as using workload identity federation. Adjusted the wording to the more accurate generic term OIDC-based federation, since Workload Identity Federation is the Google Cloud product name while AWS uses IAM OIDC/web identity federation.
- The GCP workload identity provider did not include an attribute condition. Added `attribute.repository_owner` mapping and an `--attribute-condition` to scope admission to the intended GitHub organization, matching Google guidance.
- The GCP setup granted Cloud Run Admin and Artifact Registry Writer but omitted repository creation and the service account impersonation permission commonly required for Cloud Run deployments. Added Artifact Registry repository creation and an IAM Service Account User binding for the runtime service account.
- The AWS OIDC provider command pinned an old GitHub certificate thumbprint. Removed `--thumbprint-list` because AWS now treats the thumbprint list as optional and retrieves the top intermediate CA thumbprint if omitted.
- The AWS setup pushed to an ECR repository that was never created. Added an `aws ecr create-repository` command.
- The workflow used older major versions of Google and AWS authentication actions. Updated `google-github-actions/auth` to `v3`, `google-github-actions/setup-gcloud` to `v3`, and `aws-actions/configure-aws-credentials` to `v6`.
- The ECS deployment reused the full `describe-task-definition` response as `register-task-definition` input without removing response-only fields. Updated the `jq` expression to delete response-only metadata before registration.
- The ECS deployment registered a new task definition but updated the service with only the family name. Captured the registered task definition ARN and passed it to `aws ecs update-service`.
- The AWS rollback snippet read `services[0].taskDefinition`, which can refer to the current primary task definition instead of the previous active deployment. Updated it to use the active deployment task definition when available.

## Review Notes
The examples still use placeholder project IDs, account IDs, repositories, and service names. The workflow also assumes existing ECS cluster/service/task-definition setup and an application `/health` endpoint.
