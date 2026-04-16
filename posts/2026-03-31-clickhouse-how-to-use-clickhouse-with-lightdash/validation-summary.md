# Validation Summary: How to Use ClickHouse with Lightdash

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Lightdash (open-source BI)
- dbt (data build tool) / dbt-clickhouse adapter
- YAML schema definitions for dbt models and Lightdash metrics

## Sources Consulted
- [Connecting Lightdash to ClickHouse | ClickHouse Docs](https://clickhouse.com/docs/integrations/lightdash)
- [Lightdash ClickHouse changelog](https://changelog.lightdash.com/clickhouse-meets-lightdash-323924)
- [Lightdash docs: Update your project connection](https://docs.lightdash.com/get-started/setup-lightdash/connect-project)
- [Lightdash metrics reference](https://docs.lightdash.com/references/metrics)
- [dbt-clickhouse setup | dbt Developer Hub](https://docs.getdbt.com/docs/local/connect-data-platform/clickhouse-setup)
- [dbt-clickhouse GitHub repo](https://github.com/ClickHouse/dbt-clickhouse)
- [Integrating dbt and ClickHouse | ClickHouse Docs](https://clickhouse.com/docs/integrations/dbt)

## Issues Found
No technical issues found.

- Lightdash added native ClickHouse warehouse support (September 2025), so the workflow described (dbt project on ClickHouse → Lightdash project → metrics from `meta` tags) is officially supported.
- The `~/.dbt/profiles.yml` snippet uses correct `dbt-clickhouse` adapter fields: `type: clickhouse`, `schema`, `host`, `port: 8123` (HTTP default), `user`, `password`, `secure: false`.
- The model SQL uses valid ClickHouse functions (`toDate()`, `count()`, `uniq()`) and proper dbt `{{ source(...) }}` reference syntax.
- The Lightdash schema YAML uses the documented `meta.dimension.type` and `meta.metrics.<metric_name>.type` structure under `version: 2`.
- The `dbt init` command and `dbt run --profiles-dir ~/.dbt` invocation are correct dbt CLI usage (the `--profiles-dir` flag is the documented way to point dbt at a specific profiles directory; `~/.dbt` is also the default, so it is redundant but not wrong).

## Review Notes
- The `--profiles-dir ~/.dbt` flag in the final `dbt run` example is redundant since `~/.dbt` is dbt's default profiles directory, but it is not incorrect and can serve as an explicit reminder for readers.
- The `password: ""` example is fine for a local dev ClickHouse instance, but readers deploying to production should set a real password and use `secure: true` with port `8443` (HTTP/S) or `9440` (native TLS), as documented for ClickHouse Cloud.
- The tag list in the front matter says `Metric` (singular); the conventional Lightdash/dbt terminology is `Metrics`, but this is a tag label rather than a technical inaccuracy.
- The post does not pin specific versions of `dbt-clickhouse` or Lightdash; the syntax shown is consistent with current (2025–2026) releases of both tools.
