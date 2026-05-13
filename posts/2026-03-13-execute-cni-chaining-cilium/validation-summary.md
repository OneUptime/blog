# Validation Summary: Execute CNI Chaining with Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CNI chaining
- Helm
- eBPF
- CiliumNetworkPolicy
- Prometheus metrics

## Sources Consulted
- Cilium generic-veth CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-generic-veth.html
- Cilium CNI chaining overview: https://docs.cilium.io/en/stable/installation/cni-chaining.html
- Cilium Azure CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni.html
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post described CNI chaining as the recommended approach for managed Kubernetes services including EKS, AKS, and GKE. Cilium's AKS documentation recommends AKS BYO CNI or Azure CNI Powered by Cilium for most AKS users, so the wording was softened to "common option."
- The prerequisites claimed Linux kernel 5.4+ was required. Current Cilium documentation requires Linux kernel 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, so the prerequisite was updated.
- The `kubectl debug node/...` examples read `/etc/cni/net.d` directly. Kubernetes mounts the node root filesystem at `/host` inside node debug pods, so the commands were corrected to use `/host/etc/cni/net.d`.
- The generic-veth Helm install was incomplete because current Cilium documentation requires a CNI ConfigMap with the chained plugin list and Helm values `cni.customConf=true` and `cni.configMap=cni-configuration`. Added the ConfigMap template and corrected the Helm command.
- The Cilium version in the Helm example was outdated at `1.15.0`. Updated the example to `1.19.3`, matching the current stable documentation consulted during review.
- The verification command referenced `/etc/cni/net.d/05-cilium.conf`. Cilium writes `05-cilium.conflist`, and the node debug pod needs the `/host` prefix, so the path was corrected.
- The CiliumNetworkPolicy comment said it allowed HTTP GET requests, but the policy only allows TCP port 80 and has no L7 HTTP method rule. Updated the comment to describe TCP/80 accurately.
- The chaining mode table listed `azure-cni`, which is not the documented Helm chaining mode. Azure CNI and Calico chaining use `generic-veth`, so the table was corrected.
- The best-practice note said to always set `cni.exclusive=false`. That is appropriate for some CNI-chaining flows, but the generic-veth ConfigMap flow uses `cni.customConf=true` and `cni.configMap`; the guidance was updated.

## Review Notes
- Some advanced Cilium features can be limited in CNI chaining mode, including L7 policy and IPsec transparent encryption. The post's example now avoids implying L7 HTTP policy behavior.
