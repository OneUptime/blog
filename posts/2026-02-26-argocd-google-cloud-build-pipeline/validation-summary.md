# Validation Summary: How to Create a Complete Google Cloud Build + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Build
- Google Cloud Build triggers
- Artifact Registry and Artifact Analysis
- Google Kubernetes Engine
- Kubernetes Deployments and ServiceAccounts
- Workload Identity Federation for GKE
- Argo CD Applications
- Argo CD Image Updater
- Kustomize
- Terraform Google provider
- Cloud Build notifiers and Pub/Sub

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- gcloud builds triggers create github reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Analysis on-demand scan documentation: https://docs.cloud.google.com/artifact-analysis/docs/scan-go-on-demand
- Cloud Build manual approval gates: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Cloud Build notifications and Pub/Sub topics: https://cloud.google.com/build/docs/subscribe-build-notifications
- Cloud Build notifiers documentation: https://cloud.google.com/build/docs/configuring-notifications/notifiers
- Cloud Build supported builders documentation: https://cloud.google.com/build/docs/cloud-builders
- Terraform `google_cloudbuild_trigger` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudbuild_trigger.html
- GKE Workload Identity Federation setup: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE service accounts overview: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/service-accounts
- Kubernetes readiness probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Cloud Source Repositories support notice: https://cloud.google.com/source-repositories/docs/support

## Issues Found
- The introduction and architecture referenced Cloud Source Repositories as a current default source option. Cloud Source Repositories is unavailable to new customers as of June 17, 2024, so the post now references GitHub and Secure Source Manager instead.
- The infrastructure-as-code trigger example was not valid Terraform. Replaced it with a valid `google_cloudbuild_trigger` HCL resource using the `github`, `push`, `filename`, and `substitutions` fields.
- The GKE Workload Identity examples only annotated Kubernetes ServiceAccounts. Added the required `roles/iam.workloadIdentityUser` IAM bindings for the application and Argo CD Image Updater service accounts when using IAM service account impersonation.
- The staging and production Cloud Build examples called `kustomize` from a Git builder image. Updated those steps to use an Alpine Git image that installs `kustomize` and `openssh-client` before running the GitOps update.
- The production deployment text claimed manual approval through Cloud Deploy, but the example used Cloud Build. Changed the wording to Cloud Build approval gates or manual submission.
- The notification section said Cloud Build automatically publishes to the `cloud-builds` topic. Updated it to show creation of the topic and clarify that Cloud Build publishes to that topic when it exists.
- The cost optimization snippet described `DOCKER_BUILDKIT=1` as Kaniko caching. Corrected the comment to Docker BuildKit.

## Review Notes
- The examples are representative templates and still require project-specific IAM, Secret Manager, repository, and Argo CD project setup.
- The deployment repository update commands may need extra handling in real pipelines when there are no manifest changes to commit.
