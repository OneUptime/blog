# Validation Summary: How to Use Managed By Annotation for Documentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes annotations
- Kubernetes manifests
- Kustomize patches
- kubectl
- Bash
- jq

## Sources Consulted
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD external URL links documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD deep links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Argo CD managed-by-url annotation documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/managed-by-url/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- jq manual: https://jqlang.org/manual/dev/
- GNU Bash manual, process substitution and pipelines: https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The post described `argocd.argoproj.io/managed-by` as a resource documentation link annotation. Argo CD documents `link.argocd.argoproj.io/{link name}` for resource links; `argocd.argoproj.io/managed-by-url` is a different Application-only annotation for linking to the Argo CD instance that manages an Application. Updated the post title, description, explanations, YAML examples, Kustomize patch paths, kubectl commands, pre-commit hook, jq filters, and validation scripts to use `link.argocd.argoproj.io/documentation`.
- The Argo CD deep-link example used incorrect template variables (`{{.Name}}`, `{{.Namespace}}`), condition syntax (`kind == "Deployment"`), and icon field names (`icon`). Updated these to the documented resource deep-link context (`{{.resource.metadata.name}}`, `{{.resource.metadata.namespace}}`), condition syntax (`resource.kind == "Deployment"`), and `icon.class` Font Awesome classes.
- The documentation coverage script divided by zero when a namespace had no Deployments. Added a zero-total guard.
- The broken-link validation script incremented `BROKEN` inside a pipeline-fed `while` loop, which does not reliably update the parent shell variable in Bash. Changed it to use process substitution so the counter is available after the loop.
- The Kustomize JSON patch example used the old annotation path. Updated the JSON Pointer path and added a note that the example assumes `metadata.annotations` already exists on target resources.

## Review Notes
- The service catalog URLs are illustrative internal examples; they are plausible patterns but may need to be adjusted for a specific Backstage, OpsLevel, or Cortex deployment.
- The Kustomize example still uses placeholder URL values, so teams should replace them with concrete resource-specific links or a generator/replacement workflow appropriate to their repository.
