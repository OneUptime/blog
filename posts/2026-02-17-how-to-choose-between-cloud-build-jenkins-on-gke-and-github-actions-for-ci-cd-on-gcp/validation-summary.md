# Validation Summary: How to Choose Between Cloud Build Jenkins on GKE and GitHub Actions for CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Build
- Jenkins on Google Kubernetes Engine
- GitHub Actions
- Google Cloud Run
- Google Kubernetes Engine
- Artifact Registry
- Cloud Source Repositories
- Workload Identity Federation
- Kaniko
- Google Cloud CLI

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build trigger documentation: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build private pools overview: https://cloud.google.com/build/docs/private-pools/private-pools-overview
- Google Cloud Build pricing: https://cloud.google.com/build/pricing
- Cloud Source Repositories support notice: https://cloud.google.com/source-repositories/docs/support
- Artifact Registry transition and gcr.io repository documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- GKE Docker/containerd deprecation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/deprecations/docker-containerd
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Kubernetes plugin step reference: https://www.jenkins.io/doc/pipeline/steps/kubernetes/
- Jenkins Google OAuth Credentials plugin page: https://plugins.jenkins.io/google-oauth-plugin
- Jenkins Google Cloud Storage plugin page: https://plugins.jenkins.io/google-storage-plugin/
- GitHub Actions limits: https://docs.github.com/actions/reference/limits
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub Actions runner pricing: https://docs.github.com/en/billing/reference/actions-runner-pricing
- google-github-actions/auth: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud: https://github.com/google-github-actions/setup-gcloud
- google-github-actions/deploy-cloudrun: https://github.com/google-github-actions/deploy-cloudrun

## Issues Found
- The Cloud Build trigger source comparison listed Cloud Source Repositories without a caveat. Google states Cloud Source Repositories has not been available to new customers since June 17, 2024, so the table now marks it as available for existing customers.
- The Jenkinsfile used a mounted `/var/run/docker.sock` from GKE nodes. Current GKE versions use containerd node images, and Docker-based node images are not supported in GKE 1.24 and later. The example now uses a Python test container and Kaniko to build and push to Artifact Registry without relying on a node Docker daemon.
- The Jenkinsfile pushed to `gcr.io`, which is now tied to the deprecated Container Registry path unless projects have migrated to Artifact Registry-backed gcr.io repositories. The example now uses a regional Artifact Registry Docker repository path.
- The cost comparison used outdated GitHub Actions and Cloud Build pricing. The table now reflects current Cloud Build default worker pricing after the 2,500-minute free tier and current GitHub Actions standard Linux runner pricing after the 2,000-minute free tier.

## Review Notes
- The examples are still illustrative and assume prerequisite IAM, repository, Artifact Registry, Cloud Run, and GKE setup exists.
- The Cloud Build example includes both an explicit Docker push step and the `images` field. This is redundant but valid; it was left unchanged because it is not technically incorrect.
