# Validation Summary: How to implement Kustomize components for reusable configuration snippets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize components
- Kustomize patches and generators
- Kubernetes Deployments, Services, NetworkPolicies, ResourceQuotas, and HorizontalPodAutoscalers
- Prometheus Operator ServiceMonitor
- Istio VirtualService
- Velero Schedule

## Sources Consulted
- Kustomize components example and KEP reference: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/components.md
- Kustomize patching multiple resources example: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/patchMultipleObjects.md
- Kustomize repository and kubectl integration notes: https://github.com/kubernetes-sigs/kustomize
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes declarative management with Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes security contexts: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Security Policies deprecation/removal notes: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Velero Schedule API type documentation: https://velero.io/docs/v1.14/api-types/schedule/

## Issues Found
- Several strategic merge patches used `containers: - name: not-important` while targeting all Deployments. Kubernetes strategic merge patches merge container lists by container name, so these examples would add a new container named `not-important` rather than modifying the existing application container. Updated the security, debug, resource-management, and logging component examples to use JSON 6902 patch operations against `/spec/template/spec/containers/0`.
- The debug Service was described as being for port forwarding but used `type: NodePort`. Changed it to `type: ClusterIP`, which is sufficient and more appropriate for `kubectl port-forward`.
- The Istio component referenced `destinationrule.yaml` but did not include a DestinationRule definition. Because the shown VirtualService used `subset: v1`, that subset would need a corresponding DestinationRule. Removed the missing resource reference and the subset field from the VirtualService example.
- The resource-management component referenced `limitrange.yaml` without providing a LimitRange manifest. Removed that missing resource reference while preserving the shown ResourceQuota and container resource patch.
- The component organization tree included `podsecuritypolicy.yaml`, but PodSecurityPolicy has been deprecated since Kubernetes v1.21 and removed in v1.25. Removed it from the example tree.

## Review Notes
- Components are still documented as `apiVersion: kustomize.config.k8s.io/v1alpha1` with `kind: Component`, and Kustomize v5.8.1 successfully rendered a representative component build using the corrected patch form.
- The generic JSON patch examples assume the application container is the first container in each Deployment. For production use, teams should prefer targeting known container names when possible.
