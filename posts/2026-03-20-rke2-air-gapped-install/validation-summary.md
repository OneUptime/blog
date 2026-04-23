# Validation Summary: How to Install RKE2 in an Air-Gapped Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RKE2
- Kubernetes
- Air-gapped installation
- containerd private registry mirrors
- RKE2 HA server and agent configuration
- Helm
- Rancher Manager
- Docker image mirroring

## Sources Consulted
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 install script: https://get.rke2.io
- Rancher Air-Gapped Helm CLI Install: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install
- Rancher Collect and Publish Images to Private Registry: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher Install in Air-Gapped Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher stable Helm chart index: https://releases.rancher.com/server-charts/stable/index.yaml
- RKE2 GitHub releases: https://github.com/rancher/rke2/releases

## Issues Found
1. **Outdated example versions**: Updated the RKE2 example version from `v1.28.8+rke2r1` to `v1.34.6+rke2r3` and the Rancher chart example from `2.8.0` to `2.13.3`, matching currently available stable artifacts and Rancher's stable chart compatibility.

2. **Incomplete offline artifact transfer**: The post downloaded `sha256sum-amd64.txt` but did not transfer it to air-gapped nodes. Added the checksum file to the transfer commands and copied all offline installer inputs into `~/rke2-artifacts`, which matches the installer `INSTALL_RKE2_ARTIFACT_PATH` workflow.

3. **Problematic image copy target**: The original `scp` copied images directly into `/var/lib/rancher/rke2/agent/images/`, which often fails for non-root SSH users and bypasses installer checksum handling. Changed the flow so the installer stages the verified image tarball.

4. **Worker install was missing the agent service type**: Added `INSTALL_RKE2_TYPE="agent"` for worker nodes so the install script creates the `rke2-agent` service instead of the default `rke2-server` service.

5. **Installer behavior description was inaccurate**: Changed the description from loading images during installation to installing the image tarball under `/var/lib/rancher/rke2/agent/images/`; RKE2/containerd loads it when the service starts.

6. **Private registry configuration needed to be per-node and true air-gap aware**: Clarified that `registries.yaml` must be created on every server and worker node, and added `disable-default-registry-endpoint: true` to avoid fallback pulls from upstream registries in a true air-gapped cluster.

7. **Multi-server HA configuration was incomplete**: Added the required fixed registration address prerequisite, shared `token`, and separate first-server vs additional-server `server: https://...:9345` configuration so additional servers join the same cluster.

8. **Worker join configuration was missing**: Added worker `config.yaml` with `server`, `token`, and `system-default-registry`, plus `rke2-agent.service` startup commands.

9. **Rancher Helm install was not air-gap complete**: Switched to the stable Rancher chart repo, added `image.registry` and `systemDefaultRegistry`, and noted that Rancher and cert-manager images must be synced and cert-manager installed locally when using Rancher's default self-signed TLS.

10. **Image sync script robustness**: Updated the RKE2 version in the sync script, quoted Docker command variables, and skipped blank lines from the image list.

## Review Notes
- The examples remain amd64-specific. ARM64 installations need the matching `arm64` release assets and checksum file.
- The Rancher section is still a compact example. A production-ready air-gap Rancher install should also document the exact cert-manager chart version, TLS option, and Rancher image asset workflow chosen for the environment.
