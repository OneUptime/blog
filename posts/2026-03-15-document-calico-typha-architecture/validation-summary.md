# Validation Summary: How to Document Calico Typha Architecture for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Kubernetes API datastore
- Kubernetes kubectl CLI
- Calico Felix
- Calico dataplanes: iptables and eBPF
- Prometheus metrics for Typha

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico on-premises installation guidance, including Typha replica recommendations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico resource requests and limits documentation: https://docs.tigera.io/calico/latest/reference/configure-resources
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found

1. **etcd guidance was too broad**: The post said Typha sits between the Kubernetes API server "or etcd datastore" and Felix without caveat. Calico documentation says Typha can be used with etcd, but is redundant and not recommended with etcd v3. Updated the introduction to make the Kubernetes API datastore case explicit and add the etcd v3 caveat.

2. **`calicoctl` was listed as required but unused**: The post only uses `kubectl` commands. Changed the prerequisite to state that `calicoctl` is optional for direct Calico resource inspection.

3. **Replica guidance understated production recommendations**: The post showed 2-3 replicas and used a minimum of 2 in the capacity formula. Calico documentation recommends at least one Typha replica per 200 nodes, no more than 20 replicas, and a production minimum of three replicas. Updated the data-flow note and shell formula accordingly.

4. **Typha behavior overclaimed validation**: The post described "validation and filtering" by Typha. Official Typha docs emphasize caching datastore state, deduplicating events, and filtering irrelevant updates. Renamed the subsection and adjusted the explanation to match the documented behavior.

5. **Felix configuration command targeted an unlikely ConfigMap**: The command looked for a `ConfigMap` labeled `k8s-app=calico-node`, which is not the normal place to inspect Typha-related calico-node settings in operator-managed installs. Changed it to inspect the `calico-node` DaemonSet manifest.

6. **Affinity wording implied guaranteed anti-affinity**: The post said anti-affinity rules ensure Typha pods run on different nodes. Calico supports affinity configuration, but the exact placement rules are installation-specific. Changed the wording to document any affinity or anti-affinity rules that influence Typha placement.

7. **Metrics command implied metrics are always enabled**: Typha Prometheus metrics are configurable and default to disabled in the Typha configuration reference. Updated the verification comment to say to check the endpoint if metrics are enabled.

## Review Notes
- The `kubectl get`, `kubectl logs`, selector, `--tail`, `--no-headers`, and YAML output flags used in the examples match current Kubernetes CLI documentation.
- The post assumes an operator-managed Calico installation using the `calico-system` namespace. Manifest-based installations commonly use `kube-system`, so operators should adjust namespaces for their installation method.
- The Typha metrics endpoint port `9091` is correct when Prometheus metrics are enabled.
