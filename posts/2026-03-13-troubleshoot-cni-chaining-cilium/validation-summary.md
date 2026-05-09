# Validation Summary: Troubleshoot CNI Chaining with Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CNI chaining
- AWS VPC CNI
- Helm
- eBPF observability and policy enforcement

## Sources Consulted
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium generic veth chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-generic-veth/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- AWS EKS networking best practices for CNI configuration ordering: https://docs.aws.amazon.com/eks/latest/best-practices/networking.html
- AWS EKS Amazon VPC CNI documentation: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html

## Issues Found
- The post instructed readers to inspect `/etc/cni/net.d/05-cilium.conflist` for AWS VPC CNI chaining. Updated the example to inspect `/etc/cni/net.d/10-aws.conflist`, which is the common AWS VPC CNI conflist that Cilium chains into.
- The AWS chaining Helm example used only `--set tunnel=disabled`. Updated it to the current documented values: `cni.chainingMode=aws-cni`, `cni.exclusive=false`, `enableIPv4Masquerade=false`, and `routingMode=native`.
- The ConfigMap inspection command only searched for `tunnel`. Updated it to include `routing-mode` because current Cilium Helm values use `routingMode=native`.
- The local Cilium agent commands used `cilium endpoint list` and `cilium status` inside the DaemonSet. Updated them to `cilium-dbg endpoint list` and `cilium-dbg status`, matching the current Cilium agent command reference.
- The best-practice note referenced `cilium monitor`. Updated it to `cilium-dbg monitor --type drop`, matching current troubleshooting documentation.
- The AWS VPC CNI example used an older CNI version and an unnecessary `name` field on the Cilium plugin entry. Updated the example to CNI spec `1.0.0` and kept the chained Cilium plugin entry focused on `type: cilium-cni`.

## Review Notes
The post is technically relevant and accurate after the corrections. Some chained deployments may still use older `tunnel: disabled` values or older AWS VPC CNI conflist CNI versions, but the reviewed post now reflects current Cilium documentation while remaining applicable to common EKS troubleshooting.
