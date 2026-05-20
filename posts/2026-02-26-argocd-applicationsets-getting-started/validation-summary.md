# Validation Summary: How to Get Started with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Kubernetes custom resources
- kubectl
- GitOps
- YAML configuration

## Sources Consulted
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- Argo CD ApplicationSet installation docs: https://argo-cd.readthedocs.io/en/release-2.6/operator-manual/applicationset/Getting-Started/
- Argo CD List generator docs: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Argo CD Git generator docs: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet deletion behavior: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet resource modification controls: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet integration behavior: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Argo-CD-Integration/
- Argo CD Go Template docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The lifecycle section said generated Applications are deleted along with Kubernetes resources "if pruning is enabled." Argo CD ApplicationSet deletion behavior is controlled by the Application deletion finalizer and `spec.syncPolicy.preserveResourcesOnDeletion`; automated pruning is a separate sync behavior. Updated the text to say child resources are deleted unless resource preservation is enabled.
- The `preserveResourcesOnDeletion` example comment said it prevents accidental deletion of Applications. That field preserves deployed child resources when generated Applications are deleted; it does not prevent the Application resources from being deleted. Updated the comment.
- The monitoring section used a label selector for `app.kubernetes.io/managed-by=applicationset-controller`. Official docs describe generated Applications as being tied to their ApplicationSet through owner references, and this label is not a documented default ApplicationSet label. Replaced the command with a `custom-columns` command that displays each Application's owner reference.

## Review Notes
The examples use ApplicationSet's default fasttemplate-style placeholders such as `{{environment}}` and `{{path.basename}}`. Current Argo CD docs also recommend Go templates for newer examples, using `goTemplate: true` and dot-prefixed parameters such as `{{.environment}}` and `{{.path.basename}}`, but the default templating style remains documented and valid.
