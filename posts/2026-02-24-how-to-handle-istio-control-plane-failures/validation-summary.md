# Validation Summary: How to Handle Istio Control Plane Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- istiod
- Envoy sidecars
- Kubernetes
- kubectl
- istioctl
- Prometheus alerting

## Sources Consulted
- Istio documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: pilot-discovery command reference and exported metrics - https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio documentation: Certificate Management FAQ - https://istio.io/latest/about/faq/
- Istio documentation: In-place upgrades - https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio documentation: Canary upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes documentation: kubectl rollout - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes documentation: PodDisruptionBudget - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: kubectl patch - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes documentation: Authorization and kubectl auth can-i - https://kubernetes.io/docs/reference/access-authn-authz/authorization/

## Issues Found
- The `istioctl proxy-status` status descriptions were imprecise. Updated `SYNCED`, `NOT SENT`, and `STALE` to match Istio's documented meanings.
- The memory-limit patch used JSON `replace` operations against fields that may not exist and relied on container index `0`. Changed it to a strategic merge patch targeting the `discovery` container by name.
- The post said malformed Istio CRDs can crash istiod. Modern Istio normally rejects or reports invalid resources through validation and analyzers, so this was softened to configuration push problems.
- The sidecar connectivity command queried istiod's debug connections endpoint from the `istio-proxy` container. Replaced it with a simpler workload-to-istiod `/version` check from an application container.
- The revision migration command did not remove `istio-injection`, which takes precedence over `istio.io/rev`. Updated the command to remove `istio-injection` while adding the revision label.
- The post described three istiod replicas as the production minimum. Istio's upgrade guidance calls for at least two replicas, so the wording now says at least two and notes that many production clusters use three.
- The Prometheus examples had a missing-series blind spot for the istiod availability alert and an underspecified memory ratio expression. Updated the expressions to handle missing `up` series and match container memory usage to memory limits by namespace, pod, and container.
- The Prometheus alert used `pilot_xds_push_errors`, which is not a current exported istiod metric. Replaced it with `pilot_total_xds_rejects`.

## Review Notes
The rough istiod sizing guidance is reasonable as a starting point but should still be tuned with real cluster metrics because Istio resource needs vary with service count, endpoint count, configuration size, push rate, and enabled features.
