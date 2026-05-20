# Validation Summary: How to Integrate ArgoCD with Backstage Service Catalog

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Backstage Software Catalog
- Roadie Backstage Argo CD plugin
- Argo CD
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- YAML, TypeScript, Bash, curl, jq, kubectl, and argocd CLI

## Sources Consulted
- Roadie Backstage Argo CD Plugin documentation: https://roadie.io/backstage/plugins/argo-cd/
- Roadie `@roadiehq/backstage-plugin-argo-cd` package README and type declarations from npm package version 2.12.5
- Roadie `@roadiehq/backstage-plugin-argo-cd-backend` package README and package metadata from npm package version 4.8.0
- Argo CD local user management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Backstage catalog descriptor format documentation: https://backstage.io/docs/features/software-catalog/descriptor-format/

## Issues Found
- The post described the Roadie Argo CD plugin as an official Backstage plugin. Changed this to describe it as a community plugin from Roadie.
- The single-instance `app-config.yaml` used `argocd.baseUrl` and a top-level `token` as the API connection configuration. Updated it to use `argocd.appLocatorMethods[].instances[]` with `url` and `token`, matching the current Roadie backend plugin configuration.
- The `EntitySwitch.Case` example passed `isArgocdAvailable` directly. Updated it to wrap the condition as `entity => Boolean(isArgocdAvailable(entity))`, matching the plugin documentation and Backstage entity switch usage.
- The Argo CD RBAC example included `clusters` and `projects` read permissions but omitted permissions documented for the plugin. Updated the example to include `applications get`, `applications list`, and `logs get`.
- The multiple-instance catalog annotation examples used `argocd/app-name: production/payment-service`. Updated them to use `argocd/app-name: payment-service` plus `argocd/instance-name: production`, matching the plugin's documented annotation model.
- The generated catalog script was fenced as YAML even though it is Bash. Changed the code fence language to `bash`.

## Review Notes
The post is technically relevant and valid after the corrections above. The tutorial uses the Roadie plugin and the current Backstage backend system; readers using the older proxy-only frontend setup may need the alternate proxy configuration from the plugin README, but the backend-plugin path shown here is valid.
