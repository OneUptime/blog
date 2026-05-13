# Validation Summary: How to Migrate Existing Workloads to Calico in nftables Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- kube-proxy
- nftables
- iptables
- FelixConfiguration
- Tigera Operator Installation API
- NetworkPolicy
- Prometheus metrics

## Sources Consulted
- Calico nftables data plane guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes kube-proxy config API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/

## Issues Found
- The post incorrectly described `iptablesBackend: nft` as enabling Calico's nftables dataplane. Changed this to explain that `iptablesBackend` selects the iptables-nft compatibility backend, while Calico nftables mode is selected through `Installation.spec.calicoNetwork.linuxDataplane: Nftables` for operator-managed installs or Felix `nftablesMode: Enabled` for non-operator-managed installs.
- The prerequisites listed Linux 5.2+ as the requirement. Updated this to Linux 5.13+ and `nft` 1.0.1+, matching Calico's nftables dataplane requirements.
- The post omitted the requirement that kube-proxy must also run in nftables mode. Added Kubernetes 1.31+ with kube-proxy configured for `nftables` mode and added a validation command for the kube-proxy ConfigMap.
- The migration command patched the wrong field for the stated dataplane migration. Replaced it with an operator `Installation` patch and added the Felix `nftablesMode` patch for non-operator-managed deployments.
- The verification text implied iptables chains would simply be gone. Revised this to check nftables tables and look for stale legacy Calico iptables chains, because backend transitions can leave orphaned rules that require operational cleanup.
- The pod-to-service test used HTTP against the Kubernetes service, which normally serves HTTPS. Changed it to use HTTPS with `wget`.
- The NetworkPolicy test selected pods with `test: migration`, but the example never labeled the isolated target pod. Added a label command so the policy applies to the intended pod.
- The policy test used `curl` from a BusyBox pod, which is not reliably present. Changed it to BusyBox `wget`.
- The Felix metric name was missing the `_seconds` suffix. Updated the command to use `felix_int_dataplane_apply_time_seconds`.
- The post claimed apply times under 1 second confirm normal operation. Replaced this with baseline comparison and watching `felix_int_dataplane_failures`, because Calico documents that thresholds depend on cluster size and churn rate.

## Review Notes
Calico's official open source documentation primarily documents installing Calico in nftables mode rather than a universal live migration procedure. The revised post keeps the existing migration-guide structure but avoids promising zero downtime or a single runtime switch that official documentation does not support.
