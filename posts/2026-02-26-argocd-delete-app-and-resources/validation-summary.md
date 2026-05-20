# Validation Summary: How to Delete an ArgoCD Application and All Its Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI and UI
- Kubernetes custom resources and finalizers
- Kubernetes deletion propagation and garbage collection
- Argo CD ApplicationSets
- PersistentVolumes and PersistentVolumeClaims

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD ApplicationSet Application Pruning and Resource Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post implied the resources finalizer always had to be added manually before cascade deletion. Updated it to clarify that `argocd app delete --cascade` adds the finalizer automatically, while `kubectl` deletion requires the finalizer to already be present.
- The JSON patch example for adding finalizers could replace existing finalizers or fail depending on the field state. Replaced it with the merge patch form shown in the official Argo CD documentation.
- The UI instructions referred to a Cascade checkbox. Updated this to the current Argo CD deletion model, where the UI offers Foreground, Background, and Non-Cascading propagation choices.
- The post said namespaces created by `CreateNamespace=true` are deleted. Updated it to clarify that generated namespaces are normally not resource-tracked unless namespace ownership metadata is configured.
- The propagation policy section treated `PrunePropagationPolicy` as the main Application deletion control. Updated it to clarify that this sync option applies to pruning, while Application deletion propagation is controlled by the finalizer variant or `argocd app delete --propagation-policy`.
- The deletion-order diagram claimed a specific child-before-parent ordering. Updated it to avoid over-specifying Kubernetes object order and to reflect Argo CD sync wave pruning behavior plus Kubernetes garbage collection.
- The app-of-apps section implied child Applications always cascade-delete their own resources. Updated it to clarify that child Applications need the resources finalizer for that cascade behavior.
- The ApplicationSet section did not mention that deleting an ApplicationSet normally deletes generated Applications and their managed resources unless `preserveResourcesOnDeletion` is set. Added that caveat.

## Review Notes
The remaining examples use current Argo CD and Kubernetes concepts. The force-delete finalizer removal example is technically valid but remains risky, as the post already notes.
