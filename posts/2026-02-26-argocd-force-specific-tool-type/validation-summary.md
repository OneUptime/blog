# Validation Summary: How to Force a Specific Tool Type in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Application custom resources
- Helm
- Kustomize
- Jsonnet
- Argo CD Config Management Plugins
- Argo CD CLI

## Sources Consulted
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Directory documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD Go API reference for `ApplicationSource.ExplicitType`: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apis/application/v1alpha1

## Issues Found
- The Kustomize CLI example was not valid as written. The command ended at `--config-management-plugin ""`, so the following `--kustomize-image` line would be interpreted as a separate shell command. I removed the unnecessary plugin-clearing flag and left `--kustomize-image` as part of the same `argocd app create` command.
- The post said Argo CD behavior is undefined when multiple tool types are specified in the same source. Argo CD's source type detection returns an error when multiple explicit source types are defined, so I updated the sentence to describe that behavior accurately.
- The post said forcing Directory on a Helm chart means Argo CD will try to apply Helm templates as raw YAML. Official directory documentation says directory apps process plain manifests and fail to render when Helm, Kustomize, or Jsonnet files are encountered. I adjusted the wording to say Helm templates are not rendered and the directory application fails if those files are included.

## Review Notes
The local `argocd` CLI was not installed in this environment, so CLI flags were verified against the official Argo CD command reference rather than local `--help` output. The examples use current Application source fields (`helm`, `kustomize`, `directory`, and `plugin`) and match the documented tool detection model.
