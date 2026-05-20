# Validation Summary: How to Organize Plain YAML Manifests for ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects
- Kubernetes YAML manifests
- Kustomize
- Helm
- yamllint
- kubectl

## Sources Consulted
- Argo CD Directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html

## Issues Found
- The AppProject example incorrectly implied that `sourceNamespaces` restricts applications to a team directory in Git. Updated the comment and example namespace to reflect that `sourceNamespaces` controls which Kubernetes namespaces may contain Application resources that use the project when Applications-in-any-namespace is enabled.
- The ApplicationSet Git directory generator example used legacy template variables (`{{path}}` and `{{path.basename}}`). Updated it to enable Go templates and use the current documented variables (`{{.path.path}}` and `{{.path.basename}}`), and added `project: default` to the generated Application template.
- The repository hygiene example used `kubeval --strict apps/**/*.yaml`, which depends on shell globstar behavior and an older Kubernetes validation tool. Replaced it with the current `kubectl apply --dry-run=server --validate=strict --recursive -f apps/` validation pattern from the official kubectl reference.

## Review Notes
The remaining repository organization guidance is technically sound. The Argo CD examples intentionally use placeholder repository and cluster URLs, so they are illustrative rather than directly runnable without replacing those values.
