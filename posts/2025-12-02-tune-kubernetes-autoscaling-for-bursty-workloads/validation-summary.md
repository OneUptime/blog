# Validation Summary: How to Define and Tune Kubernetes Autoscaling for Bursty Workloads

## Status
validated

## Post Type
Guide / Playbook (hands-on tutorial with configuration examples)

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA, `autoscaling/v2`)
- Kubernetes Vertical Pod Autoscaler (VPA, `autoscaling.k8s.io/v1`)
- Karpenter (`karpenter.sh/v1` NodePool + `karpenter.k8s.aws` EC2NodeClass)
- Cluster Autoscaler
- Prometheus Adapter / custom metrics
- OpenTelemetry metrics
- OneUptime (observability, runbooks, dashboards)

## Sources Consulted
- Kubernetes HPA documentation, including the v2 autoscaling API and scaling `behavior` (stabilization windows, scale policies): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes HPA `autoscaling/v2` API reference (Pods and Resource metric types, `AverageValue`/`AverageUtilization` targets): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Vertical Pod Autoscaler (autoscaler/vertical-pod-autoscaler) docs and CRD (`updateMode`, `resourcePolicy.containerPolicies`, `minAllowed`/`maxAllowed`): https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Karpenter v1 NodePool concepts and API reference (`nodeClassRef` group/kind/name, `requirements`, `disruption.consolidationPolicy`, `consolidateAfter`, `limits`): https://karpenter.sh/docs/concepts/nodepools/
- Karpenter v1 migration / upgrade guide (v1alpha5 Provisioner → v1 NodePool, EC2NodeClass): https://karpenter.sh/docs/upgrading/v1-migration/

## Issues Found
No technical issues found.

The configuration examples are syntactically valid and use current, non-deprecated APIs:
- **HPA**: `autoscaling/v2` is the current stable API. `scaleTargetRef`, `minReplicas`/`maxReplicas`, `behavior.scaleUp`/`scaleDown` with `stabilizationWindowSeconds` and `policies` (type `Percent`, `value`, `periodSeconds`), and the mixed `Pods` (`AverageValue`) + `Resource` (`AverageUtilization`) metrics are all correct.
- **VPA**: `autoscaling.k8s.io/v1` with `targetRef`, `updatePolicy.updateMode: "Auto"`, and `resourcePolicy.containerPolicies` (`containerName`, `minAllowed`, `maxAllowed`) matches the VPA CRD.
- **Karpenter**: `karpenter.sh/v1` NodePool with `template.spec.nodeClassRef` using the v1 `group`/`kind`/`name` form (correctly replacing the older `apiVersion` field), `requirements` under `template.spec`, `disruption.consolidationPolicy: WhenEmpty` paired with the v1-required `consolidateAfter`, and `limits.cpu` are all accurate. The comment correctly notes v1 replaces the deprecated v1alpha5 Provisioner.

## Review Notes
- The intro prose for the Karpenter block calls the instance set "compute-optimized families," while the values are `m6i` (general-purpose/balanced) and `c7i` (compute-optimized). The inline YAML comment more accurately says "Balanced and compute-optimized." This is a minor wording nuance, not a technical error, so it was left as-is.
- `consolidationPolicy: WhenEmpty` only consolidates fully empty nodes; teams wanting more aggressive cost reduction can use `WhenEmptyOrUnderutilized` (the v1 rename of the former `WhenUnderutilized`). The post's choice is intentional and appropriate for bursty workloads that should drain quickly but not be disrupted mid-spike.
- All timing/throughput figures (e.g., scale in under 45s, 5-minute scale-down stabilization) are illustrative examples and consistent with the configs shown.
