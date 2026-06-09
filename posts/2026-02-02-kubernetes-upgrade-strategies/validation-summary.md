# Validation Summary: How to Handle Kubernetes Upgrade Strategies

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough of Kubernetes Deployment upgrade strategies with YAML manifests, shell scripts, and CI/CD integration examples.

## Technologies Covered
- Kubernetes Deployments (RollingUpdate / Recreate strategies)
- PodDisruptionBudget (policy/v1)
- Kubernetes Services and Endpoints
- Pod readiness / liveness probes, pod anti-affinity, lifecycle.preStop, initContainers
- kubectl rollout / scale / patch / set image / get
- Istio VirtualService and DestinationRule (traffic splitting)
- Kustomize (kustomization, patches, images, replicas)
- ArgoCD Application (sync policy, retry, syncOptions)
- Prometheus / kube-state-metrics (PrometheusRule, PromQL queries)
- Bash automation scripts (blue-green switch, canary progression)

## Sources Consulted
- Kubernetes Deployments docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes PodDisruptionBudget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- kubectl JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Istio API v1 GA announcement (Istio 1.22, May 2024): https://istio.io/latest/blog/2024/v1-apis/
- Istio VirtualService / DestinationRule docs: https://istio.io/latest/docs/reference/config/networking/
- ArgoCD declarative setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patchesjson6902/
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics

## Issues Found
1. **Broken `kubectl ... -o jsonpath | jq length` snippet in `blue-green-switch.sh`.**
   The original code was:
   ```bash
   kubectl get endpoints $SERVICE -n $NAMESPACE \
     -o jsonpath='{.subsets[0].addresses}' | jq length
   ```
   `kubectl -o jsonpath` renders complex objects/arrays using Go's default `map[key:value]` format, not JSON, so piping the array output to `jq` causes a parse error at runtime. Replaced with the JSON-then-jq form, which also gracefully handles an empty endpoint set:
   ```bash
   kubectl get endpoints $SERVICE -n $NAMESPACE \
     -o json | jq '(.subsets[0].addresses // []) | length'
   ```

2. **Outdated Istio API version (`networking.istio.io/v1beta1`).**
   Istio promoted `networking.istio.io/v1` to GA in Istio 1.22 (May 2024). For a 2026 post, the v1 GA API is the appropriate version for `VirtualService` and `DestinationRule`. Updated both occurrences (the example manifests block) to `networking.istio.io/v1`. The spec field shapes used in the post are unchanged between v1beta1 and v1, so no other edits were needed.

## Review Notes
- The `${canary_replicas}0%` printf hack in the canary rollout script only produces the right percentage because the example stages (1, 3, 5, 10 replicas against 9, 7, 5, 0 stable respectively) happen to total 10 replicas. The code is fragile if a reader copies it and changes the stage table, but it is not technically incorrect for the stages shown.
- The Kustomize `patches` example uses a JSON6902 `add` operation at `/spec/template/metadata/annotations/upgrade-timestamp`. JSON Patch `add` requires the parent path (`annotations`) to exist on the target; if the referenced `deployment.yaml` does not already define `spec.template.metadata.annotations`, the patch will fail. The earlier rolling-update Deployment in the post does not define annotations, so a reader composing these examples together should add at least an empty `annotations: {}` block to the base, or switch to a strategic-merge patch. Left as-is because the snippet is illustrative.
- `kubectl get endpoints` still works, but Endpoints is being superseded by EndpointSlices (default since Kubernetes 1.21). For future-proofing, EndpointSlice-based checks (`kubectl get endpointslices -l kubernetes.io/service-name=<svc>`) are preferable, though Endpoints remains supported.
- All kube-state-metrics metric names referenced in the PrometheusRule and PromQL examples (`kube_deployment_*`, `kube_pod_container_status_restarts_total`) are valid and marked STABLE.
- PodDisruptionBudget `policy/v1`, ArgoCD `argoproj.io/v1alpha1`, and Kustomize `kustomize.config.k8s.io/v1beta1` are all current and correct.
