# Validation Summary: How to Use DaemonSets for Network Plugin Agents like Calico or Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes Container Network Interface (CNI)
- Calico
- Cilium
- Flannel
- Prometheus alerting rules

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes network plugin documentation: https://kubernetes.io/docs/concepts/cluster-administration/network-plugins/
- CNI specification: https://www.cni.dev/docs/spec/
- Calico Kubernetes installation and manifests: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises and https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico kube-controllers Prometheus metrics: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium system requirements and configuration documentation: https://docs.cilium.io/en/stable/operations/system_requirements/ and https://docs.cilium.io/en/stable/configuration/
- Flannel official repository and manifest: https://github.com/flannel-io/flannel and https://raw.githubusercontent.com/flannel-io/flannel/v0.27.4/Documentation/kube-flannel.yml
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post described CNI plugins as always privileged DaemonSets and implied all of them provide service mesh or service load balancing. I narrowed the wording because Kubernetes requires CNI plugins for networking, but privilege level and advanced datapath features vary by plugin.
- The examples could be read as complete install manifests, but each snippet depends on additional upstream resources such as CRDs, ConfigMaps, service accounts, RBAC, and controllers/operators. I added prerequisite notes before the Calico, Cilium, and Flannel snippets.
- The Calico, Cilium, and Flannel image tags were stale. I updated them to current upstream release tags available in the official documentation/manifests: Calico v3.32.0, Cilium v1.19.4, and Flannel v0.27.4.
- The Prometheus rules used Calico metric names that are not documented in the current Calico metric references. I replaced them with documented `felix_int_dataplane_failures` and `ipam_allocations_borrowed` metrics.
- The best-practices section said CNI failures prevent pod scheduling. Scheduling can still occur, but CNI failures commonly prevent pod sandboxes from starting. I corrected that wording.

## Review Notes
The DaemonSet snippets are still illustrative excerpts, not complete installation manifests. For production installs, the official Calico manifest/operator, Cilium Helm chart or CLI, and Flannel release manifest should be preferred so RBAC, CRDs, ConfigMaps, and version-specific defaults stay consistent.
