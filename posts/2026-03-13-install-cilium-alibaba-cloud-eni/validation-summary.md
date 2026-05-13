# Validation Summary: Install Cilium on Alibaba Cloud with ENI

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Cilium
- Kubernetes
- Alibaba Cloud ACK and ECS
- Alibaba Cloud ENI
- Helm
- Hubble
- CiliumNetworkPolicy

## Sources Consulted
- Cilium documentation: Setting up Cilium in AlibabaCloud ENI mode, https://docs.cilium.io/en/latest/installation/alibabacloud-eni/
- Cilium Helm values reference, https://docs.cilium.io/en/stable/helm-values/
- Cilium operator AlibabaCloud command reference, https://docs.cilium.io/en/stable/cmdref/cilium-operator-alibabacloud/
- Cilium AWS ENI IPAM documentation, used to distinguish AWS-only `eni` settings from AlibabaCloud settings, https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Alibaba Cloud ACK network overview, https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/network/
- Alibaba Cloud ACK Terway documentation, https://www.alibabacloud.com/help/en/ack/product-overview/terway

## Issues Found
- The post described ACK as creating a cluster directly with a Cilium add-on and showed an `aliyun cs POST /clusters` body using an unsupported `cilium` add-on. Replaced this with the documented Cilium flow for ACK: remove the existing ACK CNI DaemonSet before installing Cilium.
- The Cilium Helm values used AWS ENI configuration (`ipam.mode: eni`, `eni.enabled`, and `eni.awsEnablePrefixDelegation`) for Alibaba Cloud. Changed these to AlibabaCloud-specific settings: `ipam.mode: alibabacloud` and `alibabacloud.enabled: true`.
- The install steps omitted the required `cilium-alibabacloud` Kubernetes Secret for Alibaba Cloud API credentials. Added the documented secret manifest and apply command.
- The values file used `bpf.hostRouting`, which is not the documented current Helm setting for this installation path. Replaced the routing configuration with `routingMode: native` and `enableIPv4Masquerade: false`, matching Cilium's AlibabaCloud ENI installation documentation.
- Updated the Cilium Helm chart version from `1.15.0` to current stable `1.19.3` as reflected in the Cilium stable documentation consulted during review.
- Removed `cilium hubble enable` from the verification step because Hubble is already enabled via Helm values in the post.
- Replaced `kubectl exec ... ip link show` as an ENI verification command with `kubectl get ciliumnodes.cilium.io -o wide`, which better matches how Cilium exposes ENI/IPAM allocation state.

## Review Notes
The corrected guide is still a concise example. Real ACK clusters may need extra care when replacing the ACK CNI, especially managed clusters originally created with Flannel because ACK cloud-controller-manager route management can conflict with Cilium's expected networking model.
