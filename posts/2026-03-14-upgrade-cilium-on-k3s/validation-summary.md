# Validation Summary: Upgrading Cilium on K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- K3s
- Helm
- kubectl
- Cilium CLI

## Sources Consulted
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium Installation Using K3s: https://docs.cilium.io/en/stable/installation/k3s.html
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium stable releases list: https://github.com/cilium/cilium
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm rollback documentation: https://helm.sh/docs/helm/helm_rollback/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post recommended `helm upgrade --reuse-values` for a Cilium version upgrade. Cilium's official upgrade guide says not to use `--reuse-values` for minor upgrades because it can omit newly introduced chart values. I changed the commands to save and review values in a file and pass that file to `helm upgrade`.
- The upgrade commands did not include `upgradeCompatibility`, which Cilium recommends setting to the initial Cilium version installed in the cluster to minimize datapath disruption. I added `upgradeCompatibility` to the Helm command and values example.
- The example target version was `1.16.5`, which is no longer an active stable Cilium release as of the review date. I updated the examples to `1.19.3`, the current stable release shown in the official Cilium sources consulted.
- The preflight example did not account for kube-proxy-free clusters. Cilium requires `k8sServiceHost` and/or `k8sServicePort` for preflight generation in Kubernetes without kube-proxy mode, so I added those values to the preflight command.
- The preflight validation only waited on the DaemonSet, but the official process also checks the preflight Deployment. I added the Deployment rollout status check.
- The post labeled `cilium connectivity test` as the pre-flight check. I changed that wording to "connectivity check" because Cilium's preflight check is the separate preflight DaemonSet/Deployment.
- The service validation command used HTTP against `kubernetes.default.svc:443`. I changed it to use a curl container and HTTPS.
- The rollback command omitted the revision argument while the surrounding text instructed the reader to check Helm history. I changed the example to `helm rollback cilium REVISION -n kube-system`.
- The troubleshooting section stated that a default Cilium PDB named `cilium-agent` allows one pod to be unavailable and may block a single-node rollout. This does not match current Cilium chart defaults. I replaced it with checks for image pull errors, API connectivity issues, and invalid Helm values.
- The troubleshooting section stated that `updateStrategy.rollingUpdate.maxUnavailable` defaults to `1`. I removed the incorrect default claim and made the advice conditional.

## Review Notes
- The guide remains version-sensitive. Future updates should refresh the example target version and read the version-specific Cilium upgrade notes for the target minor release.
- The `k8sServiceHost` and `k8sServicePort` placeholders must be replaced with the actual Kubernetes API endpoint when running K3s without kube-proxy.
