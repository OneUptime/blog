# Validation Summary: How to Manage Kubernetes Secrets Lifecycle with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- External Secrets Operator
- HashiCorp Vault CLI and KV secrets engine
- Bitnami Sealed Secrets and kubeseal
- SOPS
- KSOPS/kustomize-sops
- Prometheus Operator PrometheusRule
- kube-state-metrics

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync phases, waves, and PostDelete hooks: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD config management plugins: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD secret management plugin risk notes: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/secret-management/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator lifecycle policies: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- SOPS documentation: https://getsops.io/
- KSOPS/kustomize-sops documentation: https://github.com/viaduct-ai/kustomize-sops
- kube-state-metrics Secret metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md

## Issues Found
- The Argo CD Application examples omitted `spec.project`, which is part of the documented Application spec. Added `project: default`.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated them to the current `external-secrets.io/v1` API used in current ESO documentation.
- The ESO deletion policy explanation incorrectly said `deletionPolicy` controls what happens when an `ExternalSecret` is deleted. Corrected it to provider-side data deletion semantics and added the related `creationPolicy: Owner` behavior for `ExternalSecret` deletion.
- The Sealed Secrets deletion note implied Argo CD always prunes removed resources. Clarified that deletion happens when pruning is enabled for the application or sync operation.
- The SOPS section called the tool "Mozilla SOPS"; current project documentation presents it as SOPS. Updated the wording.
- The Argo CD SOPS plugin snippet used the deprecated/removed `argocd-cm` `configManagementPlugins` style. Replaced it with a sidecar-mounted `ConfigManagementPlugin` ConfigMap example and corrected the KSOPS command to use `kustomize build --enable-alpha-plugins --enable-exec .`.
- The Prometheus alert used `kube_secret_created` as if it proved rotation age. Renamed the section and alert to track Kubernetes Secret object age, and added a note that in-place rotations need a rotation timestamp annotation or provider-side metric.
- The rotation best-practice note implied applications can generally handle secret changes without restarts. Clarified that mounted secrets can be reloaded, while environment-variable consumption typically needs a restart.

## Review Notes
The examples remain illustrative and assume the required controllers, CRDs, Vault auth, Argo CD plugin sidecar image/tools, kube-state-metrics, and Prometheus Operator are installed. Argo CD PostDelete hooks run on Application deletion, not ordinary prune operations.
