# Alert on PostgreSQL Transaction-ID Wraparound Risk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Transaction ID Wraparound, Autovacuum, datfrozenxid, Database Alerts

Description: Build staged PostgreSQL wraparound alerts from database and table XID ages, configured freeze limits, transaction burn rate, and the blockers that prevent freezing.

---

PostgreSQL transaction IDs are finite and compared with wraparound-aware arithmetic. Old row versions must be frozen before their XIDs become unsafe. PostgreSQL launches anti-wraparound autovacuums even when ordinary autovacuum is disabled, then eventually warns and refuses commands that assign new XIDs if maintenance cannot advance the horizon.

Monitor this safety margin in transactions, not only in days. A quiet cluster and a busy cluster consume the same margin at very different rates.

## Start with every database

`pg_database.datfrozenxid` is a lower bound on the unfrozen XIDs in a database: it tracks the minimum per-table `relfrozenxid`. Query it from one connection to the cluster:

```sql
WITH settings AS (
  SELECT current_setting('autovacuum_freeze_max_age')::bigint
           AS freeze_max_age
)
SELECT d.datname,
       age(d.datfrozenxid)::bigint AS oldest_xid_age,
       s.freeze_max_age,
       s.freeze_max_age - age(d.datfrozenxid)::bigint
         AS xids_until_server_freeze_max_age,
       round(100.0 * age(d.datfrozenxid)::numeric
             / s.freeze_max_age, 1) AS percent_of_freeze_max_age
FROM pg_database AS d
CROSS JOIN settings AS s
ORDER BY age(d.datfrozenxid) DESC;
```

The last two fields are an operational comparison with the server-wide setting, not the final wraparound limit. A table, and its TOAST table separately, can reduce `autovacuum_freeze_max_age` through storage parameters, and anti-wraparound work begins around the applicable setting rather than at wraparound itself. Export the raw age and configured value so thresholds can be changed without rewriting collection.

Do not filter out `template0` merely because users do not connect to it. Every database contributes to cluster safety, though frozen template databases normally advance differently.

## Find the table that owns the horizon

Connect to each database near a warning threshold and include its TOAST table age, following PostgreSQL's documented diagnostic pattern:

```sql
SELECT c.oid::regclass AS table_name,
       greatest(
         age(c.relfrozenxid)::bigint,
         coalesce(age(t.relfrozenxid)::bigint, 0)
       ) AS oldest_xid_age,
       c.relfrozenxid,
       t.relfrozenxid AS toast_relfrozenxid
FROM pg_class AS c
LEFT JOIN pg_class AS t
  ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r', 'm')
ORDER BY oldest_xid_age DESC
LIMIT 50;
```

`relfrozenxid` advances only when vacuum has scanned every page that might contain an unfrozen XID. A recent ordinary vacuum can reclaim dead tuples without advancing it far if the scan did not cover the required pages. That is why `last_autovacuum` alone is not a wraparound health metric.

Per-table and TOAST storage parameters can reduce the trigger:

```sql
SELECT c.oid::regclass AS table_name,
       c.reloptions,
       t.reloptions AS toast_reloptions
FROM pg_class AS c
LEFT JOIN pg_class AS t
  ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r', 'm')
  AND (c.reloptions IS NOT NULL OR t.reloptions IS NOT NULL);
```

Parse and inventory approved overrides centrally rather than embedding fragile text parsing in an alert query.

## Use staged thresholds and burn rate

The default `autovacuum_freeze_max_age` is commonly 200 million transactions, but read it from each server. A practical policy uses multiple stages below the forced-vacuum threshold, leaving enough room for a large relation to finish:

- early warning when age consumes a planned percentage of the configured trigger;
- elevated warning when an anti-wraparound vacuum should be running but age still rises;
- critical when the remaining XID budget is less than several worst-case vacuum durations at the current XID rate;
- emergency on PostgreSQL's own wraparound warnings or XID-assignment refusal.

