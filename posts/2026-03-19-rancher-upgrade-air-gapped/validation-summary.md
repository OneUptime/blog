# Validation Summary: How to Upgrade Rancher in an Air-Gapped Environment

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
- skopeo
- Private container registries
- RKE2

## Sources Consulted
- Rancher: Upgrading in an Air-Gapped Environment - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/air-gapped-upgrades
- Rancher: Collect and Publish Images to your Private Registry - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher: Install Rancher in an Air-Gapped Environment - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher: Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Upgrading Cert-Manager - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/upgrade-cert-manager
- Rancher: Choosing a Rancher Version - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher release assets and air-gap scripts - https://github.com/rancher/rancher/releases
- Helm CLI reference: helm pull - https://helm.sh/docs/v3/helm/helm_pull/
- Helm CLI reference: helm upgrade - https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes: Update API Objects in Place Using kubectl patch - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- skopeo copy reference - https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md

## Issues Found
- The post hard-coded `cert-manager` chart version `v1.14.4`, which is not generally correct for Rancher upgrades. I replaced it with `<CERT_MANAGER_VERSION>` and clarified that it should match the version already running on the cluster when Rancher-generated certificates are in use.
- The post downloaded the cert-manager chart but did not add the required cert-manager images to `rancher-images.txt`. I added the documented `helm template ... | awk ... >> rancher-images.txt` flow and a `sort -u` pass so the image list is complete for air-gapped upgrades that use Rancher-generated certificates.
- The selective `skopeo` mirroring example used `diff` on unsorted files and copied images without preserving multi-arch manifests. I changed it to a sorted `comm` comparison and added `skopeo copy --all`, which is a safer fit for registry mirroring.
- The transfer step omitted `rancher-images.txt`, even though the later load command requires it. I added the file to the transfer list.
- The Helm values example only set `systemDefaultRegistry`, but Rancher's air-gapped upgrade docs also require the Rancher server image registry override. I added `image.registry`, and I added `certmanager.version` to match Rancher's documented upgrade options.
- Step 9 incorrectly referred to a ConfigMap for system images. Rancher stores this as the `system-default-registry` setting, so I updated the section title, description, and commands to use `settings.management.cattle.io`.
- The `kubectl patch` example patched a custom resource without specifying a supported patch type. Because strategic merge patch is not supported for custom resources, I changed it to `--type=merge`.
- The version-check command unnecessarily targeted `cattle-system` for a cluster-scoped Rancher setting. I corrected it to query `settings.management.cattle.io server-version` directly.

## Review Notes
- Rancher documentation currently calls out a version-specific issue in Rancher Community v2.13.1 for some setups using a global `system-default-registry`, where `cattle-cluster-agent` can be generated with an incorrect `docker.io` path segment. Readers upgrading specifically to v2.13.1 should check the release notes and Rancher upgrade docs for the documented workaround.
- The `certmanager.version` setting is only relevant when Rancher is using cert-manager-managed certificates. Environments using `ingress.tls.source=secret` or external TLS termination do not need the cert-manager image collection flow.
