# Validation Summary: How to Collect Rancher Support Bundles

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- SUSE Rancher Manager
- Kubernetes
- `kubectl`
- Rancher support tooling

## Sources Consulted
- SUSE Rancher Manager docs, `Supportconfig Bundle`: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/hosted-kubernetes/cloud-marketplace/supportconfig.html
- Rancher `support-tools` repository: https://github.com/rancherlabs/support-tools
- Official Rancher 2.x logs collector script: https://raw.githubusercontent.com/rancherlabs/support-tools/master/collection/rancher/v2.x/logs-collector/rancher2_logs_collector.sh
- `rancher/support-bundle-kit` upstream repository: https://github.com/rancher/support-bundle-kit
- Latest `support-bundle-kit` release assets: https://github.com/rancher/support-bundle-kit/releases/tag/v0.0.83
- SUSE Rancher Manager docs, registered cluster troubleshooting: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/cluster-deployment/register-existing-clusters-troubleshooting.html
- SUSE Rancher Manager docs, Kubernetes resources troubleshooting: https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/troubleshooting/other-troubleshooting-tips/kubernetes-resources.html
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/

## Issues Found
- The UI instructions were not aligned with the official Rancher Manager docs. The post originally described a generic `Download Support Bundle` flow, but the documented Rancher UI path is `☰ → Get Support → Generate Support Config` for the CSP adapter `supportconfig` integration. I corrected the steps and added the required CSP adapter caveat.
- The `support-bundle-kit` CLI example was incorrect. Upstream `support-bundle-kit` documents `manager` and `simulator` commands, not `collect`, and the latest release ships tarball assets rather than the raw binary path used in the post. I replaced that section with Rancher's official `rancher2_logs_collector.sh` workflow from the `support-tools` repository.
- The bundle contents section claimed details that were not consistently supported across the documented collection methods, including Helm release history and implied redaction behavior. I narrowed that section to the items that are actually supported by the verified workflows.
- The manual and downstream collection examples were too loose around sensitive data and cluster variance. I removed raw Secret collection from the downstream example, added a missing-namespace guard in the manual script, switched the event sort key to `metadata.creationTimestamp`, and added a note plus a non-fatal command path for `cattle-node-agent`, which is only present on Rancher-created RKE clusters.
- The Rancher version command used an ambiguous short resource name. I changed it to the explicit `settings.management.cattle.io server-version` form.

## Review Notes
- The Rancher UI workflow in this post is specifically the `supportconfig` integration documented for environments with the CSP adapter installed; it is not a universal Rancher Manager support-bundle UI for every installation.
- The `support-tools` repository explicitly recommends using its scripts with Rancher Support guidance.
- Manual `kubectl` collection can still capture sensitive configuration data. Review archives before sharing them outside your environment.
