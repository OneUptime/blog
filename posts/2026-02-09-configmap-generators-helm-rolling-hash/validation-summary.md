# Validation Summary: How to Use ConfigMap Generators in Helm with Rolling Hash Suffixes

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Deployments
- Kubernetes RBAC
- Kubernetes Jobs
- Helm chart templates
- Helm template helper functions and hooks
- kubectl

## Sources Consulted
- Helm Template Function List: https://helm.sh/docs/chart_template_guide/function_list/
- Helm Named Templates documentation: https://helm.sh/docs/v3/chart_template_guide/named_templates/
- Helm Chart Hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update tutorial: https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- Several `apps/v1` Deployment examples omitted `spec.selector` and matching pod template labels. Kubernetes requires an appropriate selector and matching template labels for Deployments, so I added `selector.matchLabels` and `template.metadata.labels` to the affected examples.
- The cleanup hook used `pre-upgrade,pre-rollback`, which could delete old ConfigMaps before the rollout or rollback had completed. I changed it to `post-upgrade,post-rollback` so cleanup runs after Helm applies the new manifests.
- The cleanup command sorted ConfigMaps by name, but hash suffixes are not chronological. I changed the command to sort by `metadata.creationTimestamp` and keep the current ConfigMap plus two previous versions.

## Review Notes
- The hash suffix approach is technically valid: changing the ConfigMap name referenced from the pod template changes the Deployment pod template and triggers a rollout.
- Mounted ConfigMap volumes are eventually updated in place by Kubernetes, but ConfigMaps consumed as environment variables require a pod restart. The post's restart guidance is still appropriate for applications that need a fresh pod lifecycle for configuration changes.
- The cleanup example uses `bitnami/kubectl:latest`; pinning an image tag would be more reproducible in production, but this is not a correctness issue in the tutorial.
