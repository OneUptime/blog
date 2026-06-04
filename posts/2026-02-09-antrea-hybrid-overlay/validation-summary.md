# Validation Summary: How to use Antrea for hybrid overlay and no-encap modes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Antrea CNI
- Open vSwitch
- Antrea traffic encapsulation modes
- Antrea ClusterNetworkPolicy
- Antrea Flow Exporter and Flow Aggregator
- Prometheus metrics
- AWS and Google Cloud routing concepts

## Sources Consulted
- Antrea v1.14.0 NoEncap and Hybrid Traffic Modes: https://antrea.io/docs/v1.14.0/docs/noencap-hybrid-modes/
- Antrea v1.14.0 Configuration: https://antrea.io/docs/v1.14.0/docs/configuration/
- Antrea v1.14.0 release manifest: https://github.com/antrea-io/antrea/releases/download/v1.14.0/antrea.yml
- Antrea v1.14.0 Network Flow Visibility: https://antrea.io/docs/v1.14.0/docs/network-flow-visibility/
- Antrea v1.14.0 Antrea Network Policy: https://antrea.io/docs/v1.14.0/docs/antrea-network-policy/
- Antrea v1.14.0 OVS Hardware Offload: https://antrea.io/docs/v1.14.0/docs/ovs-offload/
- Antrea current Flow Aggregator manifest: https://raw.githubusercontent.com/antrea-io/antrea/main/build/yamls/flow-aggregator.yml

## Issues Found
- The hybrid-mode installation applied a standalone ConfigMap before applying `antrea.yml`, which would be overwritten by the release manifest. Changed the sequence to apply the manifest, patch `antrea-config`, and restart the Antrea Agent DaemonSet.
- Flow Exporter was enabled only with `flowExporter.enable`; in v1.14 the `FlowExporter` feature gate must also be enabled. Added `featureGates.FlowExporter: true` in relevant snippets.
- Flow Exporter timeout fields used incorrect names, `activeFlowTimeout` and `idleFlowTimeout`. Changed them to `activeFlowExportTimeout` and `idleFlowExportTimeout`, matching the v1.14 agent configuration.
- The Flow Aggregator address and namespace were inconsistent with Antrea manifests. Changed the collector address to `flow-aggregator/flow-aggregator:4739:tls` and logs command to use the `flow-aggregator` namespace.
- The OVS performance snippet included an unsupported `ovsBridges` field for primary Antrea bridge configuration. Removed it and kept the supported `ovsDatapathType: system` setting.
- The hardware offload section incorrectly suggested setting `ovsDatapathType: netdev`; Antrea v1.14 documents only `system` for the agent datapath type and requires SR-IOV switchdev, Multus, the SR-IOV device plugin, and starting OVS with `--hw-offload`. Replaced the misleading ConfigMap patch with an offload verification command and prerequisites note.
- The metrics commands used controller port `10349` and HTTP. Antrea Agent exposes its API and metrics on HTTPS port `10350` by default, so the port-forward and curl examples were corrected.
- The route test appended `.1` to the CIDR string after stripping the mask, producing invalid addresses like `10.244.1.0.1`. Replaced it with an `awk` command that pings the first address in the Pod CIDR.
- The hybrid-mode explanation implied same-subnet direct routing only needed the same L2 domain. Clarified that the node network must allow Pod IPs sent from nodes, as documented by Antrea.

## Review Notes
The post is version-specific to Antrea v1.14.0. Antrea-native policy API versions later moved to `crd.antrea.io/v1beta1`, but `v1alpha1` is still appropriate for the v1.14 examples reviewed here.
