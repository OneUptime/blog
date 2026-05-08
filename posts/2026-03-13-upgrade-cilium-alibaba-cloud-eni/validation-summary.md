# Validation Summary: Upgrade Cilium on Alibaba Cloud ENI

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Kubernetes
- Alibaba Cloud ACK
- Alibaba Cloud ECS ENI
- Alibaba Cloud CLI
- Helm
- jq

## Sources Consulted
- Cilium AlibabaCloud ENI installation documentation: https://docs.cilium.io/en/latest/installation/alibabacloud-eni/
- Cilium upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium cilium-operator-alibabacloud command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator-alibabacloud/
- CiliumNode API Go documentation: https://pkg.go.dev/github.com/cilium/cilium/pkg/k8s/apis/cilium.io/v2
- Alibaba Cloud ECS DescribeInstanceTypes API documentation: https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-describeinstancetypes

## Issues Found
- The introduction said AlibabaCloud ENI mode directly attaches VPC ENIs to pods. Cilium's AlibabaCloud ENI mode uses ENIs attached to ECS nodes and exposes available pod IPs through CiliumNode IPAM state, so the wording was corrected.
- The upgrade section said to use the Cilium CLI but showed Helm commands. The section now says Helm.
- The upgrade commands used `--reuse-values` for a Cilium version upgrade. Cilium's upgrade guide warns not to use `--reuse-values` for minor-version upgrades because it can omit newly introduced chart values. The commands now save existing values with `helm get values`, tell the reader to review them against the target upgrade notes, and pass the reviewed values file with `-f old-values.yaml`.
- The upgrade example hard-coded `1.15.0`, which is an old initial patch release. The example now uses a `TARGET_VERSION` variable set to the current stable documentation version checked during review and notes that upgrades should move one minor version at a time using current patch releases.
- The post used `cilium status --verbose | grep -i eni` as ENI validation. This is not a reliable way to validate AlibabaCloud ENI allocation state. It was replaced with a CiliumNode query that checks available IPs, used IPs, and `status["alibaba-cloud"].enis`.
- The prerequisites omitted Helm even though the upgrade flow uses Helm, and omitted that `helm diff` requires the diff plugin. The prerequisite list now includes both.

## Review Notes
The Alibaba Cloud ECS `DescribeInstanceTypes` fields used in the post, including `EniQuantity` and `EniPrivateIpAddressQuantity`, match Alibaba Cloud's API documentation. The guide remains version-sensitive: readers must choose the target Cilium version from the official upgrade guide for their installed version and review the version-specific notes before applying the commands.
