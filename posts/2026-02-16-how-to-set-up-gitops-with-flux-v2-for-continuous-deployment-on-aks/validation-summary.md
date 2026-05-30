# Validation Summary: How to Set Up GitOps with Flux v2 for Continuous Deployment on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes
- Flux v2
- GitOps
- Kustomize Controller
- Helm Controller and HelmRelease
- Image Reflector Controller and Image Automation Controller
- Azure Container Registry (ACR)
- Mozilla SOPS
- Azure Key Vault
- GitHub

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- SOPS documentation: https://sops.pages.dev/
- AKS supported Kubernetes versions documentation: https://learn.microsoft.com/azure/aks/supported-kubernetes-versions

## Issues Found
- The prerequisite listed Kubernetes 1.24+ for AKS. Kubernetes 1.24 is no longer a supported AKS version, so this was changed to require a currently supported AKS Kubernetes version.
- The Flux installation URL used the older docs path. It was updated to the current Flux installation documentation URL.
- The GitHub bootstrap command used `--owner=my-org` together with `--personal`. Flux documents `--personal` for user-owned repositories, not organization-owned repositories, so the flag was removed from the organization example.
- The HelmRelease example placed the HelmRelease in the `ingress-nginx` namespace without showing how that namespace would exist. The example now keeps the HelmRelease in `flux-system`, sets `targetNamespace: ingress-nginx`, and enables `install.createNamespace: true`.
- The image automation bootstrap command did not grant Flux write access to the Git repository. Added `--read-write-key`, which is required for deploy-key-based GitHub image automation commits.
- The image automation section described Flux committing updates, but only defined ImageRepository and ImagePolicy resources. Added an ImageUpdateAutomation resource, which is the Flux API that writes image policy updates back to Git.
- The SOPS encryption command encrypted the whole Kubernetes Secret manifest. Flux and SOPS require Kubernetes `apiVersion`, `kind`, and `metadata` to remain unencrypted, so `--encrypted-regex '^(data|stringData)$'` was added.
- The SOPS decryption example referenced a `sops-azure` secret without explaining that it must exist or be replaced by Workload Identity. Added a short clarification.

## Review Notes
- The Flux API versions used in the post (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `image.toolkit.fluxcd.io/v1`) are current.
- The Flux CLI commands reviewed are current, including `flux check --pre`, `flux get all`, `flux get kustomizations`, `flux get helmreleases --all-namespaces`, `flux events`, and `flux reconcile kustomization apps --with-source`.
- The ingress-nginx chart version constraint shown is older but still syntactically valid as a Helm semver constraint. Future maintenance could update it to a newer tested chart version.
