# Validation Summary: Scale Databricks Bundles with Monorepos and Shared Code

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Databricks Declarative Automation Bundles
- Databricks CLI bundle commands
- YAML bundle configuration
- Lakeflow Jobs and task libraries
- Unity Catalog volumes and permissions
- Python wheel packaging
- Monorepo and shared-source strategies
- CI/CD, deployment identities, and custom bundle templates

## Sources Consulted

- [Sharing bundles and bundle files](https://docs.databricks.com/aws/en/dev-tools/bundles/sharing)
- [Declarative Automation Bundles configuration](https://docs.databricks.com/aws/en/dev-tools/bundles/settings)
- [`bundle` command group](https://docs.databricks.com/aws/en/dev-tools/cli/bundle-commands)
- [Develop Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/work-tasks)
- [Substitutions and variables in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/variables)
- [Configure job parameters in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-parameters)
- [Declarative Automation Bundles resources](https://docs.databricks.com/aws/en/dev-tools/bundles/resources)
- [Declarative Automation Bundles project templates](https://docs.databricks.com/aws/en/dev-tools/bundles/templates)
- [Specify a run identity for a Declarative Automation Bundles workflow](https://docs.databricks.com/aws/en/dev-tools/bundles/run-as)
- [Migrate to the direct deployment engine](https://docs.databricks.com/aws/en/dev-tools/bundles/direct)
- [Create a new job — Jobs API](https://docs.databricks.com/api/workspace/jobs/create)
- [Install libraries](https://docs.databricks.com/aws/en/libraries/)
- [Allowlist libraries and init scripts on compute with standard access mode](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/allowlist)
- [Unity Catalog securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)

## Issues Found

- The shared-file explanation described relative paths as being resolved "as part of" the sync root. Changed it to the documented behavior: when a `sync.paths` entry traverses above the bundle root, the CLI dynamically selects a higher common-ancestor sync root to preserve the directory structure.
- The wheel example placed `libraries` at the top level, which is not a valid bundle configuration location for a job library. Nested the wheel under a job task's `libraries` field.
- The package tradeoff stated that Python wheel use can require library allowlisting on standard compute. Databricks' Unity Catalog allowlist applies to JARs, Maven coordinates, and init scripts, not Python wheels. Replaced that claim with the applicable `USE CATALOG`, `USE SCHEMA`, and `READ VOLUME` privilege requirements for a volume-hosted wheel.

## Review Notes

The remaining commands, substitutions, target configuration, lookup behavior, deployment identity guidance, selective-deployment warning, template behavior, resource binding guidance, and documentation URLs match the current official documentation. The snippets are intentionally conceptual and still require workspace-specific authentication, compute/task settings, existing files, and permissions before deployment.
