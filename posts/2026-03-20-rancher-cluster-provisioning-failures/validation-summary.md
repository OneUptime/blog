# Validation Summary: How to Troubleshoot Cluster Provisioning Failures in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- RKE2
- K3s
- Kubernetes
- AWS EC2
- AWS IAM / AWS CLI
- VMware vSphere
- `kubectl`

## Sources Consulted
- Rancher logging docs: https://ranchermanager.docs.rancher.com/v2.11/troubleshooting/other-troubleshooting-tips/logging
- Rancher Cluster API overview (Latest): https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview
- Rancher Fleet overview (Latest): https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher EC2 cluster provisioning guide: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-amazon-ec2-cluster
- Rancher node cleanup guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/clean-cluster-nodes
- RKE2 logging reference: https://docs.rke2.io/reference/logging
- RKE2 requirements: https://docs.rke2.io/install/requirements
- RKE2 token management: https://docs.rke2.io/security/token
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- AWS CLI `simulate-principal-policy` reference: https://docs.aws.amazon.com/cli/v1/reference/iam/simulate-principal-policy.html

## Issues Found
- The post treated `cattle-provisioning-capi-system` as the universal provisioning-controller location. I corrected this to be version-aware because Rancher `v2.14+` uses Rancher Turtles and CAPI controllers instead of the removed embedded `rancher-provisioning-capi` component.
- Several commands hardcoded the provisioning namespace as `fleet-default`. I replaced these with `<cluster-namespace>` because Rancher workspaces are not universally `fleet-default`.
- The RKE2 resource guidance stated a minimum of `20 GB` disk as if it were an official minimum. I corrected this to the documented `2 vCPU / 4 GB RAM` minimum and changed the disk note to the documented SSD/performance guidance.
- The node bootstrap section described the kubelet log as an “agent registration log” and only showed `journalctl` for `rke2-server`. I corrected the wording and added the matching `rke2-agent` log command.
- The port-conflict section only checked TCP ports and suggested `which kubectl` as evidence of a conflicting Kubernetes install. I updated it to check TCP and UDP ports relevant to RKE2/Flannel and replaced the binary check with a service check that aligns better with Rancher’s node-reuse guidance.
- The AWS and vSphere sections assumed fixed secret names like `aws-creds` and `vsphere-creds`. I changed them to use the cluster’s `cloudCredentialSecretName` reference, which matches Rancher’s actual cloud-credential model.
- The AWS IAM example was too narrow for the text around it. I revised it to use a generic principal ARN and actions that better match Rancher’s documented EC2 provisioning policy examples, including `iam:PassRole`.
- The machine-event troubleshooting example used `grep` instead of the supported event field selectors. I updated it to use `involvedObject.name` directly via `--field-selector`.

## Review Notes
- The post is now technically sound as a Rancher provisioning troubleshooting guide after the fixes above.
- Rancher provisioning internals are version-sensitive. In particular, Rancher `v2.14+` replaced the older embedded CAPI provisioning component with Rancher Turtles/CAPI Operator-based integration, so any future edits should preserve that version distinction.
- The AWS and vSphere examples are now aligned with Rancher-managed cloud credentials for node-driver-based provisioning. Native CAPI provider workflows in newer Rancher releases use different identity objects and can require different troubleshooting steps.
