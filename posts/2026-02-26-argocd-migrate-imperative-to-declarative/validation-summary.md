# Validation Summary: How to Migrate from Imperative to Declarative ArgoCD Setup

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD Applications and AppProjects
- Argo CD CLI
- Kubernetes custom resources
- kubectl apply
- GitOps App-of-Apps pattern
- YAML and Python manifest cleanup

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD CLI command references for `app list`, `app get`, `app diff`, `app resources`, `repo list`, and `proj list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The introduction said Applications and AppProjects all exist as the same type of resource. Changed this to say they exist as the same Kubernetes resources for their kind, because Application and AppProject are distinct custom resource kinds.
- The cleanup script unconditionally added `resources-finalizer.argocd.argoproj.io` to every Application. Changed it to preserve existing finalizers and note that the resources finalizer should be added only when cascading deletion of managed resources is intended.
- The application cleanup script wrote files to `argocd-config/applications`, but the repository setup step moved files from `migration/cleaned-apps`. Changed the script output directory to `migration/cleaned-apps` so the commands are internally consistent.
- The project cleanup instructions referenced `migration/cleaned-projects` later without saying where cleaned project manifests should be written. Clarified that cleaned projects should be placed in `migration/cleaned-projects`.
- The Git setup commands pushed to `main` after `git init` without ensuring the local branch was named `main`. Added `git branch -M main` before the initial commit/push flow.

## Review Notes
The remaining Argo CD CLI commands, Application and AppProject API versions, directory `recurse` and `exclude` fields, repository Secret label, and `kubectl apply` usage match the official documentation. The examples assume a conventional Argo CD installation namespace of `argocd`; installations using applications in other namespaces or a different Argo CD namespace would need namespace adjustments.
