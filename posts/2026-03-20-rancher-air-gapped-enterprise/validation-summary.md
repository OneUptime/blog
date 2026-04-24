# Validation Summary: How to Configure Rancher for Air-Gapped Enterprise Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Helm
- Harbor / OCI registries
- Fleet
- Kubewarden

## Sources Consulted
- Rancher air-gapped image publishing: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher documentation versions / archived version references: https://ranchermanager.docs.rancher.com/versions
- Rancher air-gapped install reference: https://ranchermanager.docs.rancher.com/v2.9/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher backup operator version mapping: https://github.com/rancher/backup-restore-operator
- Rancher Helm chart index: https://releases.rancher.com/server-charts/stable/index.yaml
- Rancher charts index: https://charts.rancher.io/index.yaml
- Rancher v2.8.3 image load script: https://github.com/rancher/rancher/releases/download/v2.8.3/rancher-load-images.sh
- RKE2 air-gap installation: https://docs.rke2.io/install/airgap
- RKE2 private registry configuration: https://docs.rke2.io/install/private_registry
- RKE2 installation methods and install-script variables: https://docs.rke2.io/install/methods and https://docs.rke2.io/install/configuration
- RKE2 install script: https://get.rke2.io
- Helm OCI registries: https://helm.sh/docs/v3/topics/registries/
- Helm registry login command reference: https://helm.sh/docs/helm/helm_registry_login/
- Fleet GitRepo reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet GitRepo creation examples: https://fleet.rancher.io/0.10/gitrepo-add
- Kubewarden policy configuration: https://docs.kubewarden.io/howtos/policies
- Kubewarden trusted-repos policy repository: https://github.com/kubewarden/trusted-repos-policy

## Issues Found
- The Rancher image load command passed `--registry harbor.internal.company.com/rancher`, but Rancher’s `rancher-load-images.sh` expects only the registry host or host:port. Leaving `/rancher` in place would duplicate the namespace in the generated image names. I changed both image-load commands to use only `harbor.internal.company.com`.
- The internal Helm repository section included `rancher-backup` from the wrong repository/version family for Rancher 2.8, and the backup operator also requires additional CRD handling not covered in the post. I removed that incorrect chart example and kept the section focused on mirroring the Rancher chart actually used later in the article.
- The Helm OCI examples omitted Harbor registry authentication. I added `helm registry login` before pushing and pulling charts from the internal OCI registry.
- The RKE2 offline installation example was incomplete: it did not download `install.sh`, and it used `INSTALL_RKE2_SKIP_DOWNLOAD=true` instead of the documented local-artifact flow. I updated it to the supported `INSTALL_RKE2_ARTIFACT_PATH` workflow from the official RKE2 air-gap docs.
- The RKE2 `registries.yaml` snippet used `caFile`, but the documented key is `ca_file`. I corrected the field name.
- The YAML examples used shell-style placeholders like `${HARBOR_ROBOT_TOKEN}` and `${INTERNAL_CA_BUNDLE_BASE64}` inside Kubernetes/RKE2 YAML. Those files do not expand shell variables by themselves, so I replaced them with explicit literal placeholders.
- The Kubewarden example referenced a non-matching policy/settings shape. I replaced it with the supported `trusted-repos-policy` module and the correct `registries.allow` configuration.

## Review Notes
- The post is version-pinned to Rancher `v2.8.3` and RKE2 `v1.28.6+rke2r1`. Those commands were checked specifically for that version line.
- As of April 24, 2026, Rancher `v2.8` documentation is archived and newer supported Rancher and RKE2 releases exist. The post is still technically valid after the fixes above, but readers planning a new deployment should re-check the current supported versions before implementation.
- In a strict air-gap, RKE2 operators may also want to set `disable-default-registry-endpoint` in RKE2 configuration so containerd does not fall back to upstream registry endpoints when mirrors are configured.
