# Validation Summary: How to Migrate Existing Workloads to Calico on On-Prem Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Calico
- Flannel
- Canal
- Kubernetes CNI
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico documentation: Migrate a Kubernetes cluster from flannel/Canal to Calico, https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel
- Calico documentation: Installing on on-premises deployments, https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Kubernetes documentation: Safely Drain a Node, https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes documentation: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Project Calico v3.27.0 flannel migration manifests, https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/flannel-migration/calico.yaml and https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/flannel-migration/migration-job.yaml

## Issues Found
- The post described a generic migration from "Flannel or similar CNI plugins." Calico documents the in-place migration path specifically for Flannel/Canal with the VXLAN backend, so the scope was narrowed to that supported migration case.
- The original prerequisites allowed any non-Calico CNI. This was corrected to the documented Flannel v0.9.1 or later / Canal v3.7.0 or later VXLAN requirements.
- The original procedure instructed readers to cordon all nodes, delete the existing Flannel DaemonSet, and remove CNI files manually. Calico's documented migration uses the flannel migration controller and explicitly performs a rolling node migration, so the manual deletion flow was replaced with preparation and verification commands.
- The original Calico install used the Tigera operator and an `Installation` resource with `encapsulation: None`. That is not the documented Flannel/Canal migration path and would not provide the VXLAN migration behavior described by Calico. The install commands were changed to the v3.27.0 `flannel-migration/calico.yaml` and `migration-job.yaml` manifests.
- The original node-by-node workload restart used `kubectl delete pods -A --field-selector spec.nodeName=<node-1>`. Although `spec.nodeName` is a valid Pod field selector, deleting pods directly is not the documented or safest migration mechanism. It was replaced with migration job monitoring commands.
- The original verification used `calicoctl ipam show` without listing `calicoctl` as a prerequisite. It was replaced with `kubectl get ippools.crd.projectcalico.org` and Calico pod checks that work through Kubernetes resources.
- The NetworkPolicy section implied policies apply as-is without explaining the dependency. It now states that Kubernetes NetworkPolicy resources apply because Calico supports the Kubernetes NetworkPolicy API.

## Review Notes
The guide now tracks the supported Calico v3.27.0 Flannel/Canal migration manifests. Future updates should revisit the pinned Calico version and consider moving to the latest supported Calico release after testing the migration path for the target Kubernetes version.
