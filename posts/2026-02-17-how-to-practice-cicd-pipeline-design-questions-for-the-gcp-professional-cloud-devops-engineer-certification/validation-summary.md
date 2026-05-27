# Validation Summary: How to Practice CI/CD Pipeline Design Questions for the GCP Professional Cloud

## Status
validated

## Post Type
Technical certification study guide

## Technologies Covered
- Google Cloud Build
- Artifact Registry
- Google Cloud Deploy
- Google Kubernetes Engine
- Kubernetes Deployments
- Cloud Run traffic splitting and rollback
- Binary Authorization
- Secret Manager
- Istio / Anthos Service Mesh traffic splitting
- Docker container images

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Cloud Run rollbacks, gradual rollouts, and traffic migration: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- gcloud run services update-traffic reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Cloud Deploy configuration schema reference: https://cloud.google.com/deploy/docs/config-files
- Cloud Deploy rollback documentation: https://cloud.google.com/deploy/docs/roll-back
- gcloud deploy releases create reference: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Cloud Deploy GKE quickstart: https://cloud.google.com/deploy/docs/deploy-app-gke
- Binary Authorization policy YAML reference: https://cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Binary Authorization attestation documentation: https://cloud.google.com/binary-authorization/docs/making-attestations
- gcloud beta container binauthz attestations sign-and-create reference: https://cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- gcloud artifacts repositories update reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- Cloud Build Secret Manager documentation: https://cloud.google.com/build/docs/securing-builds/use-secrets

## Issues Found
- The Kubernetes Deployment rolling update example was missing the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid for `apps/v1` Deployments.
- The Cloud Deploy example in the blue-green section was labeled as a blue-green strategy even though the YAML used the standard strategy with verification. Updated the comment to describe deployment verification accurately.
- The Cloud Run blue-green example deployed a no-traffic revision without a tag, which made the "test it" step incomplete. Added `--tag=green` and changed the traffic switch to `--to-tags=green=100`.
- The Istio canary example referenced subsets without defining them. Added a matching `DestinationRule` with `v1` and `v2` subsets.
- The Binary Authorization attestation example used `gcloud container binauthz attestations sign-and-create`, but the KMS signing command is currently available under `gcloud beta`. Added `beta`, used a full attestor resource name, pushed the image before attesting, and changed the artifact reference to a digest placeholder.
- The Artifact Registry vulnerability scanning command used `--enable-vulnerability-scanning`, but the current documented flag is `--allow-vulnerability-scanning`. Updated the command.
- The compliance scenario implied vulnerability scanning automatically creates the Binary Authorization attestation. Reworded it to say Cloud Build creates an attestation after the vulnerability scan meets policy.
- The Cloud Deploy rollback scenario referred generically to "the rollback command." Updated it to the documented `gcloud deploy targets rollback` command.

## Review Notes
The post is technically relevant and appropriate as a study guide. Several examples remain illustrative and assume surrounding resources exist, such as Skaffold configuration for Cloud Deploy, Binary Authorization attestors and KMS keys, Cloud Build substitutions, and actual Cloud Run revision names.
