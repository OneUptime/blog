# Validation Summary: How to Use Atlas with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Atlas (Ariga schema management tool)
- ClickHouse
- HCL (HashiCorp Configuration Language)
- GitHub Actions (CI/CD)

## Sources Consulted
- Atlas ClickHouse guide: https://atlasgo.io/guides/clickhouse
- Atlas HCL schema documentation: https://atlasgo.io/atlas-schema/hcl
- Atlas getting started / supported databases: https://atlasgo.io/getting-started

## Issues Found
1. **Incorrect claim about ClickHouse provider**: Post said "ClickHouse support is available via the community provider." Atlas natively supports ClickHouse as a first-class database. Changed to "ClickHouse is natively supported by Atlas."

2. **Invalid `data "hcl_file"` data source in `atlas.hcl`**: Atlas does not have a `hcl_file` data source. The standard way to reference a schema file in an env block is via the `src` attribute directly, and the dev URL is set via the `dev` attribute. Replaced the bogus `data` block and `schema { src = ... }` block with the canonical:
   ```hcl
   env "clickhouse" {
     url = "clickhouse://default:@localhost:9000/analytics"
     src = "file://schema.hcl"
     dev = "clickhouse://default:@localhost:9000/dev_analytics"
   }
   ```

3. **SQL comment style inside HCL block**: The schema example used `-- schema.hcl` as a comment, but HCL uses `#` (or `//`) for comments. Changed to `# schema.hcl`.

4. **Engine specified as a quoted string**: `engine = "MergeTree()"` is incorrect. Per Atlas ClickHouse docs, the engine is a bare identifier: `engine = MergeTree`. Fixed.

5. **`LowCardinality(String)` used as a bare type**: Atlas only accepts a defined set of types as bare identifiers; complex/parameterised ClickHouse types must be wrapped via `sql()`. Changed `type = LowCardinality(String)` to `type = sql("LowCardinality(String)")`.

6. **Non-existent `index "order_by"` block with `type = "ORDER BY"`**: Atlas's HCL has no such index type. ClickHouse's ORDER BY in Atlas is derived from the `primary_key`/sort definition; the made-up `index "order_by"` block was removed. The `primary_key` block already covers `(user_id, ts)`.

## Review Notes
- The CLI commands (`atlas schema inspect`, `atlas schema diff`, `atlas schema apply`, `atlas migrate diff`, `atlas migrate apply`) and their flags (`--url`, `--from`, `--to`, `--dir`, `--dev-url`) all match the official Atlas CLI.
- The installation snippet is correct: `brew install ariga/tap/atlas` and `curl -sSf https://atlasgo.sh | sh`.
- The ClickHouse connection URL format `clickhouse://default:@localhost:9000/analytics` is valid.
- The post uses a separate database (`dev_analytics`) on the same server as the dev URL. Atlas docs commonly show `docker://clickhouse/<version>/dev` as the dev URL, which spins up an ephemeral instance and is generally safer; the post's approach works but requires the dev DB to exist.
- For ClickHouse columns, `null` defaults to `false` in Atlas; nullability/`Nullable(...)` would also need the `sql()` wrapper if used. None of the example columns required this.
