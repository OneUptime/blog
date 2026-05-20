# Validation Summary: How to Handle Environment-Specific Resource Limits in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments
- Kubernetes resource requests and limits
- Kustomize overlays, patches, and replicas transformer
- Helm chart values and templates
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- LimitRange
- ResourceQuota
- kubectl

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos
- Kubernetes documentation: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes documentation: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: top - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#top
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Helm documentation: Values - https://helm.sh/docs/chart_best_practices/values/

## Issues Found
- The Helm Deployment template omitted the required `.spec.selector` and matching pod template labels for an `apps/v1` Deployment. I added a standard Helm label selector and matching `template.metadata.labels` so the example can render a valid Deployment manifest.
- The VPA section implied that creating a `VerticalPodAutoscaler` object alone deploys VPA. VPA is a CRD/controller that must be installed separately, so I clarified that the VPA components must already be installed and adjusted the snippet comment to say it creates a VPA object in recommendation mode.

## Review Notes
- The Kustomize `patches` examples use the current `patches` field and are consistent with Kustomize strategic merge patch behavior for named containers.
- The HPA example uses the stable `autoscaling/v2` API and valid resource metrics and behavior fields.
- The LimitRange and ResourceQuota examples use valid core `v1` fields for namespace defaults and compute quota.
- The local environment did not have `kubectl`, `kustomize`, or `helm` installed, so CLI details were checked against official documentation rather than local help output.
