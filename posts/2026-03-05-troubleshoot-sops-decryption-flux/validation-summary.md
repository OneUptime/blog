# Validation Summary: How to Troubleshoot SOPS Decryption Failures in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Kubernetes Kustomization custom resources
- Kubernetes Secrets
- SOPS
- age and OpenPGP encryption keys
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- SOPS official documentation: https://github.com/getsops/sops
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post said the decryption key Secret must be in the same namespace as the kustomize-controller. For `spec.decryption.secretRef`, Flux uses a local Secret reference, so the Secret must be in the same namespace as the Kustomization. I updated the namespace mismatch section and checklist accordingly.
- The SOPS metadata inspection command tried to decrypt and extract `["sops"]`, but SOPS extraction applies to the decrypted document tree, not the encrypted metadata block. I replaced it with a direct metadata grep for age or OpenPGP entries.
- The recovery command used `kubectl neat`, which is not part of kubectl. I replaced it with a `kubectl get ... -o json` and `jq` pipeline that removes server-generated metadata before re-encrypting.
- The replacement SOPS recovery command needed an explicit `--filename-override` so `.sops.yaml` creation rules can be selected for the intended encrypted file path. I added that flag.

## Review Notes
The Flux and SOPS examples are otherwise aligned with current Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1`, `spec.decryption.provider: sops`, age key Secret entries ending in `.agekey`, and `flux reconcile kustomization <name>`.
