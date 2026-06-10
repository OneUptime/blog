# Validation Summary: How to Configure CircleCI Contexts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (Contexts feature)
- CircleCI CLI
- CircleCI Configuration (`config.yml`, version 2.1)
- AWS CLI (used in examples)
- Docker convenience images (`cimg/aws`, `cimg/base`, `cimg/node`)
- Mermaid diagrams (illustrative only)

## Sources Consulted
- CircleCI Contexts documentation: https://circleci.com/docs/contexts/
- CircleCI Local CLI installation docs: https://circleci.com/docs/local-cli/
- CircleCI CLI command reference: https://circleci-public.github.io/circleci-cli/circleci_context.html
- `circleci context create` reference: https://circleci-public.github.io/circleci-cli/circleci_context_create.html
- `circleci context store-secret` reference: https://circleci-public.github.io/circleci-cli/circleci_context_store-secret.html

## Issues Found
- **Deprecated CLI syntax**: The post used the legacy positional-argument form for the `circleci context` subcommands (e.g. `circleci context create github your-org production-aws`). According to the current CircleCI CLI docs, that form is marked as deprecated and the supported invocation uses the `--org-id <org-id>` flag with only the context (and, where applicable, secret) name as a positional argument. Updated every CLI example in both the "Using the CircleCI CLI" section and the "Rotation Procedure" section to the modern `--org-id <org-id>` flag form, and adjusted the surrounding comment that said "Replace 'your-org' with your actual organization name" to instruct the reader to use their organization ID instead. Also clarified that `store-secret` reads the value from stdin (rather than the slightly misleading "the CLI will prompt for the value").

## Review Notes
- The claim that "Variables from later contexts override earlier ones if there are naming conflicts" is correct per current CircleCI documentation ("Contexts are applied in order, so in the case of overlaps, later contexts override earlier ones").
- The Homebrew (`brew install circleci`) and curl install-script URL (`https://raw.githubusercontent.com/CircleCI-Public/circleci-cli/main/install.sh`) match the official install docs.
- `circleci setup` is the correct authentication / setup command for the CLI.
- The pipeline value expressions used in the Expression-Based Restrictions section (`pipeline.git.branch`, `pipeline.git.tag`, `pipeline.project.slug`) are valid CircleCI pipeline values.
- The YAML configuration examples (version 2.1, `workflows`, `jobs`, `context:`, parameter types, `requires`, approval jobs, branch filters) follow the documented CircleCI 2.1 schema.
- The Docker image tags `cimg/base:current` and `cimg/node:20.10` are valid CircleCI convenience-image references. `cimg/aws:2024.03` follows the documented `YYYY.MM` tagging convention for that image.
- No further version-specific caveats. Readers on CircleCI Server (self-hosted) may still need to also pass `--host` to the CLI; that is an environment-specific detail rather than a correctness issue.
