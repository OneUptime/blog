# Validation Summary: How to Migrate Existing Workloads to Calico on Bare Metal with Containers

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Tigera Operator
- Kubernetes CNI
- Flannel
- BGP routing
- Bare metal networking

## Sources Consulted
- Calico Open Source 3.32 on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source installation customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico v3.27.0 `tigera-operator.yaml` manifest and CRD schema: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
- Calico v3.27.0 `custom-resources.yaml` manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
- Calico v3.32.0 `custom-resources.yaml` manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/custom-resources.yaml
- Kubernetes `kubectl cordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Flannel Kubernetes manifest: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

## Issues Found
- The Calico install commands pinned `v3.27.0`, which is outdated relative to the current Calico Open Source documentation. Updated the manifest URLs to `v3.32.0`.
- The current Calico operator install flow includes the `v1_crd_projectcalico_org.yaml` CRD bundle before applying `tigera-operator.yaml`. Added that command to match the official installation documentation.
- The `Installation` resource used `natOutgoing: true`, but the Tigera Operator `Installation` IP pool schema expects `Enabled` or `Disabled`. Changed it to `natOutgoing: Enabled`.
- The install snippet omitted the `APIServer` custom resource included in Calico's standard custom resources. Added the `APIServer` resource with `spec: {}`.
- The guide used `calicoctl node status` without listing `calicoctl` as a prerequisite. Added a prerequisite noting that `calicoctl` must be installed and configured for that verification command.
- The introduction claimed all pods would receive new IPs and all physical routes would change. Revised this to say pods recreated during the migration receive new IPs and the physical network must learn routes for the Calico pod CIDR.
- The introduction claimed bare-metal switch coordination is impossible in cloud environments. Revised this to a less absolute statement because cloud networking models vary by provider and configuration.

## Review Notes
The migration remains intentionally high level. In a production runbook, the old CNI cleanup steps should be customized for the exact source CNI, kubelet/container runtime paths, pod disruption budgets, unmanaged pods, and the target Calico routing design.
