# Validation Summary: How to Use dbt Seeds and Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dbt (data build tool) — seeds and sources
- YAML configuration for dbt projects
- SQL / Jinja templating in dbt models
- CSV file format
- Data warehouse concepts (sources, staging, marts)
- Mermaid diagrams

## Sources Consulted
- dbt seed command reference: https://docs.getdbt.com/reference/commands/seed
- dbt source command (freshness): https://docs.getdbt.com/reference/commands/source
- Seed properties reference: https://docs.getdbt.com/reference/seed-properties
- Source properties reference: https://docs.getdbt.com/reference/source-properties
- "Add Seeds to your DAG" guide: https://docs.getdbt.com/docs/build/seeds
- `run_query` Jinja function: https://docs.getdbt.com/reference/dbt-jinja-functions/run_query
- State comparison caveats (seed file size): https://docs.getdbt.com/reference/node-selection/state-comparison-caveats
- Resource configs and quoting: https://docs.getdbt.com/reference/resource-configs/quoting

## Issues Found

1. **"Seed-Based Feature Flags" example did not actually use the seed.** The original SQL block declared a `feature_flags.csv` seed but then read the flag value from `var('use_new_attribution', false)`, which pulls from `dbt_project.yml` vars — a mechanism completely unrelated to seeds. The example was rewritten to use `run_query` against `{{ ref('feature_flags') }}` inside an `{% if execute %}` guard, which is the documented way to read seed values at compile time.

2. **Source-quoting example would have produced double-quoted identifiers.** The original YAML set both `quoting.identifier: true` *and* `identifier: '"order"'` / `identifier: '"user"'` (with literal double quotes). With `quoting.identifier: true`, dbt already wraps the identifier in the database-specific quote character, so passing in a pre-quoted string produces output like `""order""`, which is invalid in most warehouses. Fixed by removing the literal quoting from the `identifier:` fields and relying on `quoting.identifier: true` to handle it. The inline comment was updated to reflect what `quoting.identifier: true` actually does.

## Review Notes

- The `tests:` keyword used throughout the YAML examples was renamed to `data_tests:` starting in dbt v1.10; `tests:` still works as an alias and emits a deprecation warning. Left as-is because both forms are valid in current dbt and the legacy form is still ubiquitous, but a future revision may want to switch.
- As of dbt v1.10, the modern shape for source-level `freshness` and `loaded_at_field` is to nest them under a `config:` block. The top-level forms shown in the post still work and are widely used, so they were left in place.
- The "Seeds load entirely into memory during compilation. Keep them under 1MB." line is a slight simplification — the 1 MiB threshold is specifically the file-hash limit used by `state:modified` comparison, not a hard memory ceiling. The broader guidance to keep seeds small is correct, so the wording was left alone.
- CSV code blocks include `-- seeds/<name>.csv` header lines as visual file-path labels. CSV itself has no comment syntax, so these lines would be parsed as data if copied verbatim into a `.csv` file. Left in place because this labeling convention is widespread in dbt tutorials and the surrounding prose makes the intent clear.
- The illustrative `dbt source freshness` console output is paraphrased rather than verbatim dbt output; the gist (PASS/WARN against an age threshold) is accurate.
