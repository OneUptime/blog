# Validation Summary: How to Avoid Common Mistakes with Calico on OpenShift Upgrades

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Calico (Calico Enterprise)
- OpenShift Container Platform (OCP)
- Kubernetes
- `oc` CLI
- SecurityContextConstraints (SCC)
- MachineConfigPools (MCP)
- ClusterVersion operator

## Sources Consulted
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- OKD SecurityContextConstraints API reference: https://docs.okd.io/latest/rest_api/security_apis/securitycontextconstraints-security-openshift-io-v1.html
- Tigera Calico Enterprise OpenShift requirements: https://docs.tigera.io/calico-enterprise/latest/getting-started/openshift/requirements
- OpenShift `oc` CLI documentation (api-resources, get, MachineConfigPool, ClusterVersion)

## Issues Found
- **Invalid `oc` flag**: The post used `oc get scc --show-api-group`, but `--show-api-group` is not a valid flag for `oc get` or `kubectl get`. Valid `--show-*` flags are `--show-kind`, `--show-labels`, and `--show-managed-fields`. Replaced with `oc api-resources --api-group=security.openshift.io`, which correctly displays the SCC resource's API group/version information.

## Review Notes
- The `oc get clusterversion -o jsonpath='{.items[0].status.conditions[?(@.type=="Progressing")].status}'` command is valid; when no resource name is given, `oc get` returns a List object whose `items[0]` references the singleton `version` ClusterVersion. An equivalent, slightly more idiomatic form would be `oc get clusterversion version -o jsonpath='{.status.conditions[?(@.type=="Progressing")].status}'`.
- `oc get mcp` correctly displays UPDATED/UPDATING columns for MachineConfigPools.
- The Tigera Calico Enterprise OpenShift requirements URL pattern is plausible and consistent with Tigera's current docs site layout.
- The `diff <(oc get scc calico-node -o yaml) <(grep -A100 "name: calico-node" ...)` approach is fragile (line counts vary), but it works for a quick diff. A more robust approach would be `yq` or splitting the pre-upgrade YAML by document.
