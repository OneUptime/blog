# Validation Summary: How to Catch Breaking Column Changes in CI with Lineage-Based Impact Analysis

## Status
validated

## Post Type
Technical implementation guide with illustrative Python, JSON, YAML, GitHub Actions, and dbt commands.

## Technologies Covered
- Column contracts, schema compatibility, and field-level data lineage
- OpenLineage Lineage and Column Lineage Dataset Facets
- Python collections.deque and graph traversal
- PostgreSQL numeric types and nullability
- GitHub Actions and artifact uploads
- dbt build, state selection, manifests, and deferral
- Power BI as an illustrative downstream consumer

## Sources Consulted
- OpenLineage Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- OpenLineage Column Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- Python collections and deque: https://docs.python.org/3/library/collections.html#collections.deque
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL numeric types: https://www.postgresql.org/docs/current/datatype-numeric.html
- dbt state selector methods: https://docs.getdbt.com/reference/node-selection/methods#state
- dbt graph operators: https://docs.getdbt.com/reference/node-selection/graph-operators
- dbt defer and favor-state: https://docs.getdbt.com/reference/node-selection/defer
- dbt build: https://docs.getdbt.com/reference/commands/build
- dbt manifest artifact: https://docs.getdbt.com/reference/artifacts/manifest-json
- dbt state comparison caveats: https://docs.getdbt.com/reference/node-selection/state-comparison-caveats
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions status expressions: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#always
- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use
- Checkout v4 documentation: https://github.com/actions/checkout/tree/v4
- Upload Artifact documentation: https://github.com/actions/upload-artifact
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. Nullability classification covered only nullable-to-required changes. Added required-to-nullable detection and a conservative policy entry because readers can depend on non-null values. Clarified that tightening nullability also requires producer and migration checks, irrespective of downstream consumers; scoped the downstream decision table accordingly.
2. Traversal did not identify which revision supplies edges for deleted fields. Clarified that removed and renamed fields must be traced through production-baseline lineage to avoid losing existing dependencies. Also included indirect filter and join dependencies, which OpenLineage explicitly models.
3. The Python helper consumed the starting iterable twice, so generator inputs could produce an empty queue. Initialized the queue from the materialized set. Clarified that the helper computes reachability only and that the evaluator must separately record predecessor edges for path reports.
4. The OpenLineage description did not state facet precedence and could imply that transformation classifications belonged only to the older facet. Clarified that the new facet includes transformations and supersedes the older facet for overlapping relationships, with explicit preference when both are present.
5. The CI example requested report uploads in prose but had no upload step. Added actions/upload-artifact@v7 with always() so reports are uploaded after policy failures, and documented the custom evaluator's obligation to write both reports before exiting.
6. The CI path filter excluded evaluator and workflow changes despite requiring fixtures on evaluator changes. Added ci/** and .github/workflows/** to the trigger paths.
7. The evaluator exit guidance allowed nonzero exits only for policy conditions, potentially implying operational errors should pass. Corrected it to fail on evaluation errors and missing or unreadable inputs.
8. The example invoked project-specific scripts without explaining that they were unimplemented integration points. Explicitly identified their implementation, dependency setup, and report-generation requirements.

## Review Notes
- Verified dbt build, state:modified+, --state, --defer, and --favor-state against official documentation. State selection works at resource granularity; it does not establish column impact. Keeping the comparison manifest outside the target directory is correct.
- Verified the contract JSON syntax and PostgreSQL bigint/numeric(12,2) types. Contract, policy, and migration-exception formats are illustrative project-owned schemas, not vendor configuration formats.
- Executed the Python helper against a diamond graph with a cycle and reachable fake dashboard, generator starts, empty starts, and an isolated field. All assertions passed. Parsed the JSON example and all YAML snippets successfully (using PyYAML BaseLoader for syntax without YAML 1.1 boolean coercion of the workflow on key).
- The workflow and dbt command were reviewed against official documentation, not executed against a warehouse or GitHub Actions runner. The repository-specific evaluator and metadata scripts are not supplied by the post; coverage handling, migration approval, and complete report generation require their implementation.
- actions/checkout@v4 remains a valid explicitly versioned example; it is not presented as the latest release. The added upload action follows the consulted official documentation. Production actions should be pinned to reviewed commit SHAs as the post states.
- GitHub workflow path filters should include every project-specific contract, macro, policy, and exception location. A workflow skipped by path filtering can leave a required check pending; branch protection configuration must account for that.
- A review or owner-approval outcome must prevent merging until resolved through the project's policy mechanism. Aggregate coverage percentages alone do not establish completeness for a particular changed field.
- External documentation and author URLs resolved to the intended resources, including canonical redirects. The warehouse hostname and dashboard path are illustrative, not live integrations.
