# Validation Summary: How to Handle Flux Secrets with SOPS

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Secrets
- Flux CD Kustomization and notification APIs
- SOPS
- age encryption
- GPG / OpenPGP
- Kustomize
- Helm
- Stakater Reloader
- Bash scripting

## Sources Consulted
- Flux CD SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CD Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- SOPS official documentation: https://getsops.io/docs/
- SOPS v3.13.1 CLI help for `rotate`: https://github.com/getsops/sops/releases
- age releases: https://github.com/FiloSottile/age/releases
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/index.html
- Stakater Reloader Helm chart values: https://github.com/stakater/Reloader/blob/master/deployments/kubernetes/chart/reloader/values.yaml

## Issues Found
- The post referred to "Mozilla SOPS" and implied only the cluster can decrypt secrets. Updated wording to the current SOPS project name and clarified that trusted operators with keys can also decrypt.
- The Linux install examples used older SOPS and age versions. Updated the examples to SOPS v3.13.1 and age v1.3.0.
- The first encryption example created `secret.yaml` in the repository root, which would not match the shown `.sops.yaml` `path_regex`. Changed the example to create the Secret under `clusters/production/secrets/` and encrypt it in place.
- The direct `--age` encryption example could be copied after the in-place encryption command and run against an already encrypted file. Converted it to a clearly commented alternative.
- The Flux decryption flow claimed Kubernetes stores the Secret encrypted at rest. Kubernetes Secrets are not encrypted at rest by default, so the diagram note now says to configure Kubernetes encryption at rest separately.
- The GPG setup did not mention that Flux cannot prompt for a passphrase and used a brittle fingerprint extraction command. Added a no-passphrase note and replaced fingerprint extraction with `--with-colons` parsing.
- The automated secret rotation script encrypted from `/tmp/secret.yaml`, so SOPS would not match path-based creation rules. Added `--filename-override` with the target repository path.
- The pod restart checksum example used Helm template syntax while saying Kustomize could compute it automatically. Reworded it as a Helm-specific checksum pattern.
- The SOPS age key rotation script manually decrypted to `/tmp`, combined private key files unnecessarily, and re-encrypted from a path that would not match path rules. Replaced it with `sops rotate --in-place --add-age`, verified against SOPS v3.13.1 CLI help.
- The cluster key update command referenced `keys-new.txt` from the current directory even though the script generated it under `~/.config/sops/age/`. Updated the path.
- The "wrong key" troubleshooting command wrote back to the same file it was reading through a pipeline. Changed it to write a temporary encrypted file and then move it into place.
- The validation script encrypted `/dev/stdin`, which would not match path-based `.sops.yaml` rules. Added `--filename-override` using the production secrets path.
- The pre-commit hook did not handle `.yml` files or filenames safely and its suggested fix did not match the in-place workflow. Updated it to use a Bash `while read` loop over staged YAML/YML files and suggest `sops --encrypt --in-place`.

## Review Notes
The guide is technically relevant and broadly accurate after fixes. Future improvements could include a dedicated note that Kubernetes volume-mounted Secret updates may propagate to mounted files while environment-variable consumption still requires a pod restart, and a more complete two-phase SOPS key rotation example that removes the old recipient after all clusters have the new private key.
