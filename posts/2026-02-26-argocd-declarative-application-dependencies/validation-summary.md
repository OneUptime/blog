# Validation Summary: How to Handle Declarative Application Dependencies in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD sync phases and sync waves
- Argo CD custom resource health checks
- Kubernetes Deployments, init containers, readiness probes, Services, Ingresses, and CRDs
- Helm chart sources in Argo CD
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD Resource Health and custom health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD v1.7 to v1.8 upgrade notes for removed Application health assessment: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/1.7-1.8/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD argocd app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post implied that App-of-Apps sync waves automatically wait for child Argo CD Applications to become healthy. Argo CD 1.8 and later removed built-in health assessment for the `argoproj.io/Application` CRD, so this requires a custom health check. Updated the sync-wave introduction and the parent-application pattern to state this requirement.
- The post described sync-wave ordering only as ascending. That is correct for creation and updates, but pruning processes higher waves first. Updated the explanation to include the pruning behavior and to more closely match Argo CD's documented sync loop.
- The post said Ingress resources sit in a pending state when the ingress controller is not deployed. Kubernetes Ingress objects can still be created; the practical issue is that they are not served and may have empty status or load balancer address fields. Updated the wording.
- The parent-application pattern omitted the operational requirement that child parent apps need automated sync or manual syncing after the root creates them. Added a sentence to make the example deployable as described.

## Review Notes
The YAML snippets use valid Argo CD Application fields and sync-wave annotations. The `argocd app sync my-app --dry-run` flag is documented, and the `kubectl get ... -o custom-columns=...` pattern is consistent with Kubernetes custom-column and JSONPath behavior. The chart versions shown are examples rather than current-version recommendations.
