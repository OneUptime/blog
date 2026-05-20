# Validation Summary: How to Delete an ArgoCD Application Without Deleting Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI
- Kubernetes custom resources
- Kubernetes finalizers
- kubectl patch, delete, label, and annotate commands
- GitOps resource ownership and orphaned resources

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd app patch` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_patch/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The UI deletion instructions referred only to unchecking a "Cascade" checkbox. Current Argo CD documentation describes propagation policy choices, including **Non-Cascading (Orphan)**. Updated the step to use **Non-Cascading (Orphan)** while preserving the older checkbox wording as a version caveat.
- The "Application Has No Finalizer" section claimed deleting an Application without a finalizer would never cascade-delete resources regardless of method. This is inaccurate for `argocd app delete`, which defaults to cascading deletion and can add the finalizer automatically. Updated the section to distinguish direct Kubernetes deletion from Argo CD CLI deletion and to recommend `--cascade=false`.
- The closing takeaway implied that simply never adding the finalizer is enough in all deletion paths. Updated it to clarify that avoiding the finalizer applies to direct Kubernetes deletion, while `--cascade=false` is needed for Argo CD CLI non-cascading deletion.

## Review Notes
The remaining commands and snippets match the official Argo CD and Kubernetes documentation. Argo CD resource tracking can use labels, annotations, or both depending on configuration, and the post's wording now correctly notes that the tracking annotation varies by tracking method.
