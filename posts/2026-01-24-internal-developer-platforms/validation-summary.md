# Validation Summary: How to Configure Internal Developer Platforms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Internal Developer Platforms
- Backstage
- Backstage Software Catalog
- Backstage Software Templates / Scaffolder
- Backstage GitHub integration and authentication
- Backstage Kubernetes plugin
- Backstage GitHub Actions plugin
- Argo CD Backstage plugin
- Jenkins Backstage annotations
- Kubernetes
- Open Policy Agent / Rego
- Prometheus / Grafana

## Sources Consulted
- Backstage catalog configuration: https://backstage.io/docs/features/software-catalog/configuration/
- Backstage GitHub discovery provider: https://backstage.io/docs/integrations/github/discovery/
- Backstage catalog descriptor format: https://backstage.io/docs/features/software-catalog/descriptor-format/
- Backstage entity references: https://backstage.io/docs/features/software-catalog/references/
- Backstage well-known annotations: https://backstage.io/docs/features/software-catalog/well-known-annotations/
- Backstage GitHub authentication provider: https://backstage.io/docs/auth/github/provider/
- Backstage sign-in resolvers: https://backstage.io/docs/auth/identity-resolver/
- Backstage software templates documentation: https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage software template UI options: https://backstage.io/docs/features/software-templates/ui-options-examples/
- Backstage built-in scaffolder actions: https://backstage.io/docs/features/software-templates/builtin-actions/
- Backstage custom scaffolder actions: https://backstage.io/docs/features/software-templates/writing-custom-actions/
- Backstage Kubernetes configuration: https://backstage.io/docs/features/kubernetes/configuration/
- Backstage community GitHub Actions plugin README: https://github.com/backstage/community-plugins/blob/main/workspaces/github/plugins/github-actions/README.md
- Argo CD Backstage plugin documentation: https://github.com/backstage/community-plugins/blob/main/workspaces/argocd/plugins/argocd/README.md
- Open Policy Agent Rego policy language: https://openpolicyagent.org/docs/policy-language
- Backstage OpenTelemetry setup: https://backstage.io/docs/tutorials/setup-opentelemetry/

## Issues Found
- The initial catalog configuration used a wildcard `catalog.locations` URL for GitHub repositories. Current Backstage docs use `catalog.providers.github` for organization discovery with `organization`, `catalogPath`, filters, and a schedule. Updated the snippet accordingly.
- The catalog snippet loaded `Group`, `User`, and `Template` entities without catalog rules allowing those kinds. Added `catalog.rules` to allow the entity kinds used by the post.
- The GitHub authentication example omitted a sign-in resolver and used nonstandard variable names. Updated it to use `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, and `usernameMatchingUserEntityName`.
- The scaffolder picker examples used an older `catalogFilter` object shape. Updated them to the documented list form.
- The template used `kubernetes:apply` as if it were a built-in scaffolder action. Backstage supports custom actions, but this action is not listed as a built-in action, so the comment now identifies it as a custom action.
- The GitHub Actions section showed a `githubActions.host` app-config block. The current community plugin uses GitHub auth/integration configuration and the `github.com/project-slug` annotation, so the block was replaced with that note.
- The Rego policy used pre-v1 rule syntax. Updated it to import `rego.v1` and use `deny contains msg if` / `has_runbook_link if`.
- The Grafana dashboard used metric names as if they were built-in Backstage metrics. Backstage documents OpenTelemetry setup but does not document those exact built-in scaffolder and catalog metrics, so the example now labels them as custom IDP metrics and uses custom metric names.

## Review Notes
The Backstage snippets remain representative examples. A working deployment still needs the relevant backend modules and frontend plugins installed and registered, including GitHub discovery, GitHub auth, Scaffolder GitHub actions, Kubernetes, Argo CD, Jenkins, and any custom `kubernetes:apply` action or custom metrics instrumentation.
