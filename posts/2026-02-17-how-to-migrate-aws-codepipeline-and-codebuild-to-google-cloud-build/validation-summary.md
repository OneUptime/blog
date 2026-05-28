# Validation Summary: How to Migrate AWS CodePipeline and CodeBuild to Google Cloud Build

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild
- AWS CLI
- Google Cloud Build
- Google Cloud Build triggers
- Google Secret Manager
- Google Artifact Registry
- Google Cloud Run
- Google Kubernetes Engine
- Google Cloud Deploy

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild environment variables: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
- AWS CLI `codebuild batch-get-projects`: https://docs.aws.amazon.com/cli/latest/reference/codebuild/batch-get-projects.html
- AWS CLI `codepipeline get-pipeline`: https://docs.aws.amazon.com/cli/latest/reference/codepipeline/get-pipeline.html
- Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build Secret Manager integration: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud SDK `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Cloud Build deployment to Cloud Run: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Cloud Build deployment to GKE: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Cloud Build approvals: https://cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Cloud Deploy pipeline and target creation: https://docs.cloud.google.com/deploy/docs/create-pipeline-targets
- Cloud Build pricing: https://cloud.google.com/build/pricing

## Issues Found
- Corrected the Cloud Build parallelism field name from `wait_for` to `waitFor`, matching the build config schema and the YAML example.
- Corrected the Secret Manager example. Cloud Build `secretEnv` exposes secrets as environment variables, not mounted files, so the command now reads `$$DATABASE_URL`.
- Corrected the environment-variable mapping table for repository URL, webhook trigger, and source version values because those CodeBuild variables do not map one-to-one to `$REPO_NAME` or `$TRIGGER_NAME`.
- Updated the Cloud Run deployment builder to the official `gcr.io/google.com/cloudsdktool/cloud-sdk` image with `entrypoint: 'gcloud'`.
- Updated the approval gate section. Cloud Build supports trigger approvals with `--require-approval`, and Cloud Deploy supports target approvals with `requireApproval: true`.
- Updated the Cloud Build free-tier pricing statement from the outdated 120 free build-minutes per day to the current 2,500 free build-minutes per month for the `e2-standard-2` default-pool machine type.
- Updated the summary so it no longer says manual approval gates always require Cloud Deploy or a custom solution.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI syntax was verified against the official Google Cloud SDK reference rather than local `--help` output.
- Cloud Source Repositories is no longer available to new customers as of June 17, 2024, but the post only mentions it as an example source integration, so no change was required.
