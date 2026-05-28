# Validation Summary: Use End-to-End Supply Chain Security with Google Cloud Software Delivery Shield

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Software Delivery Shield / software supply chain security
- Cloud Build
- Artifact Registry and Artifact Analysis
- Binary Authorization for GKE
- Cloud KMS
- SLSA framework
- Google Cloud CLI

## Sources Consulted
- Google Cloud Software supply chain security overview: https://docs.cloud.google.com/software-supply-chain-security/docs/overview
- Google Cloud Cloud Build provenance documentation: https://cloud.google.com/build/docs/securing-builds/generate-validate-build-provenance
- Google Cloud Artifact Analysis scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/get-started-scanning
- Google Cloud CLI reference for `gcloud artifacts docker images scan`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- Google Cloud CLI reference for `gcloud artifacts vulnerabilities list`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Cloud Binary Authorization attestor documentation: https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Google Cloud Binary Authorization attestation documentation: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Source Repositories release notes: https://docs.cloud.google.com/source-repositories/docs/release-notes
- Google Cloud CLI reference for `gcloud source repos update`: https://cloud.google.com/sdk/gcloud/reference/source/repos/update
- SLSA v1.2 / v1.0 Build track documentation: https://slsa.dev/spec/v1.2/build-requirements and https://slsa.dev/spec/v1.0/levels

## Issues Found
- The SLSA section described the older pre-1.0 four-level model as current. Updated it to the current SLSA Build track terminology with levels 0 through 3.
- The source-code section recommended Cloud Source Repositories and showed invalid `gcloud source repos update` branch-protection and signed-commit flags. Updated the recommendation to Secure Source Manager or connected GitHub/GitLab repositories, noted the Cloud Source Repositories new-customer restriction, and removed the invalid command.
- The Cloud Build example included an explicit `docker push` step. Google Cloud documentation states Cloud Build cannot generate provenance if the image is pushed using an explicit `docker push` step, so the example now relies on the `images` field to store the image in Artifact Registry.
- The vulnerability result command used `gcloud artifacts docker images list-vulnerabilities` directly on an image URI, but that command expects an On-Demand Scanning scan resource. Replaced it with `gcloud artifacts vulnerabilities list` for Artifact Analysis vulnerability occurrences on an image digest.
- The Binary Authorization attestor setup omitted the required Artifact Analysis note and did not mention note IAM needed for policy evaluation. Added a note creation example and IAM guidance before creating the attestor.
- The Binary Authorization policy omitted the required `name` field, used allowlist patterns that would bypass attestation for the application images, and used a regional cluster selector while the cluster command used a zonal cluster. Added `name`, enabled global policy evaluation for Google-managed system images, removed the application allowlist, and corrected the cluster selector to `us-central1-a.production-cluster`.
- The attestation automation sample constructed a Python object but did not create an Artifact Analysis occurrence or Binary Authorization attestation. Replaced it with the supported `gcloud beta container binauthz attestations sign-and-create` workflow using Cloud KMS.
- The monitoring example used a non-existent `metadata.vulnerabilities` output field for `gcloud artifacts docker images list`. Updated it to use `--show-occurrences` with a vulnerability occurrence filter.
- The final workflow summary said Cloud Build scans the image, but the corrected flow uses Artifact Analysis vulnerability scanning after the image is pushed. Updated the wording.

## Review Notes
The local environment did not have the `gcloud` CLI installed, so command validation was performed against official Google Cloud CLI and product documentation rather than local `--help` output. The post is now technically valid as a high-level implementation guide; production deployments should still scope IAM grants to the relevant deployer, attestor, attestation, and key projects.
