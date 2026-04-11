# Validation Summary: MySQL vs Vitess: Scaling MySQL Horizontally

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL
- Vitess (VTGate, VTTablet, VTAdmin, topology server)
- PlanetScale
- ProxySQL
- ZooKeeper / etcd

## Sources Consulted
- Vitess DDL strategies documentation: https://vitess.io/docs/user-guides/schema-changes/ddl-strategies/
- Vitess comment directives and scatter query configuration: https://vitess.io/docs/user-guides/configuration-advanced/comment-directives/
- Vitess VSchema reference: https://vitess.io/docs/reference/features/vschema/
- Vitess architecture overview: https://vitess.io/docs/concepts/overview/

## Issues Found

### 1. Incorrect Online DDL syntax
- **What was wrong:** The post showed `ALGORITHM=ONLINE, LOCK=NONE` as the way to trigger Vitess Online DDL via gh-ost. Vitess uses the `@@ddl_strategy` session variable, not MySQL's `ALGORITHM`/`LOCK` hints. Additionally, gh-ost and pt-osc strategies are deprecated as of Vitess v22; the current recommended strategy is `vitess`, which uses VReplication.
- **What was changed:** Replaced the code example with `SET @@ddl_strategy='vitess'; ALTER TABLE orders ADD COLUMN notes TEXT;` and updated the description to reference VReplication instead of gh-ost.

### 2. Incorrect claim that Vitess blocks scatter queries by default
- **What was wrong:** The post stated that Vitess "rejects queries without a WHERE clause on sharded tables" and labeled `SELECT * FROM orders` as "blocked by Vitess policy." In reality, Vitess executes scatter queries by default — they fan out to all shards. Blocking scatter queries requires the opt-in `--no-scatter` VTGate flag.
- **What was changed:** Updated the code comments and surrounding text to accurately describe default scatter query behavior and mention the `--no-scatter` flag as an optional configuration.

### 3. Inaccurate description of query rewriting behavior
- **What was wrong:** The paragraph claimed VTGate "blocks full-table scans on large tables," which is not a default behavior.
- **What was changed:** Replaced with accurate description noting query timeout enforcement, query normalization, and the optional `--no-scatter` flag.

## Review Notes
- The VSchema JSON example for hash-based vindexes is correct and follows current Vitess VSchema format.
- The architecture diagram (VTGate -> VTTablet -> MySQL) accurately represents Vitess topology.
- The connection pooling description is accurate — VTTablet does multiplex application connections onto a smaller MySQL connection pool.
- The recommendation table is reasonable, though ProxySQL comparison is simplified (ProxySQL also offers query routing, not just connection pooling).
- PlanetScale shutting down its database service was announced in early 2025. The post mentions PlanetScale as a managed Vitess service, which was accurate at time of writing but may need a future update depending on PlanetScale's status.
