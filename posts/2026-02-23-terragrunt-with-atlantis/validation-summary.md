# Validation Summary: How to Use Terragrunt with Atlantis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Atlantis
- Terragrunt
- Terraform
- Docker
- YAML configuration
- GitOps pull request workflows

## Sources Consulted
- Atlantis Custom Workflows: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis Server Side Repo Config: https://www.runatlantis.io/docs/server-side-repo-config
- Atlantis Repo Level atlantis.yaml Config: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis Server Configuration: https://www.runatlantis.io/docs/server-configuration
- Atlantis Locking: https://www.runatlantis.io/docs/locking
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt HCL fmt command reference: https://docs.terragrunt.com/reference/cli/commands/hcl/fmt/
- Terragrunt global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt GitHub releases: https://github.com/gruntwork-io/terragrunt/releases

## Issues Found
- The Terragrunt Docker example pinned `TERRAGRUNT_VERSION=0.55.0`, which is outdated for a current guide. Updated it to `1.0.4`, the current GitHub release observed during validation, and verified the release asset URL resolves.
- The server-side repo config section called the file `atlantis.yaml` and described it as also called `repos.yaml`. Atlantis documents server-side repo config as a file such as `repos.yaml` passed via `--repo-config`, while repo-level config is normally `atlantis.yaml`. Updated the prose and snippet comments to avoid conflating the two.
- The server-side `allowed_overrides` list omitted `apply_requirements`, but later repo-level examples set `apply_requirements`, a restricted key. Added `apply_requirements` to `allowed_overrides`.
- The custom workflow used the older `TERRAGRUNT_TFPATH` environment variable. Updated it to `TG_TF_PATH`, matching current Terragrunt CLI documentation and Atlantis' Terragrunt example.
- The generated config script used `find infrastructure -name "terragrunt.hcl" -not -path "*/terragrunt.hcl"`, which excludes every matching file. Changed the exclusion to only skip `infrastructure/terragrunt.hcl`.
- The dependency example said `depends_on` makes Atlantis plan a project after another project. Atlantis documents `depends_on` as enforcing apply dependencies; planning/applying order is handled with `execution_order_group`. Added execution order groups and corrected the comment.
- The `run-all` examples used legacy `terragrunt run-all` and `--terragrunt-non-interactive`. Updated the examples and surrounding text to current `terragrunt run --all --non-interactive -- ...` syntax.
- The formatting check used the old `terragrunt hclfmt --terragrunt-check` command. Updated it to `terragrunt hcl fmt --check`.
- The environment variable example used `TERRAGRUNT_DOWNLOAD` and recommended `TF_PLUGIN_CACHE_DIR`. Updated the Terragrunt cache variable to `TG_DOWNLOAD_DIR` and removed `TF_PLUGIN_CACHE_DIR`, which current Terragrunt docs caution against for multi-unit `run --all` workflows.
- The sensitive output section used `silence_no_projects` to suppress plan output, but Atlantis documents that as a server flag for PRs with no matching project. Updated the examples to use `silence_pr_comments: [plan]`.

## Review Notes
The `run --all` workflow remains less granular than project-per-directory workflows and does not preserve per-project Atlantis plan files. The post already notes the reduced granularity; teams should test this pattern against their approval and audit requirements before using it for production applies.
