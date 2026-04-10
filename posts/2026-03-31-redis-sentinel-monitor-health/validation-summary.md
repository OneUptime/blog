# Validation Summary: How to Monitor Redis Sentinel Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Sentinel
- redis-cli
- Bash scripting (health check script)
- Prometheus / redis_exporter (oliver006/redis_exporter)
- OneUptime (monitoring platform)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SENTINEL commands reference: https://redis.io/docs/latest/commands/?group=sentinel
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- oliver006/redis_exporter GitHub repository: https://github.com/oliver006/redis_exporter
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/

## Issues Found

1. **Section heading said "via INFO" but used SENTINEL command** (line 35): The section "Primary and Replica Status via INFO" showed the `SENTINEL masters` command, not `INFO`. Changed heading to "Primary and Replica Status via SENTINEL".

2. **"status" listed as a `SENTINEL masters` output field** (lines 41-48): The `status` field does not exist in `SENTINEL masters` output. It only appears in `INFO sentinel` output (as part of the `master0:name=mymaster,status=ok,...` line). Removed "status" from the field list and reordered to put "flags" first since it is the primary health indicator.

3. **Scripted health check used `SENTINEL masters` instead of `SENTINEL master $MASTER_NAME`** (line 84): The script defined `MASTER_NAME="mymaster"` but never used it. The command `SENTINEL masters` (plural) returns info for ALL monitored masters, so the awk parser would only match the first one, potentially returning flags for the wrong master. Changed to `SENTINEL master $MASTER_NAME` (singular) to query the specific named master.

4. **Incorrect `redis_exporter` CLI flags** (lines 131-132): The flags `--sentinel.addr` and `--sentinel.master-name` do not exist in the standard oliver006/redis_exporter. The correct way to scrape Sentinel metrics is to point the exporter at the Sentinel endpoint using `--redis.addr redis://sentinel-1:26379`. Fixed the example accordingly.

## Review Notes
- The awk parsing pattern `awk '/^flags$/{getline; print}'` relies on redis-cli's non-interactive output format (one value per line, no array numbering). This is correct behavior when stdout is piped, but readers should be aware this won't work with `--resp3` output mode.
- The `SENTINEL replicas` command (used on line 53) was introduced in Redis 5.0. The older `SENTINEL slaves` command was removed in Redis 7.0. The post correctly uses the modern form, but readers on Redis 4.x or earlier would need `SENTINEL slaves` instead.
- The TILT mode explanation is accurate but slightly simplified. TILT mode also activates when Sentinel is blocked for multiple seconds (e.g., during disk sync). During TILT, Sentinel continues monitoring but refuses to act on failover requests. TILT exits automatically after 30 seconds of normal timer behavior.
- The `slave-priority` of 0 explanation is correct: it prevents the replica from being promoted. In Redis 7.0+, this field was renamed to `replica-priority`.
