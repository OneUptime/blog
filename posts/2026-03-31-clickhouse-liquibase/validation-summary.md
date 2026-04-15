# Validation Summary: How to Use Liquibase with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Liquibase 4.25.0 (database schema migration tool)
- ClickHouse (columnar OLAP database)
- MEDIARITHMICS/liquibase-clickhouse (community extension)
- ClickHouse JDBC driver (`com.clickhouse.jdbc.ClickHouseDriver`)

## Sources Consulted
- Liquibase Init Commands documentation: https://docs.liquibase.com/commands/init/home.html
- Liquibase rollback-count documentation: https://docs.liquibase.com/commands/rollback/rollback-count.html
- Liquibase rollback documentation: https://docs.liquibase.com/commands/rollback/rollback.html
- Liquibase tag documentation: https://docs.liquibase.com/commands/utility/tag.html
- MEDIARITHMICS/liquibase-clickhouse GitHub repo: https://github.com/MEDIARITHMICS/liquibase-clickhouse
- Liquibase GitHub releases (verified v4.25.0 tar.gz exists): https://github.com/liquibase/liquibase/releases/tag/v4.25.0
- ClickHouse SQL reference documentation (for toYYYYMM, LowCardinality, MergeTree, ALTER TABLE syntax)
- ClickHouse JDBC driver documentation (port 8123, driver class name)

## Issues Found

1. **Non-existent `liquibase init extension` command**: The blog showed `liquibase init extension --extension-name liquibase-clickhouse` as a way to install the extension. This command does not exist in any Liquibase version. The valid `init` subcommands are `project`, `start-h2`, and `copy`. Removed the invalid command and kept only the manual JAR download method, which is the correct way to install Liquibase extensions.

2. **XML comment before XML declaration**: The changelog.xml example had `<!-- changelog.xml -->` as the first line before `<?xml version="1.0" ...?>`. An XML declaration must be the very first content in the file — any preceding content (including comments) makes the XML invalid and would cause a parsing error. Moved the filename indicator outside the code block as regular text.

3. **Deprecated positional argument syntax for CLI commands**: Three commands used legacy positional argument syntax deprecated since Liquibase 4.4:
   - `liquibase rollback-count 1` → `liquibase rollback-count --count=1`
   - `liquibase tag v1.0` → `liquibase tag --tag=v1.0`
   - `liquibase rollback v1.0` → `liquibase rollback --tag=v1.0`

4. **"Official" extension claim**: The description stated "the official ClickHouse Liquibase extension." The MEDIARITHMICS/liquibase-clickhouse extension is community-maintained, not official. Changed to "a community ClickHouse Liquibase extension."

## Review Notes
- The MEDIARITHMICS/liquibase-clickhouse project appears to be stagnating, with active fork notices (Issue #42) pointing to forks like genestack/liquibase-clickhouse for continued maintenance. This may warrant a future update to recommend an actively maintained fork.
- All ClickHouse SQL syntax in the post (toYYYYMM, LowCardinality, UInt32, Float64, MergeTree, ALTER TABLE ADD/DROP COLUMN with IF NOT EXISTS/IF EXISTS) was verified as correct.
- The JDBC configuration (port 8123, driver class `com.clickhouse.jdbc.ClickHouseDriver`, URL format) is correct for the current clickhouse-jdbc driver.
- The Liquibase release URL for v4.25.0 tar.gz was verified to exist and resolve correctly.
