# Validation Summary: How to Use Repository Credential Templates in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- Git repository credentials
- GitHub App authentication
- ApplicationSet Git generator

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds_add/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/GoTemplate/

## Issues Found
- The credential resolution explanation incorrectly implied Argo CD checks credential templates before repository-specific credentials and falls back to repository-specific credentials only after no template matches. Updated the text to match official behavior: repository-specific credentials take priority, and templates apply only when the repository is unconfigured or configured without credential information.
- Organization-level URL prefixes used values like `https://github.com/my-org` and `git@github.com:my-org`, which can overmatch similarly named organizations because Argo CD uses prefix matching. Updated the organization-scoped examples and commands to use trailing slashes, such as `https://github.com/my-org/` and `git@github.com:my-org/`.
- The ApplicationSet example used older fasttemplate-style variables such as `{{path.basename}}`. Updated the example to current Go template usage with `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and variables such as `{{.path.basename}}`.

## Review Notes
- The Argo CD CLI was not installed locally, so CLI flags were verified against the official Argo CD command reference instead of local `--help` output.
- The GitHub App installation ID is documented as optional in current Argo CD CLI usage because Argo CD can auto-discover it, but keeping it explicit in the example is still valid.
