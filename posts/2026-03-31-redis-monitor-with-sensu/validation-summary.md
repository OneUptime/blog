# Validation Summary: How to Monitor Redis with Sensu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Sensu Go (monitoring platform)
- sensu-plugins-redis (Bonsai asset)
- sensu-slack-handler (Bonsai asset)
- PagerDuty handler

## Sources Consulted
- Sensu Go official documentation (https://docs.sensu.io/)
- sensu-plugins-redis GitHub repository (https://github.com/sensu-plugins/sensu-plugins-redis)
- Sensu Bonsai asset registry (https://bonsai.sensu.io/)
- Sensu Go CheckConfig reference (https://docs.sensu.io/sensu-go/latest/observability-pipeline/observe-schedule/checks/)
- Sensu Go Handler reference (https://docs.sensu.io/sensu-go/latest/observability-pipeline/observe-process/handlers/)

## Issues Found

1. **Wrong apt package name for sensuctl**: The post used `sensuctl` as the apt package name, but the correct Debian package is `sensu-go-cli`. Changed `sudo apt install sensu-go-backend sensu-go-agent sensuctl -y` to `sudo apt install sensu-go-backend sensu-go-agent sensu-go-cli -y`.

2. **Outdated plugin version with no binary assets**: The post referenced version 3.1.0 of sensu-plugins-redis, which exists as a release but has no pre-built binary assets on Bonsai. Updated to version 5.0.0, which is the latest release with published binary assets. Updated both the `sensuctl asset add` command and the Bonsai URL.

3. **Non-existent check script `check-redis.rb`**: This script does not exist in the sensu-plugins-redis collection. The correct script for Redis availability checking is `check-redis-ping.rb`. Changed accordingly.

4. **Wrong memory check script and flags**: The post used `check-redis-memory.rb` with non-existent flags `--maxmemory-warn` and `--maxmemory-crit`. Since the post intended percentage-based thresholds (80% warn, 90% crit), changed to `check-redis-memory-percentage.rb` with `-w 80 -c 90` flags. The original `check-redis-memory.rb` script uses `--warnmem` and `--critmem` flags with KB values, not percentages.

5. **Non-existent replication check script and flags**: The post used `check-redis-slave-lag.rb` with `--warn` and `--crit` flags. This script does not exist. The correct script is `check-redis-slave-status.rb`, which checks whether `master_link_status` is up or down and does not accept threshold flags. Removed the threshold flags and updated the section heading and check name from "Replication Lag" to "Replication Status" to accurately reflect what the check does.

## Review Notes
- The Sensu Go YAML configuration format (CheckConfig, Handler) is correct with proper field names and structure.
- The `is_incident` built-in event filter is correctly referenced.
- The sensuctl CLI commands for event listing, filtering, and silencing are correct.
- The agent configuration file path (`/etc/sensu/agent.yml`) and backend WebSocket port (8081) are correct.
- The Slack handler configuration with `sensu/sensu-slack-handler` asset and `--channel`/`--username` flags is correct.
- Sensu Go is being actively maintained; users should check for the latest versions of both Sensu Go and the plugins.
