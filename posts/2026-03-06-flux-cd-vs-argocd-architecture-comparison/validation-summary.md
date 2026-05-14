# Validation Summary: Flux CD vs ArgoCD: Architecture Comparison

## Status
validated

## Post Type
Technical comparison / architecture guide

## Technologies Covered
- Flux CD
- Argo CD
- GitOps
- Kubernetes controllers and CRDs
- Kustomize
- Helm
- Argo CD Config Management Plugins
- Flux image automation
- Flux and Argo CD controller sharding

## Sources Consulted
- Flux GitOps Toolkit components: https://fluxcd.io/flux/components/
- Flux optional components: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomize Controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux sharding and horizontal scaling: https://fluxcd.io/flux/installation/configuration/sharding/
- Argo CD architectural overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD component architecture: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/components/
- Argo CD high availability and controller sharding: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Config Management Plugins: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/config-management-plugins/
- Argo CD notification triggers and templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Tofu Controller / tf-controller Terraform resource examples: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-obtain-outputs/

## Issues Found
- The post described Argo CD as "monolithic" and said its components communicate through a central API. Official Argo CD documentation describes it as a component-based architecture, and internal reconciliation traffic includes direct application-controller to repo-server communication. Updated the wording to "integrated application-centric" and clarified the API server's role.
- The Flux optional image automation component example listed only the image-reflector-controller while describing both reflector and automation controllers. Added the image-automation-controller excerpt and the ImageUpdateAutomation resource it watches.
- The architecture diagram showed the repo server pushing to the application controller. Argo CD's application controller uses the repo server to get generated manifests, so the direction was corrected.
- The "Resource Management Comparison" label was missing Markdown heading syntax. Added the heading marker.
- The Argo CD Config Management Plugin example used the old `argocd-cm` `configManagementPlugins` configuration. That method is removed in current Argo CD releases. Replaced it with a sidecar-mounted `ConfigManagementPlugin` file example.
- The Flux scaling section said sharding is across namespaces. Current Flux sharding uses controller label selectors. Updated the comment accordingly.
- The Argo CD application controller scaling example used a Deployment and said sharding is based on application hash. Current stable Argo CD HA documentation uses a StatefulSet for the standard controller sharding example and describes cluster sharding. Updated the kind and comments.
- The comparison table called Argo CD a monolithic platform and described Flux multi-cluster as "Kustomization targeting." Updated those cells to match current architecture and Flux kubeConfig-based remote-cluster support more accurately.

## Review Notes
The controller workload YAML snippets remain representative architecture excerpts rather than complete install manifests. Production installs should use the official Flux and Argo CD manifests or Helm charts with pinned versions.
