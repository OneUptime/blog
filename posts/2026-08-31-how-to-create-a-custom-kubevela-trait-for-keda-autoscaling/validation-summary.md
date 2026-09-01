# Validation Summary: How to Create a Custom KubeVela Trait for KEDA Autoscaling

## Status

validated

## Post Type

Technical tutorial

## Technologies Covered

- Kubernetes
- KubeVela 1.11
- KubeVela TraitDefinition and CUE definitions
- KEDA ScaledObject and CPU scaler
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics API and Metrics Server
- Vela CLI, CUE CLI, and kubectl

## Sources Consulted

- [KubeVela auto-scaling tutorial](https://kubevela.io/docs/tutorials/auto-scaler/)
- [KubeVela KEDA as an autoscaling trait](https://kubevela.io/docs/platform-engineers/keda/)
- [KubeVela custom TraitDefinition](https://kubevela.io/docs/platform-engineers/traits/customize-trait/)
- [KubeVela built-in policy reference: apply-once](https://kubevela.io/docs/end-user/policies/references/#apply-once)
- [KubeVela CLI: `vela def init`](https://kubevela.io/docs/cli/vela_def_init/)
- [KubeVela CLI: `vela def render`](https://kubevela.io/docs/cli/vela_def_render/)
- [KubeVela CLI: `vela def apply`](https://kubevela.io/docs/cli/vela_def_apply/)
- [KubeVela CLI: `vela dry-run`](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela CLI: `vela show`](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela CLI: `vela up`](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela CLI: `vela status`](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela catalog KEDA addon metadata](https://github.com/kubevela/catalog/blob/master/addons/keda/metadata.yaml)
- [KubeVela catalog KEDA Helm configuration](https://github.com/kubevela/catalog/blob/master/addons/keda/resources/helm.cue)
- [KubeVela built-in webservice definition](https://github.com/kubevela/kubevela/blob/master/vela-templates/definitions/internal/component/webservice.cue)
- [KEDA 2.20 ScaledObject specification](https://keda.sh/docs/2.20/reference/scaledobject-spec/)
- [KEDA 2.20 CPU scaler](https://keda.sh/docs/2.20/scalers/cpu/)
- [KEDA Kubernetes compatibility matrix](https://keda.sh/docs/2.20/operate/cluster/#kubernetes-compatibility)
- [KEDA ScaledObject CRD schema](https://github.com/kedacore/keda/blob/v2.20.1/config/crd/bases/keda.sh_scaledobjects.yaml)
- [KEDA CPU and memory scaler implementation](https://github.com/kedacore/keda/blob/v2.20.1/pkg/scalers/cpu_memory_scaler.go)
- [KEDA deployment documentation](https://keda.sh/docs/2.20/deploy/)
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [kubectl API resources reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/)
- [CUE `fmt` command reference](https://cuelang.org/docs/reference/command/cue-help-fmt/)

## Issues Found

- The post called the KubeVela KEDA addon a maintained capability even though the current catalog addon is version 2.8.3 and pins the KEDA 2.8.2 Helm chart. Changed the wording to describe it as a version-pinned packaged capability and added a requirement to verify Kubernetes compatibility before using it.
- The controller check hard-coded the official Helm chart's `keda` namespace even though the current KubeVela addon deploys KEDA to `kube-system`. Added an installation-namespace variable and documented both defaults.
- The custom CPU-only trait exposed `cooldownPeriod` and told readers to observe its cooldown. KEDA applies `cooldownPeriod` only when scaling to zero, while this trait requires `minReplicas >= 1` and a CPU-only scaler cannot perform the shown scale-to-zero path. Removed the ineffective field and parameter, and corrected the verification text to describe HPA-controlled scale-down.
- The example deploys into the `apps` namespace, but `vela up --namespace apps` does not create that namespace. Added an explicit namespace-creation step so the sequence works on a fresh cluster.
- The troubleshooting text grouped CPU metrics failures with KEDA scaler errors. CPU scaling uses a resource metric on the generated HPA, so the text now directs resource-metric errors to the `metrics.k8s.io` API and Pod CPU requests, while retaining separate guidance for ScaledObject trigger configuration errors.

## Review Notes

- The corrected CUE definition was rendered with Vela CLI 1.11.0 and produced a valid `core.oam.dev/v1beta1` TraitDefinition with the expected `outputs`, `appliesToWorkloads`, and `conflictsWith` fields.
- The official KubeVela KEDA addon is substantially older than current KEDA. Its pinned release must be checked against the target Kubernetes version; the official KEDA Helm chart is the more direct route when a current KEDA release is required.
- `pollingInterval` remains a valid ScaledObject field, but the generated HPA controls CPU-based replica decisions between one and N replicas according to the HPA controller's sync period.
- The `/docs/latest/` KEDA links currently resolve to KEDA 2.20 and can move as new releases become current. The post correctly tells readers to compare the schema with their installed KEDA version.
- The image digest is intentionally a placeholder and must be replaced before deployment, as the post states.
