# Validation Summary: ArgoCD for Automotive: Edge and Cloud Hybrid Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Helm values in Argo CD Applications
- Kyverno
- K3s edge clusters
- AWS EKS authentication for Argo CD clusters

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Match and Exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/

## Issues Found
- The OTA section claimed the example used sync wave ordering, but the Application snippet did not define sync waves. Updated the sentence to describe explicit review and controlled pruning behavior, which matches the shown Argo CD Application.
- The edge management ConfigMap used `server.connection.timeout`, which is not a documented Argo CD ConfigMap setting. Replaced it with documented `argocd-cmd-params-cm` Kubernetes API connection timeout settings: `controller.k8s.tcp.timeout` and `controller.k8s.tls.handshake.timeout`.
- The `resource.exclusions` example used `factory-*` under `clusters`, but Argo CD resource exclusion cluster globs match cluster server URLs. Updated the globs to match the example K3s server URL pattern.
- The local Argo CD Application used `syncOptions: Retry=true`, which is not a documented Argo CD sync option. Replaced it with the documented `syncPolicy.retry` structure and backoff settings.
- The Kyverno policy used deprecated `spec.validationFailureAction`. Moved enforcement to `validate.failureAction: Enforce`, matching current Kyverno documentation.
- The compliance section said compliance was tracked through Argo CD annotations, but the example used Kubernetes labels and annotations on a Deployment. Updated the wording to match the manifest.

## Review Notes
The remaining examples are illustrative and use placeholder internal repositories, image names, service endpoints, and tokens. They are syntactically plausible, but would still require real RBAC, repository credentials, namespaces/projects, chart schemas, and cluster access configuration in a production environment.
