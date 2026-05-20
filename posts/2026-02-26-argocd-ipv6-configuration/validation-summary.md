# Validation Summary: How to Configure ArgoCD with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Services and dual-stack networking
- kubeadm
- argo-helm
- ingress-nginx
- external-dns
- Redis
- DNS A and AAAA records
- Kubernetes NetworkPolicy

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes kubeadm dual-stack support documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes kubeadm v1beta4 configuration API reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD cluster management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- argo-helm argo-cd chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- argo-helm argo-cd chart templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd/templates
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- external-dns annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- external-dns Service source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Related OneUptime firewall rules blog link, checked for HTTP 200: https://oneuptime.com/blog/post/2026-02-26-argocd-firewall-rules/view

## Issues Found
- The kubeadm example used `kubeadm.k8s.io/v1beta3`. Updated it to `kubeadm.k8s.io/v1beta4`, which is the current kubeadm configuration API documented for current Kubernetes releases.
- The argo-helm values examples configured `ipFamilyPolicy` and `ipFamilies` under individual component services. Current argo-helm uses `global.dualStack` for component services, so the examples were updated accordingly.
- The Helm examples did not configure IPv6 listen addresses for the repo server. Added `repoServer.extraArgs` with `--address "::"` where IPv6-only listener behavior is required.
- The raw Deployment example replaced the container arguments without including the Argo CD server binary. Updated the snippet to include `/usr/local/bin/argocd-server`, matching the official manifest pattern.
- The explanation that `::` generally includes IPv4 was too broad. Clarified that IPv4-mapped IPv6 behavior depends on OS and socket settings and should be verified in dual-stack clusters.
- The ingress-nginx example used a non-existent `--enable-ipv6` controller flag. Replaced it with the documented ConfigMap setting `disable-ipv6: "false"`, noting that IPv6 listening is enabled by default.
- The remote cluster example used `argocd cluster add --server` as if it set the managed cluster API endpoint. In Argo CD CLI, `--server` is an inherited flag for the Argo CD API server. Updated the example to set the IPv6 Kubernetes API URL in kubeconfig and then run `argocd cluster add` against the context.
- The Redis example bound Redis to `::1`, which is IPv6 loopback only and would not be reachable through a Kubernetes Service. Updated it to bind to `::`.

## Review Notes
ingress-nginx documentation now notes project retirement after March 2026. Existing installations and artifacts remain available, but future production guidance should consider a maintained Gateway API or ingress implementation.
