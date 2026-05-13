# Validation Summary: How to Deploy kube-vip for Virtual IP with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kube-vip
- kube-vip cloud provider
- Flux CD
- HelmRelease and HelmRepository resources
- Kustomization resources
- LoadBalancer Services

## Sources Consulted
- kube-vip cloud provider documentation: https://kube-vip.io/docs/usage/cloud-provider/
- kube-vip DaemonSet installation documentation: https://kube-vip.io/docs/installation/daemonset/
- kube-vip architecture documentation: https://kube-vip.io/docs/about/architecture/
- kube-vip ARP mode documentation: https://kube-vip.io/docs/modes/arp/
- kube-vip flags and environment variables documentation: https://kube-vip.io/docs/installation/flags/
- kube-vip Helm chart values and templates: https://github.com/kube-vip/helm-charts/tree/main/charts/kube-vip-cloud-provider
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kube-vip GitHub releases API: https://api.github.com/repos/kube-vip/kube-vip/releases/latest

## Issues Found
- The post described the kube-vip DaemonSet as an alternative to the cloud provider. Updated this to explain that the cloud provider allocates LoadBalancer IPs and the kube-vip manager/DaemonSet advertises them.
- The HelmRelease used a non-existent chart values path, `values.config.cidr-global`. Updated it to use `values.configMapName: kubevip`, matching the kube-vip cloud provider Helm chart and the ConfigMap created in the next step.
- The kube-vip DaemonSet example used `vip_cidr`, but current kube-vip documentation uses `vip_subnet`. Updated the environment variable.
- The DaemonSet lacked the current control-plane node affinity label and `serviceAccountName: kube-vip`. Added both and noted that RBAC resources must be included.
- The DaemonSet used the old kube-vip image tag `v0.7.2`. Updated it to the current latest release, `v1.1.2`, as reported by the official GitHub releases API on 2026-05-13.
- The test Service had no backing Pods, so the `curl` verification would not work. Added a small nginx Deployment before the LoadBalancer Service.
- The test commands assumed the allocated IP would be `192.168.10.100`. Updated the examples to read the assigned External IP into `EXTERNAL_IP` before pinging or curling it.

## Review Notes
- The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions used in the post are current.
- The `0.2.x` Helm chart semver selector is valid, but pinning a specific chart version may be preferable in production GitOps repositories.
