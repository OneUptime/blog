# Validation Summary: How to Use Ansible Fact Caching with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible fact caching
- community.general Redis cache plugin
- Redis Server
- Redis CLI
- Redis Sentinel and replication
- Ansible playbooks and ansible.cfg configuration

## Sources Consulted
- Ansible cache plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible configuration settings for fact cache options: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- community.general.redis cache plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- community.general.redis cache plugin source: https://github.com/ansible-collections/community.general/blob/main/plugins/cache/redis.py
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found
- The post used `fact_caching = redis` without noting that the current Redis cache plugin is provided by the `community.general` collection and is not included in `ansible-core`. Updated examples to use `fact_caching = community.general.redis` and added the `ansible-galaxy collection install community.general` prerequisite.
- The connection string section included unsupported current formats, including a host-only connection and Unix socket connection. Replaced those examples with documented TLS and Sentinel formats.
- The TLS example used a `rediss://username:password@host:port/db` URI. The `community.general.redis` cache plugin documents and implements a `tls://host:port:db:password` format, so the example was corrected.
- The high availability section implied Redis Cluster support and suggested pointing Ansible at a read-heavy replica. The cache plugin documents Sentinel support, and Redis replicas are read-only by default, so the section was corrected to use Sentinel and to keep Ansible pointed at a writable primary service.
- Several `lineinfile` regexes only matched commented Redis directives and could append duplicate directives when rerun against already configured files. Updated them to match commented and uncommented forms.
- Redis `KEYS` examples were replaced with `redis-cli --scan --pattern` where listing keys is needed, matching Redis CLI guidance to avoid blocking keyspace scans.
- The post encouraged direct inspection of the Redis cache. Ansible documentation treats cache plugin storage as an internal implementation detail, so the wording now limits direct Redis inspection to troubleshooting and warns against depending on those keys in automation.

## Review Notes
The benchmark numbers and per-host fact size estimates are plausible but environment-dependent. They should be treated as illustrative rather than guaranteed performance or sizing figures.
