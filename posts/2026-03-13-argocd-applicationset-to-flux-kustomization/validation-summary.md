# Validation Summary: How to Map ArgoCD ApplicationSet to Flux Kustomization

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD Kustomization
- Flux post-build variable substitution
- Argo CD ApplicationSet
- Kustomize bases and overlays
- Kubernetes Deployment manifests
- Bash heredoc-based manifest generation

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://v2-0.docs.fluxcd.io/flux/components/kustomize/api/v1/
- Argo CD ApplicationSet generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD List generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD Cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Flux Kustomization examples declared three services in the ApplicationSet but only showed frontend and backend Flux Kustomizations. Added the worker Kustomization so the example matches the source ApplicationSet.
- The shared Deployment used `${SERVICE_NAMESPACE}` but the Flux Kustomizations did not define `SERVICE_NAMESPACE`. Added that variable to each explicit Kustomization and to the generated manifest script.
- The Deployment used `$SERVICE_PORT`, but Flux post-build substitution is documented for `${VAR}` expressions and `$VAR` is the form Flux recommends when substitution should be avoided. Changed it to `${SERVICE_PORT:=8080}`.
- The Deployment image used `${SERVICE_VERSION}` without a value or default, which would render an empty image tag when the variable is not supplied. Added a `latest` default with `${SERVICE_VERSION:=latest}`.
- The frontend overlay referenced `../base`, but the base directory snippet did not include a `kustomization.yaml`. Added the minimal `apps/base/kustomization.yaml` needed for Kustomize base composition.

## Review Notes
Flux `.spec.targetNamespace` requires the namespace to exist already or be included in the reconciled manifests; the post's examples assume those namespaces have already been created. `substituteFrom` references are valid as written because the ConfigMap is in the same namespace as the Flux Kustomization.
