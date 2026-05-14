# Validation Summary: How to Install Flux CD on K3s Lightweight Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes
- Flux CD
- Flux CLI
- GitHub bootstrap for GitOps
- Kubernetes custom resources: GitRepository and Kustomization

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s SELinux Support: https://docs.k3s.io/advanced
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- Flux Installation: https://fluxcd.io/flux/installation/
- Flux CLI install documentation: https://fluxcd.io/flux/cmd/
- Flux bootstrap GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap github command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux uninstall command reference: https://fluxcd.io/flux/cmd/flux_uninstall/
- podinfo kustomize directory on GitHub: https://github.com/stefanprodan/podinfo/tree/master/kustomize

## Issues Found
- The prerequisites listed `1 CPU and 512 MB of RAM`, which matches the current K3s agent minimum but not a K3s server installation. Updated it to `2 CPU cores and 2 GB of RAM` for the K3s server, matching the current K3s requirements.
- The prerequisites did not mention Flux's cluster-admin and Kubernetes version requirements. Added a concise prerequisite for cluster-admin access and a Kubernetes version supported by the Flux release.
- The pre-flight check explanation implied Traefik/CoreDNS satisfied Flux networking requirements. Adjusted the wording to clarify that K3s deploys those components by default, while Flux primarily requires Kubernetes API connectivity and supported API resources.

## Review Notes
The Flux CLI install command, `flux bootstrap github` flags, default Flux components, `flux check`, `flux uninstall --silent`, and the GitRepository/Kustomization examples are consistent with current Flux documentation. The podinfo example still uses a `master` branch and contains a `kustomize` directory, so the sample application configuration is valid.
