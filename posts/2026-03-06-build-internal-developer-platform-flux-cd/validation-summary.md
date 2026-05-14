# Validation Summary: How to Build an Internal Developer Platform with Flux CD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- GitOps
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Prometheus Operator PodMonitor
- Grafana dashboards
- Bash scripting

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux monitoring documentation: https://fluxcd.io/flux/guides/monitoring/
- Kustomize replacements reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/replacements.md
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The tenant overlay embedded a ConfigMap as a second YAML document inside `kustomization.yaml`. Kustomize kustomization files should list resources rather than embedding arbitrary Kubernetes objects in the same file, so I moved the variables into `tenant-vars.yaml` and added that file to `resources`.
- The Kustomize replacements only updated some namespace fields and did not replace the tenant label, network policy selectors, tenant group subject, or deployer service account/RBAC names. I added the missing replacement targets, including escaped label field paths for keys containing dots and slashes.
- The Flux app `Kustomization` used `healthChecks` with `name: "*"`. Flux health checks reference named objects; for unknown application resource names, `wait: true` is the correct way to check all reconciled resources. I replaced the wildcard health check with `wait: true`.
- The cluster-level Flux `Kustomization` pointed at `./tenants/instances`, but the repository layout did not include a `tenants/instances/kustomization.yaml` to list tenant directories. I added that kustomization snippet and reflected it in the repository tree.
- The onboarding script generated the same invalid embedded ConfigMap pattern and incomplete replacements. I updated it to generate `tenant-vars.yaml`, include all needed replacement targets, and set the Flux app `serviceAccountName` and `wait` fields.
- The guardrail RBAC used a `ClusterRole` and `ClusterRoleBinding`, which granted the deployer service account namespaced resource permissions cluster-wide. I changed these to a tenant namespace `Role` and `RoleBinding` so Flux impersonation is constrained to the tenant namespace.

## Review Notes
The monitoring examples are plausible for a Prometheus Operator setup with Flux controller metrics exposed on the `http-prom` port, but production dashboards may need query adjustments depending on kube-state-metrics, cAdvisor, and Grafana sidecar configuration.
