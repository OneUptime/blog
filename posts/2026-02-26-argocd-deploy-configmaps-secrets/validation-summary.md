# Validation Summary: How to Deploy ConfigMaps and Secrets with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes Deployments
- Helm
- Kustomize
- Stakater Reloader
- Bitnami Sealed Secrets
- External Secrets Operator
- SOPS

## Sources Consulted
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD config management plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/index.html
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/1.4/reference/annotations.html
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- SOPS documentation: https://getsops.io/
- SOPS GitHub documentation: https://github.com/getsops/sops
- Kustomize documentation: https://kustomize.io/

## Issues Found
- The Deployment examples used `apps/v1` but omitted the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the examples match Kubernetes Deployment requirements.
- The checksum annotation Deployment example omitted the required container image. Added `image: myapp:1.0.0`.
- The ConfigMap update explanation said pods continue using old configuration until restarted. Updated it to distinguish environment-variable consumption, which requires restart, from volume-mounted ConfigMaps, which update eventually except with `subPath` and still require application reload logic.
- The immutable ConfigMap example used a versioned name but did not set `immutable: true`. Added the field so it is actually an immutable ConfigMap.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API version.
- The SOPS section referred to "Mozilla SOPS" and showed the removed `argocd-cm` `configManagementPlugins` format. Updated the wording to "SOPS" and replaced the snippet with the current sidecar `ConfigManagementPlugin` format.

## Review Notes
The Reloader chart revision shown is pinned to an older chart version, but the Application shape and values shown are still valid. For production use, readers should pin a version they have tested and periodically review chart updates.
