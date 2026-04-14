# Validation Summary: How to Use Litmus Chaos with Dapr on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- LitmusChaos (CNCF chaos engineering framework)
- Dapr (Distributed Application Runtime)
- Kubernetes (container orchestration)
- Helm (Kubernetes package manager)
- RBAC (Kubernetes role-based access control)

## Sources Consulted
- LitmusChaos Helm chart repository and values.yaml (https://github.com/litmuschaos/litmus-helm)
- LitmusChaos chaos-operator CRD definitions (https://github.com/litmuschaos/chaos-operator)
- LitmusChaos litmus-go experiment types (https://github.com/litmuschaos/litmus-go)
- LitmusChaos official documentation (https://docs.litmuschaos.io/)
- LitmusChaos ChaosHub (https://hub.litmuschaos.io/)
- LitmusChaos pod-delete experiment documentation
- LitmusChaos chaos-charts repository (https://github.com/litmuschaos/chaos-charts)
- CNCF blog: LitmusChaos 3.0 announcement

## Issues Found
No technical issues found. All code examples, commands, YAML configurations, and technical claims are correct.

## Review Notes
- The `annotationCheck: "false"` field in the ChaosEngine YAML is a legacy field from Litmus 1.x that has no functional effect in Litmus 2.x/3.x. It is silently accepted due to `x-kubernetes-preserve-unknown-fields: true` in the CRD. It still appears in official Litmus documentation examples, so its inclusion is reasonable but readers should know it is effectively a no-op.
- The ChaosHub URL pattern (`kubectl apply -f https://hub.litmuschaos.io/api/chaos/3.0.0?file=...`) is a workflow originating from Litmus 1.x/2.x. In Litmus 3.x, the recommended approach is to manage experiments through ChaosCenter's UI/API (Chaos Studio). However, the underlying CRDs (ChaosEngine, ChaosExperiment, ChaosResult) and chaos-operator are the same in 3.x, so applying them directly via kubectl still works. This is a valid approach for automation and CI/CD pipelines.
- The RBAC configuration is intentionally simplified for the tutorial scope. A production deployment may need additional permissions (e.g., `batch/jobs`, `coordination.k8s.io/leases`).
- The `verdict: Pass` field referenced in the "Interpret Chaos Results" section is located at `status.experimentStatus.verdict` in the ChaosResult YAML. The `kubectl describe` and `-o yaml` commands shown will surface this field correctly.
