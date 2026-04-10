# How to Configure Redis save Intervals for RDB Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, Configuration

Description: Configure Redis save directives to control when RDB snapshots are triggered, balancing data safety against the performance cost of background saves.

---

Redis RDB persistence creates point-in-time snapshots of your dataset. The `save` directive in `redis.conf` defines the conditions under which a background save is automatically triggered.

## Understanding the save Directive

Each `save` line defines a threshold: `save <seconds> <changes>`. A snapshot triggers if at least `<changes>` keys have been modified within the last `<seconds>`.

The Redis defaults are:

```text
# redis.conf
save 3600 1
save 300 100
save 60 10000
```

This means:

- Save after 1 hour if at least 1 key changed
- Save after 5 minutes if at least 100 keys changed
- Save after 1 minute if at least 10,000 keys changed

## Customizing save Intervals

For a write-heavy application that can tolerate losing up to 5 minutes of data:

```text
# redis.conf - write-heavy workload
save 300 1
```

For a low-write application where you want infrequent snapshots:

```text
# redis.conf - low-write workload
save 900 1
save 300 10
```

Update save settings on a running instance without restart:

```bash
# Add a new save condition
redis-cli CONFIG SET save "3600 1 300 100 60 10000"

# Verify
redis-cli CONFIG GET save
```

## Disabling Automatic Saves

To disable RDB snapshots entirely:

```text
# redis.conf
save ""
```

Or at runtime:

```bash
redis-cli CONFIG SET save ""
```

You can still trigger a manual snapshot at any time:

```bash
redis-cli BGSAVE
redis-cli LASTSAVE  # returns Unix timestamp of last successful save
```

## Monitoring Save Activity

Check when the last RDB save occurred:

```bash
redis-cli INFO persistence
```

```text
rdb_changes_since_last_save:4827
rdb_last_save_time:1711900800
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:2
rdb_current_bgsave_time_sec:-1
```

A high `rdb_changes_since_last_save` with stale `rdb_last_save_time` indicates your save thresholds have not been met recently.

## Performance Considerations

Every BGSAVE forks the Redis process. On Linux, copy-on-write (COW) means this is cheap initially, but memory usage can double if many writes occur during the save. Monitor:

```bash
redis-cli INFO persistence | grep rdb_last_cow_size
```

For large datasets (>10 GB), consider less frequent saves to reduce fork overhead:

```text
# redis.conf - large dataset
save 900 1
save 600 1000
```

Adjust `rdbcompression` to trade CPU for smaller RDB files:

```text
rdbcompression yes
rdbchecksum yes
```

## Verifying RDB File Location

Check where the RDB file is written:

```bash
redis-cli CONFIG GET dir
redis-cli CONFIG GET dbfilename
```

```text
1) "dir"
2) "/var/lib/redis"
1) "dbfilename"
2) "dump.rdb"
```

Ensure this directory has enough free space for the RDB file and temporary write during save.

## Summary

The `save` directive lets you define multiple conditions that trigger automatic RDB snapshots in Redis. Set thresholds based on your acceptable data loss window and write volume. Disable saves entirely for pure caching setups, and use BGSAVE for manual snapshots. Monitor `rdb_last_bgsave_time_sec` and `rdb_last_cow_size` to catch performance regressions from large or frequent forks.
