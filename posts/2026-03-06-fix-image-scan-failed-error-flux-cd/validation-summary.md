# Validation Summary: How to Fix 'image scan failed' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD image automation controllers
- Flux ImageRepository, ImagePolicy, and ImageUpdateAutomation APIs
- Kubernetes kubectl commands and Secrets
- Container registries, including Docker Hub, AWS ECR, Google Artifact Registry, and Azure Container Registry
- Registry authentication, proxy settings, TLS certificates, and tag filtering

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image update automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI reference for `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux cloud provider integration documentation for AWS, Azure, and GCP: https://fluxcd.io/flux/integrations/aws/, https://fluxcd.io/flux/integrations/azure/, https://fluxcd.io/flux/integrations/gcp/

## Issues Found
- The post said Flux CD uses two custom resources for image automation. I clarified that ImageRepository and ImagePolicy cover image scanning and policy selection, while ImageUpdateAutomation is the third resource used to commit selected image updates back to Git.
- The cloud registry examples used `provider: aws`, `provider: gcp`, and `provider: azure` without noting the Workload Identity requirements. I added `serviceAccountName` to the examples and added a note explaining that object-level Workload Identity requires the `ObjectLevelWorkloadIdentity` feature gate, while controller-level identity should omit `serviceAccountName`.
- The Docker Hub diagnostic comment claimed a command checked the remaining rate limit, but that command only checks registry API reachability. I corrected the comment and changed the image to `curlimages/curl` to match the later connectivity example.

## Review Notes
The remaining Flux resource fields, API versions, policy examples, `exclusionList`, `certSecretRef`, proxy environment variables, and `flux reconcile image repository` command match current Flux documentation. The complete automation example is valid, but in a real repository the manifests under the configured update path must also contain Flux image policy markers for `strategy: Setters` to update files.
