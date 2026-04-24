# Validation Summary: How to Set Resource Quotas on Namespaces in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes `ResourceQuota`
- `kubectl`
- YAML manifests
- Prometheus / PromQL
- kube-state-metrics

## Sources Consulted
- Portainer Documentation: Manage a namespace — https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/manage
- Kubernetes Documentation: Resource Quotas — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Documentation: `kubectl set resources` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- kube-state-metrics Documentation: ResourceQuota Metrics — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus Documentation: Operators and vector matching — https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The Portainer UI example in Step 1 implied that object-count quotas are configured inside the `Resource quota` section. Portainer's namespace-management docs show that section is for CPU and memory, while load balancer and storage quotas are configured separately. I removed the incorrect object-count block and clarified the Portainer-specific behavior.
- The YAML comment `Count running pods by QoS class` was incorrect. Kubernetes `count/*` quotas are object-count quotas, not QoS-based quotas. I replaced the comment with an accurate description and removed the misleading `count/pods` example from that block.
- The text `When a deployment fails due to quota` was imprecise. Kubernetes admits the Deployment object, but quota failures happen when Pod creation is evaluated. I updated the sentence to describe pod creation failure during rollout.
- The `NotTerminating` scope comment incorrectly described the scope as applying only to long-running pods and excluding Jobs. Kubernetes defines `NotTerminating` based on whether `activeDeadlineSeconds` is unset. I corrected the comment accordingly.
- The Prometheus alert expression divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without vector matching. Because kube-state-metrics exposes `type` as a label, those series do not match one-to-one unless that label is ignored. I updated the query to use `ignoring(type)`.

## Review Notes
- `kubectl top pods` is a valid command, but it requires Metrics Server or another compatible metrics API source in the cluster.
- Portainer UI details are version-specific; this review checked them against Portainer 2.33 LTS documentation.
- After the corrections above, the remaining Kubernetes YAML and `kubectl` examples align with current upstream documentation.
