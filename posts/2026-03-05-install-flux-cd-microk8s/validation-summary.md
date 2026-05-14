# Validation Summary: How to Install Flux CD on MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- GitOps
- Kubernetes
- MicroK8s
- Ubuntu
- Snap
- GitHub personal access tokens
- HelmRepository and HelmRelease custom resources

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `flux check` command reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide and API reference: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux uninstall documentation: https://fluxcd.io/flux/installation/uninstall/
- Flux image automation documentation: https://fluxcd.io/flux/guides/image-update/
- MicroK8s getting started documentation: https://microk8s.io/docs/getting-started
- MicroK8s snap channel documentation: https://microk8s.io/docs/setting-snap-channel
- MicroK8s DNS add-on documentation: https://microk8s.io/docs/addon-dns
- MicroK8s add-ons documentation: https://microk8s.io/docs/addons
- MicroK8s built-in registry documentation: https://microk8s.io/docs/registry-built-in
- Snap Store `microk8s` channel metadata from `snap info microk8s`

## Issues Found
- The post installed MicroK8s from the `1.28/stable` snap channel. Current Flux documentation requires a supported Kubernetes version such as v1.33 or newer, so I updated the command to use `1.35/stable`.
- The prerequisites listed 2 GB of RAM. MicroK8s documentation recommends 4 GB of memory for workloads, so I updated the requirement to 4 GB.
- The MicroK8s setup command ran `sudo chown -R $USER ~/.kube` before ensuring `~/.kube` exists. I added `mkdir -p ~/.kube`, retained ownership correction, and added `chmod 0700 ~/.kube` to match MicroK8s guidance.
- The add-on section said Flux CD requires DNS and storage at a minimum. Flux requires working cluster DNS, but MicroK8s storage is not a Flux controller prerequisite. I changed the wording to describe storage as useful for later workloads.
- The add-on section implied MicroK8s `helm3` is needed for Flux `HelmRelease` resources. Flux Helm releases are reconciled by Flux's helm-controller, so I changed the note to say the add-on is useful for manual Helm commands.
- The GitHub bootstrap examples omitted `--token-auth` while describing PAT-based bootstrap. I added `--token-auth` and changed the path from `./clusters/microk8s-cluster` to the repository-relative `clusters/microk8s-cluster` form used in Flux documentation.
- The registry note mentioned Flux image automation without noting that the image reflector and automation controllers are optional and not installed by default. I added that caveat.

## Review Notes
The HelmRepository and HelmRelease manifests use current Flux API versions (`source.toolkit.fluxcd.io/v1` and `helm.toolkit.fluxcd.io/v2`) and valid fields. The `flux check --pre`, `flux get helmreleases --watch`, and `flux uninstall --silent` commands match current Flux CLI documentation.
