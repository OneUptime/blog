# Validation Summary: How to Fix Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes CNI
- Kubernetes RBAC
- Linux kernel modules
- etcd datastore configuration
- kubectl

## Sources Consulted
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Calico datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico on-premises etcd datastore installation notes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico v3.27.0 Kubernetes manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post described missing `ipip`, `xt_set`, and `nf_conntrack` modules as fixed module names. Calico documents the requirement more generally as IP-in-IP support when that mode is used, IP sets support, and netfilter conntrack support, with module names varying by distribution and kernel. Updated the root cause wording to avoid over-specific module naming.
- The module persistence example appended to `/etc/modules`, which is not portable across common Linux distributions. Updated it to write `/etc/modules-load.d/calico.conf`, which matches systemd modules-load behavior.
- The RBAC patch example added a broad core API rule that did not match the Calico v3.27.0 manifest and could still leave other required permissions missing. Updated the text to recommend reapplying the matching Calico manifest and changed the example patch to the official v3.27.0 EndpointSlice rule.
- The datastore endpoint fix implied `etcd_endpoints` exists for all Calico installations. Calico v3.27.0's standard manifest uses the Kubernetes API datastore, while `etcd_endpoints` applies to etcd datastore installs. Added that caveat to the root cause and fix.
- The single-node reset wait command selected all `calico-node` pods instead of only the replacement pod on the affected node. Added `NODE_NAME` and `--field-selector spec.nodeName=$NODE_NAME`, which is supported for Pods.
- The cordon comment overstated disruption prevention. Updated it to say cordoning prevents new workloads while node networking restarts.

## Review Notes
The guide is technically relevant and remains valid after the corrections. Future improvements could include reminding readers to use the Calico manifest version that exactly matches their installed release and to confirm whether their cluster uses the Kubernetes API datastore or etcd before patching `calico-config`.
