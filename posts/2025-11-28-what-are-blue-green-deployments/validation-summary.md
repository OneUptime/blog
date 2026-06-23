# Validation Summary: What Are Blue-Green Deployments (and When Should You Use Them)?

## Status
validated

## Post Type
Guide / Conceptual explainer with a Kubernetes worked example

## Technologies Covered
- Kubernetes (Deployments, Services, label selectors)
- kubectl (patch, port-forward, logs, get)
- Ingress (mentioned conceptually)
- Prometheus (PromQL example for metric comparison)
- curl (smoke testing)

## Sources Consulted
- Kubernetes Deployment API reference — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Kubernetes Service API reference & selectors — https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl patch documentation (strategic merge patch) — https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- kubectl port-forward / logs / get reference — https://kubernetes.io/docs/reference/kubectl/generated/
- Labels and selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- curl manual (`-f`/`--fail`) — https://curl.se/docs/manpage.html

## Issues Found
No technical issues found.

- The two Deployment manifests use valid `apps/v1` API, with `selector.matchLabels` and pod template labels (`app` + `color`) that match correctly.
- The Service manifest correctly uses a flat `spec.selector` map and matches both `app` and `color` labels.
- `kubectl patch svc payments-api -p '{"spec":{"selector":{"color":"green"}}}'` is a valid strategic-merge patch; because `spec.selector` is a plain map, the patch merges the `color` key while preserving the `app` key — exactly the cutover behavior described.
- `kubectl port-forward deploy/api-green 8080:8080`, `kubectl logs -l app=payments-api,color=green --tail=100`, and `kubectl get pods -l ...` all use correct syntax and flags.
- `curl -f` correctly causes a non-zero exit on HTTP error responses, making the `|| echo` fallback meaningful.
- The PromQL `rate(http_requests_total{color="green"}[5m])` example is syntactically valid.
- The "red-black" alias and the instant-rollback / binary-cutover semantics are accurately described.

## Review Notes
- The prose on line 119 says traffic is flipped "via `kubectl apply`" while the Service block demonstrates `kubectl patch`. Both approaches are valid (re-applying edited YAML vs. patching the live object), so this is not a technical error — just two presentations of the same cutover.
- Worth noting (not an error): Kubernetes Deployment `spec.selector` is immutable after creation, but since blue and green are separate Deployments this never becomes a problem in the described workflow.
- A practical caveat for readers: the Service-selector switch is instant at the routing layer, but existing in-flight connections to blue Pods are not actively drained — graceful session handling is correctly addressed in the "Guardrails" and "When You Might Choose Another Strategy" sections.
- Image references use placeholder registries (`ghcr.io/example/...`), which is appropriate for an illustrative example.
