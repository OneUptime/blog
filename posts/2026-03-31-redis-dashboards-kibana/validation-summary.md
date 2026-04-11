# Validation Summary: How to Create Redis Dashboards in Kibana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (monitoring via INFO command metrics)
- Metricbeat 8.x (Redis module, info and keyspace metricsets)
- Elasticsearch 8.x (data storage and querying)
- Kibana 8.x (Lens visualizations, dashboards, alerting rules)

## Sources Consulted
- Elastic official documentation: Redis exported fields for Metricbeat 8.19 — https://www.elastic.co/guide/en/beats/metricbeat/8.19/exported-fields-redis.html
- Elastic official documentation: Redis info metricset — https://www.elastic.co/guide/en/beats/metricbeat/8.19/metricbeat-metricset-redis-info.html
- Elastic official documentation: Kibana Lens formulas — https://www.elastic.co/docs/explore-analyze/visualize/lens
- Elastic blog: 10 common Kibana visualization questions answered with formulas — https://www.elastic.co/blog/kibana-10-common-questions-formulas-time-series-maps
- GitHub issue elastic/kibana#115770: Confirms count() does not accept field name arguments
- GitHub issue elastic/kibana#163706: Confirms counter_rate(max(field)) syntax
- Elastic official documentation: Metricbeat 8.x Debian installation — https://www.elastic.co/guide/en/beats/metricbeat/8.19/setup-repositories.html
- Elastic official documentation: Elasticsearch Debian package install — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-debian-package

## Issues Found

### 1. Deprecated APT key installation method
- **What was wrong:** The installation commands used `apt-key add` which is deprecated since Debian 11/Ubuntu 22.04, and the repo source line was missing the `signed-by` clause.
- **What was changed:** Updated to use `gpg --dearmor` to store the key in `/usr/share/keyrings/elasticsearch-keyring.gpg`, added `apt-transport-https` install step, and added `[signed-by=...]` clause to the repo source line.
- **Why:** The official Elastic 8.x documentation now recommends the `gpg --dearmor` approach. The deprecated `apt-key` method may produce warnings or fail on current systems.

### 2. Three incorrect Metricbeat Redis field names
- **What was wrong:** The "Key Metrics to Visualize" section had three incorrect field names:
  - `redis.info.stats.instantaneous_ops_per_sec` (underscore between instantaneous and ops)
  - `redis.info.persistence.rdb.last_bgsave.status` (wrong nesting structure)
  - `redis.info.replication.master_offset` (underscore between master and offset)
- **What was changed:**
  - `redis.info.stats.instantaneous_ops_per_sec` -> `redis.info.stats.instantaneous.ops_per_sec`
  - `redis.info.persistence.rdb.last_bgsave.status` -> `redis.info.persistence.rdb.bgsave.last_status`
  - `redis.info.replication.master_offset` -> `redis.info.replication.master.offset`
- **Why:** Verified against the official Metricbeat 8.19 Redis exported fields documentation. Using incorrect field names would result in empty/missing data in dashboards.

### 3. Invalid Kibana Lens formula syntax
- **What was wrong:** The cache hit rate formula used `count(redis.info.stats.keyspace.hits)`. The `count()` function in Kibana Lens does not accept a field name as an argument — it only accepts no arguments or named parameters like `kql='...'`. Additionally, `count()` returns document counts, not field values, which is conceptually wrong for calculating a ratio from counter metrics.
- **What was changed:** Replaced `count(field)` with `counter_rate(max(field))` which correctly computes the rate of change of the monotonically increasing Redis counter fields per time bucket.
- **Why:** Confirmed via official Kibana Lens documentation and GitHub issues (elastic/kibana#115770, elastic/kibana#163706). The `counter_rate(max(field))` pattern is the documented approach for computing rates from counter metrics in Lens formulas.

## Review Notes
- The section heading "Create an OOTB Alerts Using Kibana Rules" is slightly misleading — "OOTB" (Out of the Box) implies pre-built alerts, but the section describes creating custom alerts. This is a content/naming issue, not a technical error.
- The Metricbeat Redis module configuration (metricsets, period, hosts) and Elasticsearch output configuration are correct.
- The `metricbeat setup --dashboards` command and systemctl commands are correct.
- The Kibana Rules / Elasticsearch Query alert configuration is accurate for Kibana 8.x.
- The dashboard layout suggestions are reasonable and follow common monitoring best practices.
