# Validation Summary: How to Define an ArgoCD Application Spec from Scratch

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD Application CRD
- Argo CD CLI
- Kubernetes manifests and namespaces
- Helm sources in Argo CD
- Kustomize sources in Argo CD
- Jsonnet source options in Argo CD
- Argo CD sync policies and sync options
- Argo CD diff customization

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/diffing/
- Argo CD Projects: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd proj create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_create/

## Issues Found
- The metadata namespace comment said the Application namespace must be the Argo CD installation namespace. Updated it to explain that this is the usual/default placement, while other namespaces are supported when the "applications in any namespace" feature is enabled and configured.
- The metadata name comment tied name uniqueness to the Argo CD namespace. Updated it to say Application names must be unique within the namespace where the Application object is created.
- The default project description said the `default` project allows everything. Clarified that this is the default behavior because the project can be modified by administrators.
- The directory source example described the `directory.jsonnet` block as processing YAML as Jsonnet. Updated the comment to identify it as Jsonnet-specific options.
- The sync options section implied `Validate=false` is for CRDs not yet installed. Argo CD documents `Validate=false` as disabling kubectl schema validation, while `SkipDryRunOnMissingResource=true` handles missing custom resource types. Updated the comments and table accordingly.
- The `ServerSideApply=true` table entry said it is better for CRDs. Updated it to the more precise statement that it enables Kubernetes server-side apply.

## Review Notes
The local `argocd` CLI was not installed, so CLI flags were verified against the official Argo CD command reference instead of local `--help` output. The examples use current `argoproj.io/v1alpha1` Application fields and valid sync option names.
