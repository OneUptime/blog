# Validation Summary: How to Troubleshoot Kustomize Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux kustomize-controller
- Kubernetes
- kubectl
- Kustomize
- SOPS

## Sources Consulted
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux Kustomization documentation, including dependencies and decryption: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux vertical scaling guidance: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Flux kustomize-controller deployment manifest release artifact: https://github.com/fluxcd/kustomize-controller/releases/download/v1.8.5/kustomize-controller.deployment.yaml

## Issues Found
- The post claimed circular Kustomization references can cause an infinite loop and controller crash. Flux documentation states circular dependencies must be avoided because interdependent Kustomizations will never be applied. Updated this to describe failed or blocked reconciliation rather than a pod crash.
- The post claimed SOPS decryption failures may crash the controller during startup. Flux documents SOPS failures as Kustomization reconciliation failures. Updated the language to avoid presenting normal decryption errors as controller crashes.
- The post claimed malformed Kustomize overlays can cause the controller to panic. Invalid overlays normally fail reconciliation/build validation. Updated the language to describe failed reconciliation.
- The concurrency example said to reduce concurrency but added `--concurrent=5`, while Flux documents the default as `4`. Changed the example to `--concurrent=2`.
- The SOPS secret check implied fixed secret names. Updated the text to clarify these are examples and the configured decryption secret should be checked.

## Review Notes
The direct `kubectl patch deployment` command is technically valid for emergency troubleshooting, but Flux-managed controller customization is usually better kept in the Flux bootstrap Kustomize manifests so the change is not lost during reconciliation or upgrades.
