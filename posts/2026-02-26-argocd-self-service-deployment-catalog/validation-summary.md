# Validation Summary: How to Build Self-Service Deployment Catalog with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Argo CD AppProjects
- Kubernetes Deployments and Services
- Kustomize
- GitHub Actions
- GitHub CLI
- Bash
- yq

## Sources Consulted
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Matrix generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/projects/
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- GitHub Actions runner images Ubuntu 24.04 software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes liveness and readiness probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/

## Issues Found
- The base Kubernetes template used placeholder values such as `SERVICE_NAME` and `TEAM_NAME` in fields that Argo CD and Kustomize would not replace. I changed the base resource names and labels to valid generic values and moved service-specific naming and labels into the ApplicationSet Kustomize configuration.
- The first ApplicationSet example referenced `environment`, `cluster`, and `tag` fields while reading `services/*/config.yaml`, whose shown structure contained an `environments` list instead of flat per-target values. I changed that example to use one YAML file per service/environment target so every referenced template parameter exists.
- The ApplicationSet examples used legacy-style `{{name}}` placeholders while the current documented Go-template form requires `goTemplate: true` and dot-prefixed fields such as `{{.name}}`. I updated both examples to use `goTemplate: true`, `goTemplateOptions`, and current template syntax.
- The matrix generator example used environment entries with a `name` key, which conflicts with the service-level `name` key when matrix generator outputs are merged. I renamed the environment field to `environment` and updated all references.
- The matrix generator example used `elementsYaml: "{{environments}}"`, which is not the documented Go-template form for dynamically passing a list from a Git file generator into a List generator. I changed it to `elementsYaml: "{{ .environments | toJson }}"`.
- The generated Argo CD Application labels did not include the `service` label used by the CLI status command. I added `service: "{{.name}}"` to the ApplicationSet labels.
- The Kustomize examples did not ensure unique resource names and selector labels per service. I added `namePrefix`, `commonLabels`, and `forceCommonLabels` to the ApplicationSet Kustomize configuration.
- The CI validation used `yq e` checks that can still succeed when a field is null. I changed those checks to `yq e -e` so missing/null fields fail validation.
- The AppProject snippet labeled the `roles` block as "Resource limits", which was technically inaccurate. I changed the comment to "Project roles".

## Review Notes
- The examples assume target clusters have already been registered with Argo CD, which matches the ApplicationSet documentation.
- The GitHub Actions snippet relies on tools available on the current `ubuntu-latest` runner image, including `yq` and `gh`.
- The CLI remains intentionally simplified and does not validate missing arguments or sanitize service names before writing YAML.
