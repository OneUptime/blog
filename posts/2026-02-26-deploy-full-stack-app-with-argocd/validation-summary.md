# Validation Summary: How to Deploy a Full-Stack Application with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, automated sync, sync options, retry policy, and sync waves
- Kubernetes Deployments, StatefulSets, Services, Namespaces, ConfigMaps, Secrets, Ingress, readiness probes, and resource requests/limits
- Kustomize bases, overlays, patches, and image overrides
- PostgreSQL and Redis container deployment patterns
- Sealed Secrets and `kubeseal`
- `kubectl` and `argocd` CLI commands

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kustomize documentation: https://kustomize.io/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- Removed `database/pvc.yaml` from the repository structure because the PostgreSQL StatefulSet uses `volumeClaimTemplates`, and the kustomization does not reference a standalone PVC.
- Changed the PostgreSQL Service to a headless Service with `clusterIP: None`, matching Kubernetes StatefulSet guidance that the governing service provides stable network identity.
- Added missing Redis, backend, and frontend Service manifests because they were referenced by the kustomization, DNS names, and Ingress but were not defined in the post.
- Changed the backend `DATABASE_URL` reference from `backend-config` to `backend-secrets` because `backend-config` is a ConfigMap, not a Secret, and the referenced `database-url` key was not in that ConfigMap.
- Removed the NGINX Ingress `rewrite-target: /` annotation because it would rewrite `/api` requests instead of simply routing them to the backend Service.
- Clarified the secrets section to state that the manifests expect `postgres-credentials` and `backend-secrets` secrets with the required keys.

## Review Notes
The Argo CD Application spec, sync-wave annotation, sync options, retry fields, `argocd app get --show-operation`, `kubectl apply -f`, `kubectl get pods -n`, `kubectl port-forward svc/frontend 8080:80`, Kustomize patch/image syntax, and `kubeseal --format yaml` usage are consistent with the referenced documentation. The guide remains a representative deployment example; production database operation would still need backup, upgrade, TLS, security context, and high-availability decisions outside the scope of this post.
