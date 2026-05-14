# Validation Summary: How to Set Up Flux CD on Talos Linux Bare Metal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Flux CD
- Cilium
- Helm
- GitHub GitOps repositories
- Talos Cloud Controller Manager

## Sources Consulted
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/system-configuration/patching
- Talos Cilium deployment documentation: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos KubePrism documentation: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/kubeprism
- Talos GitHub releases: https://github.com/siderolabs/talos/releases
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Helm installation documentation: https://helm.sh/docs/v3/intro/install/
- Talos Cloud Controller Manager installation documentation: https://github.com/siderolabs/talos-cloud-controller-manager/blob/main/docs/install.md
- Kubernetes Cloud Controller Manager documentation: https://kubernetes.io/docs/concepts/architecture/cloud-controller/

## Issues Found
- The original CNI flow was not technically correct. Talos installs Flannel by default, while the post attempted to deploy Cilium later with kube-proxy replacement settings. I changed the Talos machine configuration to disable the default CNI and kube-proxy, then added a pre-Flux Cilium installation step using the Talos-documented Helm values.
- The original sequence ran `talosctl health` before any CNI existed. With `cluster.network.cni.name: none`, Talos can wait on node readiness until Cilium is installed. I moved the health check until after Cilium installation.
- The patched Talos config command applied the control plane patch both globally and as a control-plane-specific patch. I removed the global `--config-patch` so the control plane IP and hostname are not applied to worker configs.
- The provisioning commands pointed `TALOSCONFIG` at the unpatched output directory. I changed it to `_out/patched/talosconfig`.
- The Cilium Helm values were missing the `cleanCiliumState` capabilities required by the Talos Cilium guidance. I added them.
- The Talos installer image was pinned to an outdated version. I updated it to `ghcr.io/siderolabs/installer:v1.13.2`, the latest stable Talos release found during review.
- Flux image CRDs were used later in the post, but Flux image automation controllers are optional and not installed by default. I added `--components-extra=image-reflector-controller,image-automation-controller` to the bootstrap command.
- The demo workload targeted the `demo` namespace without creating it. I added a Namespace manifest and included it in the app kustomization.
- The repository layout did not include a root `clusters/bare-metal/kustomization.yaml`, so the Flux bootstrap path would not necessarily include the infrastructure and app Kustomizations. I added the root Kustomization snippet.
- The Talos Cloud Controller Manager section incorrectly described machine configuration upgrades and referenced an undefined HelmRepository. I corrected the description, used an OCIRepository source, switched the HelmRelease to `chartRef`, and added a caveat that the Talos machine config must be prepared first.
- The image automation section only defined ImageRepository and ImagePolicy objects, not an ImageUpdateAutomation workflow. I renamed and reworded the section to describe image policy scanning rather than full automated Git updates.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- The post now uses a manual Cilium bootstrap followed by Flux management for future Cilium changes. A future improvement would be to show Talos inline manifests for Cilium to make the entire first boot more declarative.
