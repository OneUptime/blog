# Validation Summary: How to Configure Flux CD with Notation for Image Signing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller, kustomize-controller, image-reflector-controller, and image-automation-controller
- Flux `OCIRepository`, `Kustomization`, `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation`
- Flux notification-controller `Alert` and `Provider`
- Notation CLI and Notary Project trust policies
- Azure Key Vault Notation plugin
- OCI registries and OCI artifacts
- Kubernetes Secrets
- GitHub Actions

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux `flux push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux source-controller implementation for Notation Secret handling: https://github.com/fluxcd/source-controller
- Notary Project trust store and trust policy specification: https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md
- Notation GitHub Actions documentation: https://github.com/notaryproject/notation-action
- Azure Key Vault plugin for Notation documentation: https://github.com/Azure/notation-azure-kv

## Issues Found
- The post claimed Flux can enforce Notation signatures for workload container images through `ImageRepository` and `ImagePolicy`. Current Flux Notation verification is supported for OCI source artifacts such as `OCIRepository` and OCI Helm chart artifacts, not for image-reflector tag scanning. I rewrote the Flux verification examples around `OCIRepository.spec.verify` and added a caveat for admission-time workload image enforcement.
- The `ImagePolicy.spec.verification`, `ImageRepository.spec.verify`, and `certRef` examples used unsupported fields. I replaced them with a supported `OCIRepository` plus `verify.provider: notation` and `verify.secretRef`.
- The Notation trust policy and certificate were split across separate Secrets. Flux expects the referenced Notation Secret to contain `trustpolicy.json` and certificate keys ending in `.pem` or `.crt`, so I combined them into one `notation-config` Secret.
- The trust policy scope targeted `myregistry.azurecr.io/myapp` while the Flux source example used `myapp-manifests`. I updated the scope to match the signed OCI artifact repository.
- The multiple-registry trust policy used wildcard repository scopes such as `prodregistry.azurecr.io/*`. The Notary Project trust policy spec permits exact repository scopes or the single global scope `*`, so I changed those examples to exact repository scopes.
- The notification examples used `notification.toolkit.fluxcd.io/v1` and tried to filter by `eventMetadata.reason`. Current Flux Alert examples use `v1beta3`, and filtering by message should use `inclusionList`, so I updated the alert configuration.
- The ImageUpdateAutomation commit template used removed `.Updated.Images` data and an invalid `.AutomatedResource` field. I updated it to use `.AutomationObject` and `.Changed.FileChanges`.
- The CI example installed an outdated Notation binary and used an outdated Azure Key Vault plugin install command. I updated the Notation version, Azure plugin version, plugin checksum, and added missing Flux CLI and Notation configuration steps.
- The verification and troubleshooting commands checked `ImageRepository` resources and image-reflector logs. I updated them to check `OCIRepository` status, source-controller logs, and the combined Notation Secret.

## Review Notes
Flux image automation remains useful for updating image tags in Git, but it does not prove that the selected workload image tag is signed. A complete production design should pair Flux OCI source verification with an admission controller or policy engine for enforcing Notation signatures on Pods.
