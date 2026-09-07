# How to Catch Breaking Column Changes in CI with Lineage-Based Impact Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, CI/CD, Impact Analysis, Data Quality, Schema Migration

Description: Diff column contracts in CI, traverse verified downstream lineage, and block changes that would break models, metrics, or dashboards.

---

A schema diff can tell you that `orders.discount_amount` disappeared. It cannot tell you whether that field feeds a finance metric, an executive dashboard, or nothing at all. Lineage-based impact analysis joins two facts: what changed and what consumes the changed field.

The safe CI gate is conservative. It blocks a known breaking change with reachable production consumers, reports uncertainty separately, and never treats missing lineage as proof that a change is harmless.

## Version the three required inputs

Store immutable artifacts for the production baseline and build new artifacts for the proposed revision:

1. A column contract containing canonical dataset IDs, names, types, and nullability.
2. Field-level lineage edges with producer and capture metadata.
3. Consumer metadata containing ownership, environment, criticality, and deployment state.

One compact contract format is:

```json
{
  "dataset": {
    "namespace": "postgres://warehouse.example:5432",
    "name": "warehouse.analytics.orders"
  },
  "version": "production-2026-09-06",
  "fields": {
    "order_id": {"type": "bigint", "nullable": false},
    "discount_amount": {"type": "numeric(12,2)", "nullable": true}
  }
}
```

Do not compare a pull request to whatever the catalog returns during CI. Production may change while the job runs. Download or check out a baseline tied to the deployed revision, then label the candidate with the commit SHA.

## Classify changes before traversing lineage

At minimum, identify:

- removed fields
- renamed fields, represented as a remove plus add unless a migration declares the rename
- type changes, including precision and scale
- nullability changes in both directions
- semantic changes declared by the author even when the SQL type stays the same

Required-to-nullable changes can break readers that assume non-null values. Nullable-to-required changes can reject existing data or writes and need producer and migration checks even when there are no downstream readers. An added nullable field is usually compatible. A widening numeric type may be compatible for one consumer but unsupported by another. Put engine-specific rules in policy data rather than hard-coding them into graph traversal.

```yaml
policies:
  remove: breaking
  rename_without_alias: breaking
  nullable_to_required: breaking
  required_to_nullable: breaking
  numeric_precision_decrease: breaking
  add_nullable: compatible
```

Require an explicit annotation for semantic changes such as changing currency from dollars to cents. No catalog diff can infer that safely.

## Traverse at field granularity

Represent edges from input field to output field. For removed or renamed fields, start from the production-baseline graph so candidate lineage cannot erase existing dependencies. Include indirect dependencies such as filters and join keys. Starting from each changed field, compute the downstream closure:

```python
from collections import deque

def downstream_closure(starts, adjacency):
    found = set(starts)
    queue = deque(found)
    while queue:
        current = queue.popleft()
        for child in adjacency.get(current, []):
            if child not in found:
                found.add(child)
                queue.append(child)
    return found
```

This helper returns only reachability. In the evaluator, also record predecessor edges to preserve the path, not just the final set. Reviewers need an explanation such as:

```text
raw.orders.discount_amount
  -> staging.stg_orders.discount_amount
  -> finance.fct_orders.net_revenue
  -> Power BI measure Gross Margin
```

If the graph has only table-level lineage for one hop, widen the result and label it `POSSIBLE_IMPACT`. Do not invent column edges. OpenLineage's current Lineage Dataset Facet can describe precise dataset and field relationships, including transformation classifications. It supersedes the older Column Lineage Dataset Facet for the relationships it describes; when both are present for the same dataset, consumers should prefer the Lineage Dataset Facet. Support the older facet for existing producers.

## Turn findings into a policy decision

After producer and migration checks pass, a practical decision table for downstream impact is:

| Change | Reachable production consumer | Result |
| --- | --- | --- |
| Compatible | Any | Pass and report |
| Breaking | None, coverage complete | Pass with evidence |
| Breaking | One or more | Block |
| Breaking | Unknown because lineage is incomplete | Require review |
| Semantic | Any | Require owner approval |

