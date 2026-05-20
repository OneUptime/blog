# Validation Summary: How to Manage Secrets with ArgoCD and SOPS

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- SOPS
- age
- Argo CD
- Kubernetes Secrets
- Kustomize
- KSOPS
- Helm
- helm-secrets
- AWS KMS
- Google Cloud KMS
- Azure Key Vault

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS v3.13.1 release notes and installation instructions: https://github.com/getsops/sops/releases/tag/v3.13.1
- KSOPS official README and Argo CD integration notes: https://github.com/viaduct-ai/kustomize-sops
- helm-secrets official Argo CD integration wiki: https://github.com/jkroepke/helm-secrets/wiki/ArgoCD-Integration
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- AWS CLI KMS list-keys command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/list-keys.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post described SOPS as "by Mozilla." Updated it to note that SOPS was originally created at Mozilla and is now a CNCF Sandbox project.
- The SOPS version and Linux install example were pinned to 3.9.0. Updated them to the current stable v3.13.1 and aligned the chmod step with the official release instructions.
- The Kubernetes Secret encryption example implied only `data` and `stringData` values are encrypted, but SOPS encrypts all YAML values by default. Added `encrypted_regex: "^(data|stringData)$"` to the Kubernetes Secret creation rules and noted why.
- The encrypt/decrypt examples used `secret.yaml` at the repository root, which would not match the shown `.sops.yaml` path rules. Updated the paths to `overlays/production/secret.yaml` and `overlays/production/secret.enc.yaml`.
- The KSOPS Argo CD integration omitted the required Kustomize build options for exec plugins and used an older install pattern. Added `kustomize.buildOptions: "--enable-alpha-plugins --enable-exec"` and updated the repo-server patch to the current KSOPS install command and image version shown by the KSOPS docs.
- The KSOPS repo-server patch copied Kustomize but did not mount it into the repo-server container. Added the `/usr/local/bin/kustomize` volume mount.
- The Helm Secrets section showed an Application value file reference but omitted the required repo-server/plugin prerequisite and Argo CD allowed value file schemes. Added the `helm.valuesFileSchemes` ConfigMap snippet and prerequisite sentence.

## Review Notes
The remaining cloud KMS commands and SOPS/age key handling examples are technically plausible, but production deployments should pin and verify downloaded binaries, provide cloud credentials through the repo-server environment, and restrict Argo CD plugin usage to trusted repositories.
