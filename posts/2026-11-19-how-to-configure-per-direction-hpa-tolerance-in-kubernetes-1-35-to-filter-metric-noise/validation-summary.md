# Validation Summary: Filter Metric Noise with Per-Direction HPA Tolerance in Kubernetes 1.35

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- Kubernetes 1.35 and HPAConfigurableTolerance
- HorizontalPodAutoscaler (autoscaling/v2), Deployments, and CPU resource metrics
- Directional tolerance, replica rounding, stabilization, and scaling policies
- YAML, kubectl, shell pipelines, and jq

## Sources Consulted
- [Kubernetes 1.35 feature gates](https://v1-35.docs.kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) — feature maturity and default enablement.
- [Kubernetes 1.35 HPA guide](https://v1-35.docs.kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#tolerance) — tolerance, resource targets, stabilization, and scaling policies.
- [Kubernetes v1.35.0 autoscaling/v2 API definitions](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/staging/src/k8s.io/api/autoscaling/v2/types.go) — field names, types, and supported values.
- [Kubernetes v1.35.0 replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) — inclusive thresholds and replica calculation.
- [Kubernetes v1.35.0 HPA controller](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/pkg/controller/podautoscaler/horizontal.go) — independent directional defaults, feature-gate handling, stabilization, and replica limits.
- [kubectl explain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/) — dotted field paths and --api-version.
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/) — -f and --dry-run=server.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — namespace selection and JSON output.
- [jq manual](https://jqlang.org/manual/#object-identifier-index) — nested object selection.

## Issues Found
No technical issues found.

## Review Notes
- Confirmed that HPAConfigurableTolerance is beta and enabled by default in Kubernetes 1.35. The post correctly advises checking actual API server and controller configuration.
- The tolerance fields use resource.Quantity. Quoted decimal strings are valid, and each omitted directional value independently falls back to the controller default, normally 0.1.
- Confirmed the inclusive comparison, the 48%–63% utilization thresholds, the 240m–315m CPU band, and both ceiling calculations. The examples describe ordinary operation with usable metrics; missing metrics and unready Pods can affect real recommendations.
- Manually checked YAML syntax and configuration against the versioned API definitions. The autoscaling/v2 API, CPU AverageValue target, stabilization windows, replica limits, and one-Pod-per-60-second scale-down policy are valid. No deprecated API usage was found.
- Confirmed the distinction between tolerance filtering, stabilization, and scaling policies. Passing tolerance does not bypass replica bounds or other controls.
- Checked all terminal commands against official references and verified the shell block with bash -n. Recalculated the replica examples locally.
- Execution requires saving the manifest as hpa.yaml, an existing production namespace and checkout Deployment in that namespace, working resource metrics, suitable cluster access, and jq.
- All three technical links in the post resolved to the intended versioned documentation and source.
- No live cluster apply, server dry-run, or load experiment was performed. YAML was reviewed manually; an automated YAML parse was unavailable because PyYAML is not installed.
- README.md was left unchanged because no technical correction was needed.
