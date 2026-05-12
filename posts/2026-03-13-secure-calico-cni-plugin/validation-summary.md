# Validation Summary: Secure Calico CNI Plugin

## Status
validated

## Post Type
Guide / Security hardening tutorial

## Technologies Covered
- Calico CNI plugin
- Kubernetes RBAC (ClusterRole)
- CNI configuration files (`/etc/cni/net.d/`)
- Calico IPAM CRDs (`crd.projectcalico.org`): `ippools`, `ipamblocks`, `ipamhandles`, `ipamconfigs`, `blockaffinities`, `clusterinformations`, `ipreservations`
- Calico IPPool resource with `namespaceSelector`
- Kyverno ClusterPolicy
- `kubectl debug node/...` for node-level inspection
- `sha256sum` for file integrity monitoring
- Calico CNI plugin logging (`log_level`, `log_file_path`)

## Sources Consulted
- Calico upstream manifest (calico-cni-plugin ClusterRole): https://raw.githubusercontent.com/projectcalico/calico/master/manifests/calico.yaml
- Calico docs on CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico docs on IP pool selectors: https://docs.tigera.io/calico/latest/networking/ipam/ip-pools
- Kyverno validate pattern reference (negation/logical operators): https://kyverno.io/docs/policy-types/cluster-policy/validate/
- `kubectl debug node/...` reference (kubectl 1.30+): https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
1. **Calico CNI ClusterRole apiGroups and resources were inaccurate.**
   - The post used `apiGroups: ["projectcalico.org"]` for IPAM resources and included a separate `workloadendpoints` rule. The upstream `calico-cni-plugin` ClusterRole does not grant access to `workloadendpoints` (in KDD mode, WorkloadEndpoints are derived from Pod objects). It also uses `crd.projectcalico.org` for direct CRD access and includes additional resources (`blockaffinities`, `clusterinformations`, `ipreservations`) plus a `pods/status: patch` permission used by the plugin to annotate pods.
   - **Fix:** Rewrote the ClusterRole rules to match the upstream `calico-cni-plugin` ClusterRole: pods/nodes/namespaces (get), pods/status (patch), and `crd.projectcalico.org` resources (`blockaffinities`, `ipamblocks`, `ipamhandles`, `ipamconfigs`, `clusterinformations`, `ippools`, `ipreservations`) with get/list/create/update/delete. Removed the incorrect `workloadendpoints` rule.

2. **Kyverno pattern `hostNetwork: "false | null"` is not valid Kyverno syntax.**
   - Kyverno scalar patterns do not support `|` as a logical OR between literal values. The correct way to disallow `hostNetwork: true` (while permitting `false` or an absent field) is the negation operator `!true`.
   - **Fix:** Changed `hostNetwork: "false | null"` to `hostNetwork: "!true"`.

## Review Notes
- The IPPool example uses `apiVersion: projectcalico.org/v3`, which is correct when applied via `calicoctl` or the Calico Operator-managed aggregated API server. If users apply IPPool YAML directly via `kubectl` to the underlying CRDs they would instead use `crd.projectcalico.org/v1`; both forms are valid in different workflows.
- The `kubectl debug node/...` form with `/host/...` paths is correct for kubectl 1.30+; older clusters may not support node debugging via this command and would need an alternative such as `nsenter` from a privileged pod.
- The Calico CNI config snippet only shows `log_level` and `log_file_path`. Other relevant fields (`log_file_max_size`, `log_file_max_age`, `log_file_max_count`) exist but were not necessary to add since the post is illustrative.
- `chmod 644` and `chown root:root` are the conventional permissions for CNI config files and match the defaults used by Calico installers.
