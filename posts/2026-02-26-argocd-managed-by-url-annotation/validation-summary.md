# Validation Summary: How to Use the 'Managed By' URL Annotation in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes annotations and labels
- Argo CD Application resources
- Helm templating
- Kustomize
- kubectl

## Sources Consulted
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD managed-by URL annotation documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/managed-by-url/
- Argo CD external URL links documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Kubernetes recommended labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl annotate documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Helm template function documentation: https://helm.sh/docs/chart_template_guide/function_list/

## Issues Found
- The post used `argocd.argoproj.io/managed-by`, but Argo CD documents the annotation as `argocd.argoproj.io/managed-by-url`. I updated all examples and commands to use the correct annotation key.
- The post claimed the annotation can attach external management links to any Kubernetes resource. Argo CD documents `argocd.argoproj.io/managed-by-url` for `Application` resources, where it specifies the URL of the Argo CD instance managing the application. I revised the explanations and examples to target Argo CD `Application` resources.
- The post described links to source repositories, Terraform state, runbooks, and CI/CD pipelines as uses for this annotation. Those are not the documented purpose of `managed-by-url`; Argo CD's resource-level external links use `link.argocd.argoproj.io/{some link name}`. I replaced those examples with valid Argo CD instance URL examples.
- Deployment, Service, ConfigMap, and generic resource snippets were technically misleading for this annotation. I replaced them with Argo CD Application manifests and Application-focused Helm, Kustomize, and kubectl examples.
- The verification commands checked Deployment and `kubectl get all` output for the wrong annotation key. I updated them to query `Application` resources and the `managed-by-url` annotation.

## Review Notes
The examples now describe the documented multi-instance Argo CD use case. The local environment did not have `kubectl` installed, so kubectl command syntax was checked against the official Kubernetes command reference rather than local `--help` output.
