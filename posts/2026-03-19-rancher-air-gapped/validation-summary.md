# Validation Summary: How to Install Rancher on an Air-Gapped Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- cert-manager
- Docker
- Private container registries
- Air-gapped deployment workflows

## Sources Consulted
- Rancher air-gapped install docs for Rancher v2.9: https://ranchermanager.docs.rancher.com/v2.9/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher image collection and private registry workflow: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher v2.9.3 release assets: https://github.com/rancher/rancher/releases/tag/v2.9.3
- Rancher stable chart index and chart metadata: https://releases.rancher.com/server-charts/stable/index.yaml
- Rancher v2.9.3 support matrix: https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/rancher-v2-9-3/
- cert-manager v1.14 Helm installation docs: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager v1.14.4 chart package and values: https://charts.jetstack.io/charts/cert-manager-v1.14.4.tgz

## Issues Found
- The prerequisite said Rancher v2.9.3 could run on Kubernetes v1.25 or later. Rancher’s v2.9.3 support matrix certifies Kubernetes v1.27 through v1.30, so the prerequisite was corrected to that supported range.
- The air-gap transfer step omitted `rancher-images.txt`, but Rancher’s `rancher-load-images.sh` expects that file when pushing images into the private registry. The file was added to the transfer list.
- The cert-manager mirroring and install steps omitted the `startupapicheck` image used by the cert-manager v1.14.4 chart. This could leave the installation trying to pull from the public registry in an air-gapped environment. I added `quay.io/jetstack/cert-manager-startupapicheck:v1.14.4` to the mirrored image list and added `startupapicheck.image.repository` to the Helm install command.
- The manual fallback in Step 6 was labeled as a `skopeo` workflow, but the commands used `docker load`, `docker tag`, and `docker push`. The label was corrected to describe a manual Docker-based push.
- The Rancher install step referenced `./rancher-${RANCHER_VERSION}.tgz`, but Helm pulls the Rancher chart as `rancher-2.9.3.tgz`. The command was corrected to use `./rancher-${RANCHER_VERSION#v}.tgz`.
- The Rancher install step did not set `certmanager.version`, which Rancher documents as an air-gap chart option for cert-manager compatibility. The Helm install command was updated to pass `--set certmanager.version=${CERT_MANAGER_VERSION}`.

## Review Notes
The post is technically relevant and valid after the fixes above. I verified the Rancher and cert-manager commands against official docs, release assets, and chart metadata, but I did not perform a live installation on a Kubernetes cluster in this workspace.
