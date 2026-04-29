# Validation Summary: How to Configure K3s Disable Flags

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- ingress-nginx
- MetalLB
- Metrics Server
- Longhorn
- Helm

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Helm Add-ons and HelmChartConfig: https://docs.k3s.io/add-ons/helm
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- MetalLB Installation: https://metallb.io/installation/
- MetalLB Configuration: https://metallb.io/configuration/
- Metrics Server upstream documentation: https://github.com/kubernetes-sigs/metrics-server
- Longhorn Helm installation documentation: https://longhorn.io/docs/latest/deploy/install/install-with-helm/

## Issues Found
- The existing-cluster examples appended a second `disable:` key or bare list items directly to `config.yaml`, which can produce invalid or misleading YAML. I changed these to use supported K3s config drop-in files under `/etc/rancher/k3s/config.yaml.d/` with `disable+:`.
- The environment-variable install example piped into `sudo sh -`, which does not match the documented K3s install-script pattern for `INSTALL_K3S_EXEC`. I changed it to `sh -s -` to align with the official install-script usage.
- The ingress-nginx example set NodePorts to `80` and `443`, which is invalid on default Kubernetes clusters because NodePort values come from the `30000-32767` range unless the API server range is explicitly changed. I replaced that example with a standard chart install command.
- The MetalLB manifest URL was pinned to `v0.14.3`, which is outdated relative to current upstream installation docs. I updated it to the current documented manifest version at review time.
- The verification section used `kubectl get helmchart` as a generic check for disabled packaged components, but not all packaged K3s components are represented as HelmChart resources. I changed the check to use K3s AddOn resources instead.
- The “disable all optional components” example omitted `coredns` even though the post lists CoreDNS as a built-in component that can be disabled. I added `coredns` and the corresponding note that a replacement cluster DNS provider is then required.
- Two generic explanations referred only to Helm charts, which is not accurate for all K3s packaged components. I corrected that wording to refer to packaged components or packaged manifests/Helm charts as appropriate.

## Review Notes
- `--disable=servicelb` is a critical server setting in multi-server K3s clusters and should be applied consistently on every server node.
- The Metrics Server example still uses `--kubelet-insecure-tls`, but the post correctly limits it to development and testing. Production clusters should prefer valid kubelet serving certificates.
- The MetalLB manifest remains version-pinned. That is valid, but it should be rechecked periodically as new releases become current.