Derive burn rate from valid deltas of `age(datfrozenxid)` or a counter that specifically tracks XID allocation across successful samples. If freezing advances the horizon, the age can drop; treat that as maintenance progress, not a counter reset. Estimate time only while the burn rate is positive:

```text
estimated_seconds_to_threshold = remaining_xids / xids_per_second
```

Keep the remaining-XID alert as the source of truth. Time estimates become unstable during traffic spikes and say nothing about how long the required vacuum will take.

PostgreSQL 14 through 18 begin warnings when the oldest XIDs are forty million transactions from wraparound; PostgreSQL 19, in beta at publication, raises that warning point to one hundred million. In both cases, PostgreSQL refuses new XID-assigning commands when fewer than three million remain. Those are last-resort protections, not acceptable alert thresholds.

## Monitor the anti-wraparound vacuum

In `pg_stat_activity`, an anti-wraparound worker's query text ends with `(to prevent wraparound)`. Join it to `pg_stat_progress_vacuum` and record phase, relation, progress, and wait events.

Do not routinely cancel these workers. They can run even when autovacuum is disabled, and PostgreSQL avoids automatically interrupting them for conflicting work. If the vacuum is waiting on a lock, use `pg_blocking_pids()` and resolve the blocker. If it is moving slowly, investigate I/O, cost settings, and relation size before changing configuration.

PostgreSQL also has a vacuum failsafe. When XID age becomes dangerously high, the failsafe can stop cost-based delay and skip nonessential work such as index vacuuming so freezing can finish sooner.

## Find what prevents horizon advancement

Old open transactions, prepared transactions, and replication slots can preserve old XIDs or snapshots:

```sql
SELECT pid,
       usename,
       application_name,
       state,
       age(backend_xid) AS xid_age,
       age(backend_xmin) AS xmin_age,
       xact_start
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL OR backend_xmin IS NOT NULL
ORDER BY greatest(age(backend_xid), age(backend_xmin)) DESC NULLS LAST;

SELECT transaction, gid, prepared, owner, database,
       age(transaction) AS xid_age
FROM pg_prepared_xacts
ORDER BY age(transaction) DESC;
```

Inspect replication slots with old `xmin` or `catalog_xmin` before dropping anything. Dropping a live slot can require rebuilding its consumer or replica.

## Do not forget multixacts

Multixact IDs support row locks held by multiple transactions and have their own wraparound controls: `relminmxid`, `datminmxid`, `autovacuum_multixact_freeze_max_age`, and `mxid_age()`. An XID-only dashboard can be green while multixact age is dangerous. Build a parallel alert using the matching official settings and age function.

When recovering from a near-wraparound condition, follow the current PostgreSQL runbook. Current documentation advises resolving old prepared/open transactions and slots, then running a database-wide ordinary `VACUUM` as a superuser so system catalogs can be processed; it specifically warns against outdated advice to stop the server for single-user vacuuming and against using `VACUUM FULL` or `VACUUM FREEZE` in XID exhaustion recovery.

## Official Documentation

- [PostgreSQL transaction ID wraparound and freezing](https://www.postgresql.org/docs/current/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND)
- [PostgreSQL 19 beta transaction ID wraparound and freezing](https://www.postgresql.org/docs/19/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND)
- [PostgreSQL autovacuum settings](https://www.postgresql.org/docs/current/runtime-config-autovacuum.html)
- [PostgreSQL vacuum freeze settings](https://www.postgresql.org/docs/current/runtime-config-vacuum.html#RUNTIME-CONFIG-VACUUM-FREEZING)
- [PostgreSQL activity monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL transaction ID functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-PG-SNAPSHOT)

## Conclusion

Alert first on raw `age(datfrozenxid)` and the applicable freeze setting, then add per-table diagnosis, XID burn rate, and anti-wraparound progress. Leave substantial maintenance headroom, track multixact age separately, and resolve horizon holders rather than canceling the vacuum that protects the cluster.
