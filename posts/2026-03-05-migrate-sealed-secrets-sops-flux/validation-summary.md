# Validation Summary: How to Migrate from Sealed Secrets to SOPS in Flux

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD kustomize-controller
- SOPS
- age encryption keys
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubectl

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux guide, "Manage Kubernetes secrets with SOPS": https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS official documentation: https://github.com/getsops/sops
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Bitnami Sealed Secrets official documentation: https://github.com/bitnami-labs/sealed-secrets
- age-keygen manual page: https://manpages.debian.org/testing/age/age-keygen.1.en.html

## Issues Found
- The prerequisites listed `kubeseal` as required for extracting current secrets, but the migration command uses `kubectl get secret` to export the unsealed Kubernetes Secret from the cluster. I changed the prerequisite to require `kubectl` access and made `kubectl-neat` optional.
- The `.sops.yaml` example did not constrain encryption to Kubernetes Secret `data` and `stringData` fields. SOPS encrypts all YAML values by default, while Flux documents that `apiVersion`, `kind`, and `metadata` must remain plaintext. I added `encrypted_regex: '^(data|stringData)$'` to the creation rules.
- The incremental migration step suggested applying the SOPS-managed Secret and then removing the old SealedSecret. Sealed Secrets commonly sets the generated Secret as a dependent object of the SealedSecret, so deleting the SealedSecret afterward can delete the generated Secret or cause ownership conflicts. I updated the step to remove the SealedSecret in the same change or before applying the SOPS-managed Secret when the Secret is owned by the SealedSecret.

## Review Notes
- The Flux Kustomization `decryption.provider: sops` and `secretRef.name` fields are current for Flux v2 Kustomization resources.
- The age private key Secret example uses a key ending in `.agekey`, which matches Flux's documented key detection behavior.
- The SOPS encrypted YAML example is consistent once `encrypted_regex` is present in the creation rules.
