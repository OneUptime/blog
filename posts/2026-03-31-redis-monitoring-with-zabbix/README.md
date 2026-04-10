# How to Monitor Redis with Zabbix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Zabbix, Monitoring, Observability, Alert

Description: Set up Redis monitoring in Zabbix using the official template, configure items and triggers, and alert on memory, latency, and connection thresholds.

---

Zabbix is a widely-used open-source monitoring platform. Its official Redis template provides dozens of pre-built items, triggers, and graphs that let you monitor Redis without writing custom scripts.

## Prerequisites

- Zabbix Server 6.0+ with a Zabbix Agent on the Redis host
- Redis accessible on `localhost:6379` from the agent host

## Importing the Official Redis Template

Download the Zabbix Redis template from the Zabbix integration library:

```bash
curl -O https://git.zabbix.com/projects/ZBX/repos/zabbix/raw/templates/db/redis/template_db_redis.yaml
```

In the Zabbix UI:
1. Go to **Configuration > Templates > Import**
2. Upload the YAML file
3. Click **Import**

## Configuring the Zabbix Agent

The Redis template uses `redis-cli` via a Zabbix user parameter. Add this to the agent config:

```bash
sudo nano /etc/zabbix/zabbix_agentd.conf
```

```text
UserParameter=redis.ping[*],redis-cli -h $1 -p $2 PING
UserParameter=redis.info[*],redis-cli -h $1 -p $2 INFO ALL | grep "^$3:" | cut -d: -f2 | tr -d '\r'
UserParameter=redis.config[*],redis-cli -h $1 -p $2 CONFIG GET $3
```

Restart the agent:

```bash
sudo systemctl restart zabbix-agent
```

## Linking the Template to a Host

1. In Zabbix, go to **Configuration > Hosts**
2. Select your Redis host and click **Templates**
3. Link **Template DB Redis** to the host
4. Set macros: `{$REDIS.HOST}` = `localhost`, `{$REDIS.PORT}` = `6379`

## Key Items Monitored

| Item Key | Description |
|---|---|
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},connected_clients]` | Current connections |
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},used_memory]` | Memory in bytes |
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},instantaneous_ops_per_sec]` | Commands/sec |
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},evicted_keys]` | Evicted keys count |
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},role]` | Master or replica |
| `redis.info[{$REDIS.HOST},{$REDIS.PORT},rdb_last_bgsave_status]` | Last save status |

## Built-in Triggers

The template includes triggers such as:

```text
last(/Template DB Redis/redis.info[{$REDIS.HOST},{$REDIS.PORT},connected_clients]) > {$REDIS.CLIENTS.MAX}
- High severity: Too many connected clients

last(/Template DB Redis/redis.info[{$REDIS.HOST},{$REDIS.PORT},used_memory]) > {$REDIS.MEM.MAX}
- Average severity: Memory usage is high
```

## Custom User Parameter for Latency

Add a custom parameter to track command latency:

```bash
UserParameter=redis.latency[*],timeout 2 redis-cli -h $1 -p $2 --latency-history -i 1 2>&1 | tail -1 | awk '{print $6}'
```

Then create a Zabbix item with key `redis.latency[localhost,6379]` and set the update interval to 60 seconds.

## Notification Setup

Configure a Zabbix media type (email, Slack, PagerDuty) and assign it to a user group. Link that group to an action triggered by the Redis template's high-severity triggers.

## Summary

Zabbix's official Redis template provides immediate monitoring coverage with pre-built items, triggers, and graphs using simple `redis-cli` user parameters. Import the template, link it to your host, set threshold macros, and configure notification media to have production-grade Redis alerting running within minutes.
