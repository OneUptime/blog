# Validation Summary: How to Rotate SOPS Age Keys Without Re-Encrypting All Files in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- age
- Flux Kustomization decryption
- Kubernetes Secrets
- kubectl
- GitOps

## Sources Consulted
- SOPS official README, including `updatekeys`, `rotate`, `.sops.yaml`, and age usage: https://github.com/getsops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux CLI `flux get kustomizations` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- age official README for age identity and recipient file behavior: https://github.com/FiloSottile/age

## Issues Found
- The post described full re-encryption as `sops --rotate --in-place`. SOPS documents rotation as the `rotate` command with `-i` for in-place writes, so this was changed to `sops rotate -i`.
- The post stated that `updatekeys` is sufficient whenever an old key holder should no longer have access. SOPS documentation recommends rotating the data key when removing keys if prior access to the data key is a concern. The wording was corrected to distinguish planned recipient replacement from compromised keys or retained old Git revisions, where `sops rotate -i` is needed.
- The gradual rotation section said files would fully migrate to the new key and labelled a grep command as counting files using only the old key. With both recipients configured, edited files retain the old key until a final removal phase. The wording and command comment were corrected.

## Review Notes
The local environment did not have `sops`, `flux`, or `kubectl` installed, so CLI behavior was verified against official documentation rather than local `--help` output. The Flux `Kustomization` decryption fields, age secret key suffix behavior, `kubectl create secret generic --from-file`, and `flux get kustomizations --all-namespaces` usage were consistent with the consulted documentation.
