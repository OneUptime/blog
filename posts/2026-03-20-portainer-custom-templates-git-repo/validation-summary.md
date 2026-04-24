# Validation Summary: How to Create Custom Templates from a Git Repository in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Git repositories
- GitHub personal access tokens
- GitLab deploy tokens
- Gitea access tokens

## Sources Consulted
- Portainer custom templates documentation: https://docs.portainer.io/user/docker/templates/custom
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Git token permissions FAQ: https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens
- Portainer source code for custom template creation: https://github.com/portainer/portainer/blob/develop/api/http/handler/customtemplates/customtemplate_create.go
- Portainer source code for custom template variable parsing: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/utils.ts
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab deploy tokens documentation: https://docs.gitlab.com/ee/user/project/deploy_tokens.html
- Gitea API usage documentation: https://docs.gitea.com/1.25/development/api-usage

## Issues Found
- The Compose example used unsupported Go-template-style syntax such as `{{ .var | default "value" }}`. Portainer custom template variables are parsed as Mustache placeholders, so I replaced those with supported `{{ variable_name }}` placeholders and moved default handling to Portainer's variable definitions.
- The original Compose example was not valid YAML as written because of nested double quotes inside the templated port mappings. I corrected the example so the YAML is syntactically valid after Portainer renders the variables.
- The prerequisites implied the full variable workflow worked in Portainer CE. I clarified that Portainer 2.x can create custom templates, but custom template variables are a Portainer Business Edition feature.
- The Portainer UI guidance was partly inaccurate. I corrected the navigation path to `Templates > Custom`, changed `Compose file path` to Portainer's `Compose path` field name, and updated the repository credential wording to match the current UI and provider behavior.
- The metadata example listed unsupported or incorrect custom template fields. I removed `Categories`, which is not a custom template field, and corrected `Type` from `Stack` to `Standalone / Podman`, which is the actual option for a Docker Compose-backed custom template.
- The GitHub token guidance used a nonexistent `repo:read` scope. I corrected it to the documented options: a classic PAT with `repo`, or a fine-grained PAT scoped to the target repository with `Contents: Read-only`.
- The save/update behavior overstated what Portainer validates and when updates occur. I changed the text to reflect that Portainer clones the repository and verifies the referenced compose file exists, and clarified the difference between moving refs like branches and pinned refs like tags.

## Review Notes
- The post is now technically accurate for Portainer 2.x custom templates backed by a Git repository.
- The example still uses `:latest` image tags. That is valid, but pinning explicit image versions would make deployments more reproducible in future revisions.
