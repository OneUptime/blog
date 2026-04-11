# Validation Summary: How to Monitor MySQL with New Relic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- New Relic Infrastructure Agent
- nri-mysql (New Relic MySQL on-host integration)
- NRQL (New Relic Query Language)
- New Relic Alerts

## Sources Consulted
- New Relic MySQL integration documentation: https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/mysql/mysql-integration/
- New Relic MySQL integration configuration: https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/mysql/mysql-config/
- nri-mysql GitHub repository (spec.csv for metric names, mysql-config.yml.sample for config format): https://github.com/newrelic/nri-mysql
- New Relic open-install-library MySQL recipe: https://github.com/newrelic/open-install-library

## Issues Found

### 1. Incorrect NRQL metric attribute names (all 5 metrics wrong)
**What was wrong:** All metric names in the NRQL queries and the "Key Metrics Available" section used a fabricated `mysql.node.` prefix that does not exist in the nri-mysql integration. A reader following these examples would get empty query results.

**Changes made:**
- `mysql.node.query.perSecond` changed to `query.queriesPerSecond`
- `mysql.node.net.connections` changed to `net.threadsConnected`
- `mysql.node.innodb.bufferPoolPages` changed to `db.innodb.bufferPoolPagesTotal`
- `mysql.node.replication.secondsBehindMaster` changed to `cluster.secondsBehindMaster`
- `mysql.node.query.slowQueriesPerSecond` changed to `query.slowQueriesPerSecond`

**Why:** The nri-mysql integration stores attributes on `MysqlSample` events without any `mysql.node.` prefix. The correct prefixes are `query.`, `net.`, `db.innodb.`, and `cluster.` as documented in the nri-mysql spec.csv file.

### 2. Unsupported environment variables in nri-mysql config
**What was wrong:** The YAML config included `METRICS: true` and `INVENTORY: true` under the `env:` block. These are not documented environment variables for the nri-mysql integration binary.

**Changes made:** Removed `METRICS: true` and `INVENTORY: true` from the `env:` block.

**Why:** The official `mysql-config.yml.sample` in the nri-mysql repository does not include these variables. While they would likely be silently ignored, including undocumented config options in a tutorial is misleading.

## Review Notes
- The New Relic CLI install URL and command syntax are correct.
- MySQL user privileges (REPLICATION CLIENT, PROCESS, SELECT ON performance_schema.*) are correct per official docs.
- The config file path `/etc/newrelic-infra/integrations.d/mysql-config.yml` is correct.
- The UI navigation path "New Relic One > Infrastructure > Third-party services > MySQL" is substantially correct, though the current entry point is via "one.newrelic.com > All capabilities > Infrastructure".
- The `nri-mysql` package install via `apt-get` is specific to Debian/Ubuntu; the post could note this but it is not technically incorrect.
