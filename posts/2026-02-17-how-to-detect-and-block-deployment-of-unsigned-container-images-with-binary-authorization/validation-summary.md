# Validation Summary: How to Detect and Block Deployment of Unsigned Container Images

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Binary Authorization
- Google Kubernetes Engine (GKE)
- Cloud KMS asymmetric signing keys
- Container Analysis notes and attestations
- Artifact Registry container image digests
- Cloud Build
- Cloud Logging and Cloud Monitoring
- Kubernetes Deployments and Pods
- Python Google Cloud Logging client

## Sources Consulted
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization policy configuration with gcloud: https://docs.cloud.google.com/binary-authorization/docs/configuring-policy-cli
- Google Cloud Binary Authorization example policies: https://docs.cloud.google.com/binary-authorization/docs/example-policies
- Google Cloud Binary Authorization attestation creation: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization breakglass for GKE: https://docs.cloud.google.com/binary-authorization/docs/using-breakglass
- Google Cloud Binary Authorization GKE audit logs: https://cloud.google.com/binary-authorization/docs/viewing-audit-logs
- Google Cloud SDK reference for `gcloud container binauthz attestations create`: https://cloud.google.com/sdk/gcloud/reference/container/binauthz/attestations/create
- Google Cloud SDK reference for `gcloud beta container binauthz attestations sign-and-create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Google Cloud SDK reference for `gcloud container binauthz attestors create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestors/create
- Google Cloud SDK reference for `gcloud container binauthz attestors public-keys add`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestors/public-keys/add
- Google Cloud SDK reference for `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference for `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The Cloud Build signing example used `gcloud container binauthz attestations sign-and-create` without a release track. The KMS-backed `sign-and-create` command is available under beta/alpha, so the command was changed to `gcloud beta container binauthz attestations sign-and-create`.
- The break-glass example used the legacy `alpha.image-policy.k8s.io/break-glass` annotation on the Deployment object. Current GKE Binary Authorization documentation recommends the Pod label `image-policy.k8s.io/break-glass: "true"`, so the example now places that label on the Deployment's Pod template.
- The break-glass monitoring filter looked for the legacy annotation under `protoPayload.request.metadata.annotations`, which is not the documented audit-log query. It now filters GKE audit logs for Pod create/update events containing `image-policy.k8s.io/break-glass`.
- The blocked-deployment log metric used a brittle text search for `denied by attestor`. It was replaced with the documented GKE Binary Authorization audit-log filter using Pod create/update events, failure status, and `VIOLATES_POLICY` or `Forbidden` response reasons.
- The alert policy command used outdated Monitoring CLI flags (`--condition-threshold-value` and `--condition-threshold-duration`). It now uses current `gcloud monitoring policies create` flags: `--if='> 0'` and `--duration=0s`.
- The dry-run rollout section incorrectly changed the GKE cluster Binary Authorization evaluation mode. Dry run is configured through the Binary Authorization policy `enforcementMode: DRYRUN_AUDIT_LOG_ONLY`, so the example now exports/imports the policy and queries the documented dry-run audit-log label.

## Review Notes
The main setup flow is technically valid for a single-project Binary Authorization setup using Artifact Registry, Cloud KMS, attestors, and a project singleton policy. The post intentionally uses placeholders such as `YOUR_PROJECT` and helper functions such as `_extract_image`; those should be implemented in a production monitoring script.
