# Validation Summary: How to Configure K3s Dual-Stack Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Dual-stack networking
- IPv4
- IPv6
- Flannel
- CoreDNS
- Traefik
- `kubectl`

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Helm / HelmChartConfig docs: https://docs.k3s.io/add-ons/helm
- K3s Advanced Options / CoreDNS custom configuration: https://docs.k3s.io/advanced
- K3s source for server CLI flags: https://raw.githubusercontent.com/k3s-io/k3s/master/pkg/cli/cmds/server.go
- K3s source for rendered CoreDNS service dual-stack behavior: https://raw.githubusercontent.com/k3s-io/k3s/master/pkg/server/server.go
- K3s packaged CoreDNS manifest: https://raw.githubusercontent.com/k3s-io/k3s/master/manifests/coredns.yaml
- K3s-packaged Traefik chart values: https://raw.githubusercontent.com/k3s-io/k3s-charts/main/charts/traefik/39.0.701+up39.0.7/values.yaml
- Kubernetes dual-stack services docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl expose` reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The post said K3s dual-stack support started at "Kubernetes 1.21+" and listed `v1.21+` as the prerequisite. I corrected this to the K3s-specific version gates from the official docs: experimental in `v1.21.0+k3s1` and stable in `v1.23.7+k3s1`.
- The example IPv6 pod CIDR used `fd42::/24`. K3s recommends a `/56` IPv6 pod CIDR for dual-stack examples unless you are deliberately planning different node mask sizes, so I changed the example to `fd42::/56` in both the planning and install sections.
- The config file example used comma-separated scalar strings for repeatable networking flags. I converted `cluster-cidr`, `service-cidr`, and `cluster-dns` to YAML lists to match K3s’ documented configuration-file style for repeated values.
- The verification step checked the `kubernetes` Service and expected dual-stack fields that are not the most reliable K3s-specific verification target. I changed the check to the `kube-dns` Service, which K3s explicitly templates with `clusterIP`, `clusterIPs`, and dual-stack `ipFamilyPolicy` based on the configured `cluster-dns` values.
- The connectivity test commands created BusyBox pods but did not attach to them, so they would not reliably print the HTTP response as written. I changed them to use `kubectl run --attach --rm -i ... wget -qO- ...` and removed the no-longer-needed pod cleanup line.
- The CoreDNS section was incorrect. K3s does not configure CoreDNS dual-stack through a `HelmChartConfig` named `coredns`; K3s ships CoreDNS as a packaged manifest and documents customization via a `coredns-custom` `ConfigMap`. I replaced that section with the correct statement that no extra CoreDNS dual-stack manifest is required for this setup and kept it as a verification step instead.
- The conclusion implied that `flannel-ipv6-masq` is generally required. K3s documents this as situational for ULA or other non-publicly routed IPv6 ranges, so I qualified that statement.

## Review Notes
- K3s dual-stack must be configured when the cluster is first created; it cannot be retrofitted onto an already-started IPv4-only cluster. The post’s workflow already assumes a fresh install, so no structural change was required.
- K3s documents a kubelet dual-stack node-address caveat on releases before `v1.27` when cluster traffic does not use the primary interface. Readers targeting older K3s releases should check the current K3s networking docs for the recommended `--kubelet-arg=node-ip=...` workaround.
- The Traefik `HelmChartConfig` shown in the post matches the current packaged chart values for `service.ipFamilyPolicy` and `service.ipFamilies`, but dual-stack `LoadBalancer` behavior still depends on the environment that fronts the Service.
- Review was documentation- and source-based. The commands were not executed against a live K3s cluster during validation.
