# Validation Summary: How to Use Cascade Delete in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD Application custom resources
- Kubernetes garbage collection and finalizers
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_delete/
- Argo CD ApplicationSet Application Pruning & Resource Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes Garbage Collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes Cascading Deletion task documentation: https://kubernetes.io/docs/tasks/administer-cluster/use-cascading-deletion/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post listed `orphan` as a valid `argocd app delete --cascade --propagation-policy` value. Current Argo CD CLI documentation supports only `foreground` and `background` for that flag. I changed the example and explanation to use `argocd app delete web-frontend --cascade=false` for non-cascading deletion, which is how Argo CD preserves managed resources.
- The post said Kubernetes garbage-collects the Application resource after Argo CD removes the finalizer. Kubernetes finalizer documentation describes this as completing deletion once finalizers are empty, not garbage collection via owner references. I changed the wording to "completes deletion."
- The stuck-resource command used `--field-selector=metadata.deletionTimestamp!=`, which is not generally supported by Kubernetes field selectors across resource types. I replaced it with a simple `kubectl get all ... | grep Terminating` check.

## Review Notes
- The Argo CD examples using `resources-finalizer.argocd.argoproj.io` and `resources-finalizer.argocd.argoproj.io/background` match official Argo CD deletion documentation.
- The app-of-apps and ApplicationSet-related deletion cautions are consistent with Argo CD's documented behavior when child Applications have the deletion finalizer.
- The example GitHub repository URLs are illustrative placeholders and were not treated as real external dependencies.
