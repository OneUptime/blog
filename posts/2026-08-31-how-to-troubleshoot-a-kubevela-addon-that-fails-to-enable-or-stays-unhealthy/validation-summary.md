# Validation Summary: How to Troubleshoot a KubeVela Addon That Fails to Enable or Stays Unhealthy

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- KubeVela CLI and addon lifecycle
- Kubernetes and `kubectl`
- KubeVela Applications, workflows, Definitions, and CUE templates
- Helm and Git addon registries
- Kubernetes CRDs, RBAC, admission webhooks, events, and workload health
- KubeVela multi-cluster delivery and air-gapped installation

## Sources Consulted

- [KubeVela: `vela addon enable`](https://kubevela.io/docs/cli/vela_addon_enable/)
- [KubeVela: `vela addon status`](https://kubevela.io/docs/cli/vela_addon_status/)
- [KubeVela: `vela addon list`](https://kubevela.io/docs/cli/vela_addon_list/)
- [KubeVela: addon registry commands](https://kubevela.io/docs/cli/vela_addon_registry/)
- [KubeVela: addon structure and `metadata.yaml`](https://kubevela.io/docs/platform-engineers/addon/intro/)
- [KubeVela: CUE-based addon Applications](https://kubevela.io/docs/platform-engineers/addon/addon-cue/)
- [KubeVela: registry migration from older releases](https://kubevela.io/docs/platform-engineers/system-operation/migration-from-old-version/)
- [KubeVela: air-gapped addon installation](https://kubevela.io/docs/platform-engineers/system-operation/enable-addon-offline/)
- [KubeVela: `vela addon disable`](https://kubevela.io/docs/cli/vela_addon_disable/)
- [KubeVela: `vela status`](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela: `vela def get`](https://kubevela.io/docs/cli/vela_def_get/)
- [KubeVela: `vela show`](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela: managed-cluster list and probe commands](https://kubevela.io/docs/cli/vela_cluster/)
- [KubeVela upstream source: addon CLI enable, status, and wait logic](https://github.com/kubevela/kubevela/blob/release-1.11/references/cli/addon.go)
- [KubeVela upstream source: addon validation, rendering, dependency, and dry-run ordering](https://github.com/kubevela/kubevela/blob/release-1.11/pkg/addon/addon.go)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: Event API (`events.k8s.io/v1`)](https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/)
- [Kubernetes: deprecated API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes: resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes: garbage collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)

## Issues Found

- The introduction treated enable failure and unhealthy status as strictly separate stages. The CLI waits for the addon Application to become healthy/running, so a runtime health failure can also make `vela addon enable` fail or time out. The text now distinguishes failures by whether an addon Application exists.
- The discovery section implied that any error before Application creation was usually a registry problem. Compatibility checks, dependency resolution, rendering, and definition-conflict detection also occur before Application creation. The text now limits that diagnosis to listing and fetching failures.
- The compatibility section implied that verbose addon status exposes `system.vela` and `system.kubernetes` constraints. It does not; those constraints must be read from addon metadata. The status command is now described only as a source for installed version, registry, clusters, dependencies, and parameters.
- The dry-run discussion could imply that referenced Helm charts are expanded. Addon dry-run emits the rendered Application and addon auxiliary objects, but not every resource inside a referenced chart. The post now directs readers to render referenced charts separately for full inspection.
- The event command sorted on the legacy `lastTimestamp` field. It now uses the current, reliable `.metadata.creationTimestamp` key.
- Resource quota was incorrectly grouped with scheduler failures. Quota violations are API/admission rejections, so quota was moved to that category and the scheduling category now names node-selector/architecture mismatch explicitly.
- `vela def get` and `vela show` were presented as a source-versus-installed comparison, but both inspect cluster-side information: the former retrieves the installed definition and the latter renders its reference documentation. The post now tells readers to compare addon source or dry-run output with the installed definition, and explicitly selects `vela-system` for `vela show`.
- The multi-cluster wording did not distinguish addon template types. The post now explains that `deployTo.runtimeCluster` drives placement for YAML templates, while CUE templates must render the `clusters` value into a topology policy.
- Finalizers were described as objects to delete, although they are metadata entries that can be manually removed. The recovery warning now uses correct terminology and explains the normal addon-disable dependency check, its `--force` bypass, and subsequent garbage collection.
- The air-gapped procedure incorrectly made a private addon registry mandatory. Official KubeVela guidance also supports enabling a modified addon from a local directory, so the post now presents a private addon registry as optional while retaining the private image/chart registry requirements.

## Review Notes

All remaining KubeVela and `kubectl` command names and flags were verified as current, including registry-qualified addon names, `--dry-run`, `--skip-version-validating`, `--override-definitions`, `--clusters`, verbose addon status, Application tree/detail status, and managed-cluster probing. All six documentation links already present in the post resolve to the stated official KubeVela topics.
