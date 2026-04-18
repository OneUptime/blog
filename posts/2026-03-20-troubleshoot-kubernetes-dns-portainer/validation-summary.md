# Validation Summary: How to Troubleshoot Kubernetes DNS Issues from Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes (kubectl, pods, services, ConfigMaps)
- CoreDNS (Corefile, forward plugin, logging)
- DNS tools: nslookup, dig, host
- Portainer (terminal/exec access)
- Container image: infoblox/dnstools
- /etc/resolv.conf (search, nameserver, ndots)

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- CoreDNS documentation (Corefile, forward plugin): https://coredns.io/plugins/forward/
- kubectl run, kubectl logs, kubectl get command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- resolv.conf(5) manual page (ndots, search options)
- infoblox/dnstools Docker Hub image (Alpine-based, includes bash, dig, nslookup, host)

## Issues Found
No technical issues found.

- The CoreDNS pod label `k8s-app=kube-dns` is correct; CoreDNS retains this label for backward compatibility with kube-dns.
- The Kubernetes service DNS format `<service>.<namespace>.svc.cluster.local` is correct per the official DNS spec.
- The default cluster DNS service IP `10.96.0.10` is correct for the default service CIDR (`10.96.0.0/12`).
- The `infoblox/dnstools` image is Alpine-based but includes bash, so `/bin/bash` as the entry command works.
- The explanation of `ndots:5` behavior (names with fewer than 5 dots are tried with search suffixes first) matches resolv.conf semantics.
- NXDOMAIN, SERVFAIL, and i/o timeout descriptions are accurate DNS error semantics.

## Review Notes
- The `kubectl run ... --rm -it` pattern for a temporary debug pod is valid but the pod only stays around for the interactive session; the `--rm` flag removes it on exit.
- Step 5's command has extra whitespace between flags which is cosmetic and still valid in bash (multiple spaces collapse to a single delimiter).
- For clusters using a non-default service CIDR, the DNS nameserver IP in `/etc/resolv.conf` will differ from `10.96.0.10` — readers should verify via `kubectl get svc -n kube-system kube-dns`.
- Some managed Kubernetes distributions (e.g., GKE with kube-dns instead of CoreDNS) may not have a `coredns` ConfigMap; Step 4 assumes CoreDNS, which matches the post's stated scope.
