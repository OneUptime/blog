# Validation Summary: How to Configure FluxInstance with Kustomize Patches

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Flux Operator
- FluxInstance CRD
- Kustomize patches
- JSON Patch
- Kubernetes Deployments

## Sources Consulted
- Flux Operator FluxInstance CRD documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator instance customization guide: https://fluxoperator.dev/docs/instance/customization/
- Flux release and Kubernetes support policy: https://fluxcd.io/flux/releases/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux v2.8.6 generated install manifests: https://github.com/fluxcd/flux2/releases/download/v2.8.6/install.yaml

## Issues Found
- The prerequisite "A Kubernetes cluster (v1.28 or later)" was too broad for current Flux guidance. Flux supports Kubernetes versions supported upstream and does not guarantee compatibility with EOL Kubernetes versions, so this was changed to "A supported Kubernetes cluster."
- The description of `kustomize.patches` implied a patch entry could be either an inline `patch` string or a strategic merge patch. The Flux Operator CRD uses an inline `patch` string, whose content can be either a strategic merge patch or a JSON patch. The wording was corrected.

## Review Notes
The JSON Patch examples were checked against current Flux controller manifests. The referenced arrays and fields such as `args`, `env`, `resources`, `volumes`, and `volumeMounts` are present in the current generated Deployments, so the patch paths shown are valid for the documented controllers.
