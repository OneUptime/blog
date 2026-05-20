# Validation Summary: How to Configure ArgoCD to Auto-Create Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and sync options
- Argo CD ApplicationSets
- Kubernetes namespaces, metadata, finalizers, and RBAC
- Helm and Kustomize with Argo CD
- kubectl and argocd CLI usage

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD v2.5 Sync Options documentation: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/sync-options/
- Argo CD v2.6 Sync Options documentation: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/sync-options/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD ApplicationSet deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- Corrected the `managedNamespaceMetadata` version from Argo CD 2.5 to Argo CD 2.6. The field is present in the v2.6 documentation and CRD but not in the v2.5 documentation or v2.5 CRD.
- Clarified `managedNamespaceMetadata` behavior. It requires `CreateNamespace=true` and can affect existing namespaces, but adopting namespaces with existing metadata has server-side apply caveats in the Argo CD documentation.
- Corrected namespace deletion guidance. Automated prune is not the relevant setting for deleting resources during Application deletion; Argo CD deletes application resources during cascading Application deletion, which is the default for `argocd app delete`.
- Clarified namespace ordering. Argo CD's sync ordering applies Namespaces before many other resource kinds by default; sync waves are still useful when explicit ordering or additional setup sequencing is desired.

## Review Notes
The examples use current Argo CD `argoproj.io/v1alpha1` Application and ApplicationSet manifests and valid sync option names. The post would benefit in the future from a short caveat that a Namespace manifest in the same application takes precedence over `managedNamespaceMetadata` for the same namespace.
