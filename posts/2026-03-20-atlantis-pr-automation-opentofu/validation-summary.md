# Validation Summary: How to Use Atlantis for Pull Request Automation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Atlantis
- OpenTofu
- GitHub/GitLab pull request webhooks
- Docker Compose
- YAML-based Atlantis configuration

## Sources Consulted
- Atlantis Introduction: https://www.runatlantis.io/guide
- Atlantis Deployment: https://www.runatlantis.io/docs/deployment.html
- Atlantis Using Atlantis: https://www.runatlantis.io/docs/using-atlantis
- Atlantis Locking: https://www.runatlantis.io/docs/locking
- Atlantis Command Requirements: https://www.runatlantis.io/docs/command-requirements
- Atlantis Custom Workflows: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis Repo Level atlantis.yaml Config: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis Server Configuration: https://www.runatlantis.io/docs/server-configuration
- Atlantis Server Side Repo Config: https://www.runatlantis.io/docs/server-side-repo-config
- OpenTofu Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Command: apply: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu Command: init: https://opentofu.org/docs/v1.11/cli/commands/init/

## Issues Found
- The post said Atlantis runs `tofu apply` on merge. I corrected the description and introduction to reflect current Atlantis behavior: Atlantis automatically plans on pull requests, and applies when a user comments `atlantis apply`.
- The post used `ATLANTIS_TERRAFORM_COMMAND`, which is not the current documented Atlantis setting for selecting OpenTofu. I replaced it with `ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu`, which is the current server-side configuration for using OpenTofu with built-in plan/apply steps.
- The server-side repo configuration example said `allow_custom_workflows: true` was enough for repos to override workflows. Current Atlantis docs also require `allowed_overrides: [workflow]`, so I added that key to make the example correct.

## Review Notes
Current Atlantis versions also support `terraform_distribution: opentofu` in `atlantis.yaml` for per-project OpenTofu selection. The post's custom workflow approach remains technically valid after the fixes above.
