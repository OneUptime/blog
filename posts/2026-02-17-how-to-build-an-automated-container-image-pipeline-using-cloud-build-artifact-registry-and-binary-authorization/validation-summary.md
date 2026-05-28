# Validation Summary: How to Build an Automated Container Image Pipeline Using Cloud Build Artifact

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Artifact Registry
- Artifact Analysis and On-Demand Scanning
- Binary Authorization
- Google Kubernetes Engine
- Cloud KMS
- Cloud Logging and Cloud Monitoring

## Sources Consulted
- Google Cloud Artifact Analysis: Use On-Demand Scanning in your Cloud Build pipeline: https://docs.cloud.google.com/artifact-analysis/docs/ods-cloudbuild
- Google Cloud Artifact Analysis: Automatic scanning and vulnerability viewing docs: https://docs.cloud.google.com/artifact-analysis/docs/scan-nodejs-automatically
- Google Cloud SDK reference: `gcloud artifacts docker images scan`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- Google Cloud SDK reference: `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK reference: `gcloud artifacts docker images list-vulnerabilities`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- Binary Authorization: Create attestations: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Binary Authorization: Create attestations in Cloud Build: https://docs.cloud.google.com/binary-authorization/docs/cloud-build
- Binary Authorization: Create attestors using the gcloud CLI: https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- GKE/Binary Authorization policy quickstart and cluster flag examples: https://docs.cloud.google.com/binary-authorization/docs/update-policies
- Cloud Logging log-based alerting policy docs: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Cloud Monitoring `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The API enablement list omitted APIs required by the commands shown. Added `ondemandscanning.googleapis.com` for on-demand scans and `cloudkms.googleapis.com` for the KMS key commands.
- The Cloud Build scan logic used Artifact Registry image metadata fields that do not represent scan completion or vulnerability counts. Replaced it with the documented `gcloud artifacts docker images scan --remote` and `gcloud artifacts docker images list-vulnerabilities` workflow.
- The vulnerability check depended on `jq` and an inaccurate JSON path for `--show-package-vulnerability` output. Replaced it with severity counting from the documented list-vulnerabilities output.
- The attestation command did not explicitly set the attestation project. Added `--project=$PROJECT_ID`.
- The setup steps did not grant the Cloud Build service account the roles needed to scan, push, sign with KMS, read the attestor, and attach/create attestation metadata. Added IAM bindings matching the documented roles.
- The attestor commands used beta variants where stable `gcloud container binauthz attestors` commands are available. Updated the attestor and policy commands to the stable command group.
- The Container Analysis note and attestor examples hard-coded `my-project` while the rest of the pipeline used `$PROJECT_ID`. Updated those setup commands to use `$PROJECT_ID`.
- The Binary Authorization policy YAML omitted the required top-level `name` field. Added `name: projects/my-project/policy`.
- The policy manually allowlisted Google system image patterns even though `globalPolicyEvaluationMode: ENABLE` is the documented mechanism for Google-managed system images. Simplified the allowlist to only the example project-owned system images.
- The log-based alert example used metric-condition flags with a logs filter, which does not create a log-based alerting policy. Replaced it with a documented `conditionMatchedLog` policy JSON and `gcloud monitoring policies create --policy-from-file`.

## Review Notes
The examples still use placeholder project IDs and notification channel names that readers must replace. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud documentation rather than local `gcloud --help` output.
