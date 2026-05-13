# Validation Summary: Document Calico VPP Uplink Configuration for Operators

## Status
validated

## Post Type
Operational guide / documentation reference

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP
- DPDK
- Linux network interface binding
- vfio-pci / IOMMU

## Sources Consulted
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP getting started and `CALICOVPP_INTERFACES` specification: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP generated manifest labels and container names: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `crictl` node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- DPDK `dpdk-devbind` documentation: https://doc.dpdk.org/guides/tools/devbind.html
- VPP `show hardware-interfaces` command reference: https://my-vpp-docs.readthedocs.io/en/latest/reference/cmdreference/interface/hardware.html

## Issues Found
- The `CALICOVPP_INTERFACES` example used field names that do not match the current Calico VPP `UplinkInterfaceSpec`. Changed `numRxQueues`, `numTxQueues`, `rxQueueSize`, `txQueueSize`, and `newDriverName` to `rx`, `tx`, `rxqsz`, `txqsz`, and `newDriver`.
- The ConfigMap example represented `CALICOVPP_INTERFACES` as a nested YAML object. Updated it to a ConfigMap string value using a block scalar with the JSON-style structure shown in the official Calico VPP documentation.
- The restart command selected pods with `app=calico-vpp-node`, but the official Calico VPP manifest uses `k8s-app=calico-vpp-node`. Updated the selector.
- The VPP verification command used `ds/calico-vpp-node`, which may exec into a pod on a different node. Updated it to select the `calico-vpp-node` pod on the target node using `spec.nodeName`.
- The recovery procedure used `systemctl stop vpp`, but the standard Calico VPP deployment runs VPP inside the `calico-vpp-node` pod, not as a host `vpp` systemd service. Updated the recovery step to stop kubelet and the local VPP container with `crictl`.
- Several nested Markdown code fences were malformed. Updated the affected outer fences so the embedded YAML examples render correctly.

## Review Notes
The post is technically relevant and useful as an operational documentation guide. Queue counts, queue sizes, and recovery driver names remain environment-specific examples and should be validated against each deployment's NIC, kernel driver, and performance testing results.
