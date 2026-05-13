# Validation Summary: How to Migrate from Flux Bootstrap to Flux Operator

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux
- Flux Operator
- Flux CLI
- Kubernetes
- Helm
- GitOps

## Sources Consulted
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator bootstrap migration guide: https://fluxoperator.dev/docs/guides/migration/
- FluxInstance API reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator CLI reference: https://fluxoperator.dev/docs/guides/cli/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/

## Issues Found
- The Helm installation instructions used a non-documented chart repository and chart reference. Updated the command to use the official GHCR OCI chart: `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator`.
- The post installed the Flux Operator in `flux-operator-system`, while the official bootstrap migration guide installs it in the same namespace where Flux is deployed. Updated the installation and verification commands to use `flux-system`.
- The Helm values YAML example mixed a Namespace manifest with commented Helm commands and was not an actual Helm values file. Removed it and replaced it with the documented Helm install command.
- The FluxInstance example used the loose version string `"2.x"`. Updated it to the documented version range style `"2.8.x"`.
- The post instructed readers to suspend and then delete the live `flux-system` Kustomization. The official migration flow applies the FluxInstance and lets the operator take ownership of the Flux components, GitRepository, and Kustomization; deleting the live Kustomization would remove the generated sync object and break GitOps reconciliation. Replaced that step with applying and waiting for the FluxInstance, and limited cleanup to removing bootstrap manifests from the Git repository.
- The private registry example omitted `.spec.distribution.variant`, which the FluxInstance API requires when using a third-party registry mirror. Added `variant: "upstream-alpine"`.

## Review Notes
The local environment did not have `flux`, `kubectl`, or `helm` installed, so CLI verification was performed against the official Flux and Flux Operator documentation instead of local `--help` output.
