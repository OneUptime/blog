# Validation Summary: How to Configure K3s for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- IPv6 networking
- Flannel
- CoreDNS
- Traefik
- Linux sysctl networking

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Agent CLI reference: https://docs.k3s.io/cli/agent
- K3s Server CLI reference: https://docs.k3s.io/cli/server
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Helm / HelmChartConfig docs: https://docs.k3s.io/add-ons/helm
- K3s installer script: https://get.k3s.io
- Kubernetes `kube-controller-manager` reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- Kubernetes DNS customization docs: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Traefik Helm chart values reference: https://doc.traefik.io/traefik-hub/api-gateway/reference/install/ref-helm
- Traefik Helm chart values file: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml

## Issues Found
- The original post used `fd42::/24` for the pod CIDR and stated `/80` per-node CIDRs. K3s recommends `/56` for the IPv6 cluster CIDR example, and Kubernetes defaults IPv6 node CIDRs to `/64`. I updated the CIDR examples and all matching references.
- The post omitted two documented K3s IPv6 caveats: single-stack IPv6 nodes that learn the default route via router advertisements may require `net.ipv6.conf.all.accept_ra=2`, and clusters using IPv6 as the primary family should set `node-ip` explicitly. I added both requirements to the server and agent configuration examples.
- The verification examples had execution issues. I added waits where commands depended on pod readiness or completion, fixed the pod/service label mismatch in the service test, and corrected the `kubectl run` example for `curlimages/curl` to use `--command`.
- The CoreDNS service check used `coredns` as the Service name. Kubernetes exposes CoreDNS behind the `kube-dns` Service name for compatibility, so I corrected that lookup.
- The Traefik HelmChartConfig example used invalid value placement for IP family settings and unnecessary entrypoint overrides. I corrected the example to use `service.spec.ipFamilies` and `service.spec.ipFamilyPolicy`.

## Review Notes
- K3s documents single-stack IPv6 support as available starting with `v1.22.9+k3s1`.
- K3s documents a router advertisement caveat for IPv6-only clusters and a `node-ip` caveat when IPv6 is the primary family; these are important on hosts that still also have IPv4 configured.
- K3s 1.32 and newer bundle Traefik v3. The HelmChartConfig approach used in the post remains current.
