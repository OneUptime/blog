# Validation Summary: How to Integrate Binary Authorization with Cloud Build CI/CD Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Binary Authorization
- Google Artifact Registry
- Artifact Analysis / Container Analysis
- Cloud KMS
- Google Kubernetes Engine
- Google Cloud CLI
- Kubernetes

## Sources Consulted
- Google Cloud: Create attestations - https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud: Create a Binary Authorization attestation in a Cloud Build pipeline - https://docs.cloud.google.com/binary-authorization/docs/cloud-build
- Google Cloud SDK: gcloud beta container binauthz attestations sign-and-create - https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Google Cloud SDK: gcloud artifacts docker images describe - https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK: gcloud artifacts vulnerabilities list - https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Cloud SDK: gcloud builds triggers create github - https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK: gcloud builds submit - https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Google Cloud: Default Cloud Build service account - https://docs.cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud: Configure user-specified service accounts - https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud IAM: Binary Authorization roles and permissions - https://docs.cloud.google.com/iam/docs/roles-permissions/binaryauthorization
- Google Cloud IAM: Artifact Analysis roles and permissions - https://cloud.google.com/iam/docs/roles-permissions/containeranalysis
- Google Cloud: Transition from Container Registry - https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Kubernetes Engine: About container image digests - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-container-images

## Issues Found
- The post used the legacy Cloud Build service account address as if it were always the active build identity. Updated the instructions to create and use a dedicated user-specified Cloud Build service account, and added the trigger and manual build flags that use it.
- The IAM setup was incomplete for attestation creation. Added Artifact Analysis occurrence editor, attestor viewer, Artifact Registry writer, Cloud Logging writer, and optional GKE deploy permissions.
- The main pipeline used Container Registry image URLs. Updated the primary examples to Artifact Registry, because Container Registry is shut down for writes and Artifact Registry is the recommended registry.
- The post used `gcloud container binauthz attestations sign-and-create` without the beta command group. Updated the examples to `gcloud beta container binauthz attestations sign-and-create` and added `--validate`.
- The digest lookup for Artifact Registry images used `gcloud container images describe`. Updated Artifact Registry examples to use `gcloud artifacts docker images describe`.
- The vulnerability gate used an undocumented `vulnz_summary.CRITICAL` field and would continue if the scan never completed. Updated it to use `gcloud artifacts vulnerabilities list` and to fail if scan metadata does not reach `FINISHED_SUCCESS`.
- The Cloud Build examples used a user-specified service account without configuring a supported log destination. Added `options.logging: CLOUD_LOGGING_ONLY` and the `roles/logging.logWriter` grant.
- The Artifact Registry API and repository/scanning prerequisites were missing. Added them to the prerequisite section.

## Review Notes
The post is now technically aligned with current Google Cloud documentation. In a real deployment, the Kubernetes deploy step may also require namespace-level Kubernetes RBAC beyond the Google Cloud IAM role, depending on the cluster's authorization configuration.
