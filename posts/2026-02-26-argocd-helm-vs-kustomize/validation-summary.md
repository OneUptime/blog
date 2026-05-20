# Validation Summary: ArgoCD Helm vs Kustomize: When to Use Each

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Helm
- Kustomize
- Kubernetes manifests
- GitOps

## Sources Consulted
- Argo CD official documentation: Tools - https://argo-cd.readthedocs.io/en/stable/user-guide/application_sources/
- Argo CD official documentation: Helm - https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD official documentation: Kustomize - https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD official documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Helm official documentation: Flow Control - https://docs.helm.sh/docs/chart_template_guide/control_structures/
- Kubernetes official documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Prometheus Community Helm charts repository - https://prometheus-community.github.io/helm-charts/

## Issues Found
- The introduction said both Helm and Kustomize can template manifests. Kustomize customizes manifests rather than providing a template language, so the wording was corrected.
- Several Argo CD `Application` examples omitted `spec.project` and `spec.destination`, which are needed for complete declarative application examples. Added minimal `project: default` and in-cluster destinations.
- The Prometheus Argo CD example was marked as a `bash` block even though it contained YAML. Changed the fence to `yaml`.
- The combined Kustomize base and overlay example placed two YAML documents in one code block without a document separator. Added `---`.
- The replica patch was described as valid Kubernetes YAML, which could imply it was a complete standalone Deployment. Reworded it to clarify that it uses Kubernetes resource structure as a patch.
- The "Kustomize Post-Rendering of Helm Charts" example was actually an Argo CD multi-source Helm values pattern, not Kustomize post-rendering. Renamed the section and adjusted the description.
- The Kustomize Helm chart inflator example omitted Argo CD's requirement to enable Helm support for Kustomize through a custom config management plugin or `kustomize.buildOptions: --enable-helm`. Added that caveat.

## Review Notes
The remaining guidance is technically sound for current Argo CD, Helm, Kustomize, and Kubernetes behavior. The specific chart versions shown are examples and may not represent the latest available chart releases.
