# Validation Summary: How to Monitor Redis with Zabbix

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-cli)
- Zabbix Server 6.0+
- Zabbix Agent (classic agent with UserParameters)
- Zabbix monitoring templates, items, triggers, and macros

## Sources Consulted
- Zabbix official Redis template source: https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/db/redis/template_db_redis.yaml
- Zabbix 6.0 trigger expression syntax documentation: https://www.zabbix.com/documentation/6.0/en/manual/config/triggers/expression
- Zabbix Redis plugin documentation (Agent 2): https://www.zabbix.com/documentation/6.0/en/manual/appendix/config/zabbix_agent2_plugins/redis_plugin
- Zabbix integration page for Redis: https://www.zabbix.com/integrations/redis
- redis-cli `--latency-history` output format verified against redis-cli source format strings
- Zabbix UserParameter documentation: https://www.zabbix.com/documentation/6.0/en/manual/config/items/userparameters

## Issues Found

1. **UserParameter `redis.info` returned multi-line output instead of a single value.** The original `redis-cli -h $1 -p $2 INFO $3` passes a section name to `INFO` and returns the entire section block (multiple lines), which is unusable as a Zabbix item value. Fixed to `redis-cli -h $1 -p $2 INFO ALL | grep "^$3:" | cut -d: -f2 | tr -d '\r'` to extract the specific field value as a single string.

2. **Item keys in the table used incorrect argument format.** The UserParameter definition takes 3 positional arguments (host, port, field), but the item keys were written with only 1 argument (e.g., `redis.info[connected_clients]`). This would map `connected_clients` to the host parameter, leaving port and field empty — producing an invalid redis-cli command. Fixed all item keys to use the 3-argument format: `redis.info[{$REDIS.HOST},{$REDIS.PORT},connected_clients]`.

3. **`redis.info[replication,role]` was incorrect.** With the 3-arg UserParameter, this mapped to host=replication, port=role — clearly wrong. The `role` field is directly available in Redis `INFO ALL` output. Fixed to `redis.info[{$REDIS.HOST},{$REDIS.PORT},role]`.

4. **Trigger expressions used deprecated pre-5.4 syntax.** The post specifies Zabbix 6.0+ but used the old trigger format `{Template DB Redis:redis.info[...].last()}`. Zabbix 5.4+ replaced this with `last(/Template/item)` function-style syntax. Fixed to `last(/Template DB Redis/redis.info[...])`.

5. **Latency awk command extracted a label instead of a number.** The `--latency-history` output format is `min: 0, max: 1, avg: 0.19 (96 samples) -- 1.01 seconds range`. Field `$3` is `max:` (a text label). Changed to `$6` which correctly extracts the average latency value (e.g., `0.19`).

6. **Latency command would hang indefinitely.** `redis-cli --latency-history` runs forever and never exits on its own. Without termination, the pipe to `tail -1` would block indefinitely waiting for EOF. Added `timeout 2` wrapper to force termination after 2 seconds, producing at least one complete sample line for extraction.

## Review Notes
- The official Zabbix 6.0+ Redis template ("Redis by Zabbix agent 2") is designed for Zabbix Agent 2 with its native Redis plugin, not the classic agent with UserParameters. The approach described in this post (classic agent + UserParameters + redis-cli) is a valid manual alternative but is not the same as the official template. The post's references to "importing the official template" are somewhat misleading in this context, since the official template's items expect Agent 2's built-in Redis plugin, not UserParameter-based data collection. A future revision could clarify this distinction.
- The template download URL (`https://git.zabbix.com/projects/ZBX/repos/zabbix/raw/templates/db/redis/template_db_redis.yaml`) points to the correct path but lacks a branch specifier (`?at=release/6.0`). It may default to the repository's default branch, which could be a development branch with a different template format.
- The `redis.config` UserParameter (`redis-cli CONFIG GET $3`) returns two lines (parameter name + value). If used, it would need post-processing (e.g., `tail -1`) to extract just the value. This was not fixed since no items in the post actually use it.
