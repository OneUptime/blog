# Validation Summary: How to Create a Bucket Source in Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux Bucket source API
- Flux Kustomization API
- Kubernetes Secrets
- kubectl
- Object storage services including S3-compatible storage, AWS S3, Azure Blob Storage, and Google Cloud Storage

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux v2.0 Source API reference v1: https://v2-0.docs.fluxcd.io/flux/components/source/api/v1/
- Flux v2.0 Source API reference v1beta2: https://v2-0.docs.fluxcd.io/flux/components/source/api/v1beta2/
- Flux v2.4 GA announcement: https://fluxcd.io/blog/2024/09/flux-v2.4.0/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get sources bucket`: https://fluxcd.io/flux/cmd/flux_get_sources_bucket/
- Flux CLI documentation for `flux suspend source bucket`: https://fluxcd.io/flux/cmd/flux_suspend_source_bucket/
- Flux CLI documentation for `flux resume source bucket`: https://fluxcd.io/flux/cmd/flux_resume_source_bucket/
- Flux CLI documentation for `flux reconcile source bucket`: https://fluxcd.io/flux/cmd/flux_reconcile_source_bucket/

## Issues Found
- The prerequisites said Flux CD v2.0 or later, but the examples use `apiVersion: source.toolkit.fluxcd.io/v1` for Bucket resources. Flux v2.0 documented Bucket under `source.toolkit.fluxcd.io/v1beta2`, while Flux v2.4 marked the Bucket v1 API generally available. Updated the prerequisite to Flux CD v2.4 or later.
- The path configuration section implied that `prefix` works for all Bucket providers. Official Flux documentation states server-side prefix filtering works only with the `generic`, `aws`, and `gcp` providers. Updated the sentence to include that provider limitation.

## Review Notes
The Flux and kubectl CLIs were not installed in the local environment, so command validation was performed against official Flux CLI documentation. The remaining Bucket fields, Secret key names, TLS certificate keys, insecure mode, ignore syntax, Kustomization source reference, and suspend/resume/reconcile commands match the current official Flux documentation.
