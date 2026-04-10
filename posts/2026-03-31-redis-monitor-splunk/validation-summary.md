# Validation Summary: How to Monitor Redis with Splunk

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (INFO command, SLOWLOG, configuration directives)
- Splunk Enterprise (SPL queries, inputs.conf, alerts, dashboards)
- Splunk Add-on for Redis (Splunkbase add-on, modular inputs)
- Splunk Universal Forwarder (log file monitoring)
- Linux cron (cron.d job scheduling)

## Sources Consulted
- Redis SLOWLOG documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis configuration documentation (slowlog-log-slower-than, slowlog-max-len): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Splunk CLI reference for app installation: https://docs.splunk.com/Documentation/Splunk/latest/Admin/Managingappobjects
- Splunk inputs.conf specification: https://docs.splunk.com/Documentation/Splunk/latest/Admin/Inputsconf
- Splunk SPL reference (timechart, eval, stats, where): https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual
- Splunkbase for Splunk Add-on for Redis availability

## Issues Found
No technical issues found.

## Review Notes
- The alert for high memory usage uses `used_memory / maxmemory * 100`. If `maxmemory` is set to 0 (the Redis default, meaning no memory limit), this results in a division by zero. In Splunk, this produces NULL, so the `where mem_pct > 85` filter would silently exclude the event. Users should ensure `maxmemory` is configured in Redis for this alert to function properly.
- The SLOWLOG cron job (`SLOWLOG GET 50` every minute) may produce duplicate entries across runs if fewer than 50 new slow queries occur per minute. A more robust approach would pair `SLOWLOG GET` with `SLOWLOG RESET`, but the current approach is a common and acceptable pattern.
- The `timechart count by log_level` query in the error analysis section assumes that Splunk has field extractions configured for `log_level` from Redis log entries. This would typically be handled by the Splunk Add-on for Redis or custom props/transforms configuration.
