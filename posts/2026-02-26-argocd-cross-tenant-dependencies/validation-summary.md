# Validation Summary: How to Handle Cross-Tenant Dependencies in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications, sync waves, resource hooks, and custom health checks
- Kubernetes Deployments, init containers, Services, and ExternalName Services
- Istio AuthorizationPolicy and service mesh traffic management concepts
- jq processing of Argo CD CLI JSON output
- Mermaid dependency diagrams

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD resource health and custom Lua health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_list/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Service and ExternalName documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/

## Issues Found
1. **Argo CD Application examples omitted the destination cluster.** The Application specification requires the destination to identify the target cluster by `server` or `name`. Added `server: https://kubernetes.default.svc` to each Application snippet.
2. **The app-of-apps sync-wave explanation was too absolute.** Argo CD removed the built-in health assessment for `argoproj.io/Application`, and the official health docs note that app-of-apps sync-wave orchestration may require restoring it. Updated the wording to require configured Application health assessment and changed "guarantees" to a more accurate sync-and-health statement.
3. **The Deployment example was invalid for `apps/v1`.** Kubernetes Deployments require `spec.selector`, and the selector must match pod template labels. Added `spec.selector.matchLabels` and matching `template.metadata.labels`.
4. **The Istio AuthorizationPolicy comment contradicted the policy.** The comment said only team-alpha could call the auth service, but the rule allowed both `team-alpha-prod` and `team-gamma-prod`. Updated the comment to match the configuration.

## Review Notes
The local environment did not have the Argo CD CLI installed, so CLI validation was documentation-based rather than live `--help` validation. The examples remain illustrative and assume the referenced namespaces, AppProjects, repositories, images, service names, and mesh settings exist in the reader's environment.
