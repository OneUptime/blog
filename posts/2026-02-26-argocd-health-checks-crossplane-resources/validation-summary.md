# Validation Summary: How to Configure Health Checks for Crossplane Resources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Lua custom health checks
- Argo CD community Helm chart
- Kubernetes ConfigMaps and custom resources
- Crossplane managed resources
- Crossplane composite resources and claims
- Crossplane provider packages

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD resource override health command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo Helm `argo-cd` chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane composite resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane providers documentation: https://docs.crossplane.io/latest/packages/providers/

## Issues Found
- The original Argo CD wildcard examples used `resource.customizations.health.*.crossplane.io_*` and similar keys. Argo CD documents that wildcard matching is supported under the `resource.customizations` YAML block, not in `resource.customizations.health.<group>_<kind>` ConfigMap keys. I changed the wildcard examples to use `resource.customizations: |` with `"group/kind"` patterns and `health.lua`.
- The post described `*.crossplane.io_*` as a catch-all for any Crossplane API group and kind. That was too broad and used invalid syntax. I changed the explanation to `"*.crossplane.io/*"` and clarified that it matches groups ending in `.crossplane.io`.
- The AWS provider health check used an invalid wildcard ConfigMap key and an imprecise provider group example. I changed the snippet to use the documented `resource.customizations` format and updated the API group note to mention service-specific Upbound AWS groups such as `ec2.aws.upbound.io` and `ec2.aws.m.upbound.io`.
- The composite resource example used `resource.customizations.health.*.crossplane.io_XR*`, but XR and claim API groups are defined by the XRD and are not necessarily under `.crossplane.io`, and wildcard kind matching belongs under `resource.customizations`. I changed the example to an `example.org/*` customization and added a note to replace it with the user's XRD and claim groups.
- The Helm values example used `server.config`, which is not the current community `argo-cd` chart path for `argocd-cm` values. I changed it to `configs.cm`, matching the chart documentation.
- The introductory claim that Argo CD marks Crossplane CRDs healthy by default was too strong. I changed it to say Argo CD does not derive health from Crossplane provisioning conditions without custom health checks.

## Review Notes
- The Crossplane condition descriptions for managed resources, composite resources, and provider packages align with the current Crossplane documentation.
- The `argocd app get my-infrastructure-app --refresh` command is valid according to the Argo CD command reference.
- YAML snippets in the post were parsed after edits to confirm syntactic validity.
