# Validation Summary: How to Monitor Redis with Checkmk

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (in-memory data store)
- Checkmk 2.2.x (enterprise monitoring platform, Raw Edition)
- mk_redis agent plugin
- xinetd (agent communication daemon)
- OMD (Open Monitoring Distribution, Checkmk site management)

## Sources Consulted
- Checkmk official documentation for agent plugin deployment: https://docs.checkmk.com/latest/en/agent_linux.html
- Checkmk agent plugins reference: https://docs.checkmk.com/latest/en/agent_linux.html#plugins
- Checkmk service discovery documentation: https://docs.checkmk.com/latest/en/hosts_setup.html
- Checkmk notification system documentation: https://docs.checkmk.com/latest/en/notifications.html
- Checkmk download page for package naming conventions: https://download.checkmk.com/
- Redis INFO command documentation: https://redis.io/commands/info/

## Issues Found
No technical issues found.

## Review Notes
- The post uses "WATO (Web Admin Tool)" in the threshold configuration section heading, which is the legacy name from Checkmk 1.x. In Checkmk 2.x, the UI was rebranded to "Setup." The actual navigation paths given in the post correctly use "Setup," so this is a minor naming inconsistency rather than a functional error. WATO remains widely recognized in the Checkmk community.
- The xinetd-based agent deployment described is the traditional approach. Checkmk 2.1+ introduced the Agent Controller (cmk-agent-ctl) for TLS-encrypted, pull-based communication as the recommended method. The xinetd approach still works and is documented, but readers deploying new setups may want to consider the newer Agent Controller method.
- The Checkmk version referenced (2.2.0p15) is a specific patch release. The package URL format and naming convention are correct for this version on Ubuntu 22.04 (Jammy).
- The auto-discovered Redis checks listed (Memory Usage, Connected Clients, Keyspace, Replication, Uptime) align with metrics available from the Redis INFO command output.
- The mk_redis plugin configuration format using a REDIS_INSTANCES bash array with "host:port:password" entries is consistent with the configuration patterns used by other Checkmk agent plugins.
