# Validation Summary: How to Check Kubernetes Compatibility Before a vCluster Upgrade

## Status
validated

## Post Type
Technical guide / Upgrade compatibility checklist

## Technologies Covered
- vCluster 0.36
- Kubernetes 1.33 through 1.36
- Kubernetes version-skew policy
- vCluster shared nodes and private nodes
- `vcluster`, `kubectl`, and Helm CLIs
- `vcluster.yaml` Kubernetes distribution configuration
- Kubernetes API health endpoints, CRDs, admission webhooks, storage, and Gateway API
- vCluster resource synchronization and sync patches

## Sources Consulted
- [vCluster lifecycle policy and Kubernetes compatibility matrix](https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions) - verified the v0.36 lifecycle dates, Kubernetes 1.33-1.36 matrix axes, cell meanings, and documented version-skew footnote.
- [vCluster Kubernetes distribution configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/distro/k8s) - verified the `controlPlane.distro.k8s.image` fields, `v1.36.0` default, and deprecation of `controlPlane.distro.k8s.version`.
- [vCluster `vcluster connect` CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_connect) and [access guide](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster) - verified `--namespace`, `--print`, and kubeconfig redirection.
- [vCluster upgrade guide](https://www.vcluster.com/docs/vcluster/manage/upgrade/upgrade-version) - verified that vCluster software upgrades should proceed one minor version at a time.
- [vCluster Ready=False troubleshooting guide](https://www.vcluster.com/docs/vcluster/troubleshoot/pod-stuck-ready-false-version-skew) - verified the affected Kubernetes version combination, readiness symptoms, causes, log signature, and documented mitigation.
- [vCluster fix PR #4037](https://github.com/loft-sh/vcluster/pull/4037), [v0.36 backport PR #4121](https://github.com/loft-sh/vcluster/pull/4121), [v0.36 regression-test backport PR #4125](https://github.com/loft-sh/vcluster/pull/4125), and [v0.36.1 release](https://github.com/loft-sh/vcluster/releases/tag/v0.36.1) - verified that the Ready=False fix is present in v0.36.1 despite the troubleshooting and matrix pages still describing it as unresolved.
- [vCluster private-node configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/private-nodes/) and [private-node management](https://www.vcluster.com/docs/vcluster/deploy/worker-nodes/private-nodes/manage) - verified that resource syncing is unavailable with private nodes, automatic upgrades default to enabled with concurrency one, and the documented automatic path cordons but does not drain nodes.
- [vCluster node sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/nodes), [RuntimeClass sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/runtime-classes), [PriorityClass sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/priority-classes), [Secret sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/secrets), and [Gateway sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/gateways) - verified pseudo/synced node behavior and the available selector or mapping mechanisms.
- [vCluster custom-resource sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/custom-resources) and [sync patching](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching) - verified storage-version conversion and reference patches.
- [Kubernetes version-skew policy](https://kubernetes.io/releases/version-skew-policy/) - verified kube-apiserver, kubelet, HA control-plane, kubectl, upgrade-order, and pre-upgrade drain requirements.
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/) - verified the quoted `kubectl get --raw='/readyz?verbose'` command.
- [Kubernetes `kubectl version`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/), [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) references - verified output, raw URI, custom-column, namespace, duration, and container-selection options.
- [Helm `list` reference](https://helm.sh/docs/helm/helm_list/) - verified namespace-scoped release inspection.
- The official vCluster 0.36.0 and 0.36.1 Helm charts from the [vCluster chart repository](https://charts.loft.sh) - rendered locally to verify that the distro image is on the `kubernetes` init container and the running vCluster container is named `syncer`.

## Issues Found
1. **Ready=False fix status was outdated** - The post treated the Kubernetes 1.33-or-earlier tenant / 1.34-or-later control-plane-cluster issue as unresolved across vCluster 0.36. The fix was merged, backported to the v0.36 branch, and included in v0.36.1 on August 3, 2026. Updated the post to recommend v0.36.1 or later, retain the Kubernetes 1.34-or-later tenant mitigation only for affected older builds, scope the issue to shared-node syncing, and advise checking patch release history as well as the lifecycle matrix.
2. **The Pod image command inspected the wrong field** - The v0.36 chart places `ghcr.io/loft-sh/kubernetes` on the `kubernetes` init container, while `.spec.containers[*].image` reports the `syncer` image. Changed the JSONPath to select `.spec.initContainers[?(@.name=="kubernetes")].image`.
3. **The readiness URI was unquoted** - An unquoted `?` is subject to shell glob expansion and fails under shells such as zsh. Changed the command to the officially documented `--raw='/readyz?verbose'` form.
4. **Shared-node synchronization checks were presented as applicable to private nodes** - Private-node vClusters do not sync resources to the control plane cluster. Scoped resource-sync tests and the Ready=False log signature to shared-node vClusters, and changed the pre-production comparison and conclusion so private-node validation focuses on tenant node and workload state.
5. **Private-node automatic-upgrade behavior was ambiguous** - The post mentioned PDBs and drain behavior without stating that the documented automatic path only cordons, upgrades in place, and uncordons the node. Clarified that it does not drain workloads and that upstream Kubernetes requires draining before a minor kubelet upgrade, so minor upgrades need a coordinated drain-based workflow.
6. **Secret selection terminology was inaccurate** - From-host Secret sync uses `mappings.byName`, not a label selector. Replaced the generic selector list with the correct resource-kind names and distinguished Secret mappings.
7. **The syncer log command could be ambiguous in a multi-container Pod** - Added `-c syncer` so the diagnostic always reads the vCluster syncer logs when plugins or sidecars are present.

## Review Notes
- As of August 21, 2026, the vCluster lifecycle matrix and Ready=False troubleshooting page still show the issue as current even though the official v0.36 branch history and v0.36.1 tag contain the fix. Both documentation and patch history should be checked until those pages are updated.
- The v0.36 lifecycle matrix covers vanilla Kubernetes 1.33 through 1.36. Only same-version diagonal cells are officially tested; other cells can be merely likely compatible or carry documented limitations.
- With shared nodes, tenant-visible nodes can be pseudo nodes unless real node syncing is enabled. The control-plane-cluster query remains the authoritative source for actual host kubelet versions. With private nodes, the tenant query reports the real worker kubelets.
- All external links in the post returned HTTP 200 and resolved to the intended official documentation pages during validation.
