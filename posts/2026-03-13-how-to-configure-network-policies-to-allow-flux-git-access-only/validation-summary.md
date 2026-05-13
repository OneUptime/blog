# Validation Summary: How to Configure Network Policies to Allow Flux Git Access Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux source-controller
- Kubernetes NetworkPolicy
- Kubernetes DNS / CoreDNS
- kubectl
- Flux CLI
- GitHub and GitLab.com Git endpoints

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux source-controller deployment manifests: https://github.com/fluxcd/source-controller/releases
- GitHub IP address documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses
- GitHub Meta API documentation: https://docs.github.com/rest/meta/meta
- GitLab.com settings documentation: https://docs.gitlab.com/user/gitlab_com/
- Cloudflare IP ranges: https://www.cloudflare.com/ips/

## Issues Found
- Added a caveat that the Git-only policy is appropriate for GitRepository-only Flux installations. The source-controller also fetches HelmRepository, OCIRepository, and Bucket sources, so those endpoints need their own allow rules when used.
- Removed the GitLab KAS metadata command because `.kas.externalUrl` is unrelated to Git clone traffic. Replaced it with GitLab DNS lookup plus Cloudflare CIDR guidance because GitLab.com is fronted by Cloudflare.
- Narrowed the DNS NetworkPolicy namespace selector to `kube-system` using the standard `kubernetes.io/metadata.name` namespace label instead of matching any namespace with a `k8s-app=kube-dns` pod.
- Changed the Kubernetes API example to start with the `kubernetes` Service ClusterIP and added a note that some CNIs enforce policy after destination NAT, in which case API server endpoint IPs must be allowed.
- Replaced the GitLab.com CIDR example with the Cloudflare range that covers the currently resolved GitLab.com address and added instructions to verify against Cloudflare's published ranges.
- Updated the CronJob example from `bitnami/kubectl:latest` to `alpine:3.20` because the example uses `apk`. Also removed `head -10` so the script does not silently discard GitHub Git CIDRs.
- Changed the Flux verification command to use a placeholder GitRepository name with `-n flux-system`, matching Flux CLI syntax for reconciling a named GitRepository.
- Changed the temporary egress test to use `busybox:1.36`, `--restart=Never`, and HTTP rather than HTTPS to avoid conflating NetworkPolicy behavior with BusyBox TLS support.

## Review Notes
- Kubernetes NetworkPolicy support and Service IP handling are CNI-dependent. The post now calls out the API server NAT caveat, but operators should still test the policies in their target CNI.
- GitHub and GitLab.com IP ranges can change. The examples should be treated as starting points and refreshed from provider-published sources before production use.