Coverage must be part of the decision. Record the percentage of production datasets with fresh schemas, the percentage of jobs emitting lineage, and the age of the relevant edges. An empty downstream result from a stale catalog is not a clean bill of health.

## Add the CI job

Keep the gate deterministic and make its artifacts reviewable. The scripts and evaluator below are project-specific components you must implement, including dependency setup and writing both `artifacts/impact.json` and `artifacts/impact.md` before returning the policy exit code:

```yaml
name: lineage-impact

on:
  pull_request:
    paths:
      - 'models/**'
      - 'migrations/**'
      - 'ci/**'
      - '.github/workflows/**'

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Download deployed metadata baseline
        run: ./ci/fetch-lineage-baseline.sh production artifacts/baseline
      - name: Build candidate schema and lineage
        run: ./ci/build-lineage-candidate.sh artifacts/candidate
      - name: Evaluate downstream impact
        run: >-
          python ci/check_lineage_impact.py
          --baseline artifacts/baseline
          --candidate artifacts/candidate
          --report artifacts/impact.md
      - name: Upload impact reports
        if: ${{ always() }}
        uses: actions/upload-artifact@v7
        with:
          name: lineage-impact
          path: |
            artifacts/impact.json
            artifacts/impact.md
          if-no-files-found: error
```

Pin third-party actions to reviewed commit SHAs in a hardened repository. The example uses a major tag for readability, but a production policy should follow your supply-chain controls.

The evaluator should exit nonzero for configured blocking conditions and evaluation errors. Missing or unreadable inputs must not produce a passing result. Always upload the machine-readable result and a short Markdown path report so a reviewer can distinguish a real impact from a coverage problem.

## Use dbt state without confusing it with column impact

dbt can compare a current project with a prior `manifest.json` through state selection. A common candidate command is:

```bash
dbt build \
  --select 'state:modified+' \
  --state artifacts/baseline/dbt \
  --defer \
  --favor-state
```

State selection identifies modified dbt resources and graph descendants. It does not by itself prove which individual columns break. Use it to choose builds and tests, then apply the schema and field-lineage gate to the resulting relations.

Keep the state directory separate from the command's `target` directory. Otherwise dbt can overwrite the very manifest used for comparison.

## Support reviewed migrations

Some breaking changes are intentional. Make the exception specific, temporary, and owned:

```yaml
change_id: FIN-4821
dataset:
  namespace: postgres://warehouse.example:5432
  name: warehouse.analytics.orders
field: discount_amount
allowed_until: 2026-09-21
approved_by: finance-analytics
replacement: promotion_discount_amount
```

The gate should verify that the replacement exists and show whether consumers have migrated. Expired exceptions fail closed. A blanket skip label on the pull request is too broad and leaves no durable migration history.

## Test the gate itself

Create graph fixtures for a diamond dependency, a cycle, a table-level gap, an unversioned edge, and a renamed field. Include a canary breaking change that must reach a fake critical dashboard. Run that fixture on every change to the evaluator.

In shadow mode, compare predicted impacts with real deployment failures and owner feedback. Tune compatibility rules, but do not tune away missing coverage. Report false negatives as the highest-severity defect because they create unwarranted confidence.

## Conclusion

A useful lineage gate combines a reproducible schema diff, field-level downstream paths, freshness and coverage evidence, and an explicit compatibility policy. Use dbt state to target execution, use lineage to explain consumer impact, and require narrow reviewed exceptions for planned migrations.

## Official Documentation

- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [OpenLineage column-level lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [dbt state selection](https://docs.getdbt.com/reference/node-selection/methods#state)
- [dbt defer](https://docs.getdbt.com/reference/node-selection/defer)
- [dbt manifest artifact](https://docs.getdbt.com/reference/artifacts/manifest-json)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
