# Validation Summary: How to Tune Redis Memory and Persistence Settings on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Redis
- DNF
- systemd
- firewalld
- Linux command-line administration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring PCP Redis": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 documentation, "Installing RHEL 9 content": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Redis documentation, "Key eviction": https://redis.io/docs/latest/develop/reference/eviction/
- Redis documentation, "Redis persistence": https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis documentation, "Redis security": https://redis.io/docs/latest/operate/oss_and_stack/management/security/

## Issues Found
- The post used placeholder package commands such as `dnf install -y <package-name>` and `rpm -qi <package-name>`. Changed them to use the Redis package name, `redis`, which is the package shown in Red Hat documentation.
- The post installed `epel-release` and "Development Tools" as dependencies. These are not required for installing the Redis package from RHEL repositories, so the dependency installation step was corrected to state that no EPEL or build tools are required for the packaged service.
- The configuration file path `/etc/<service>/config.conf` was a placeholder and not valid for the RHEL Redis package. Changed it to `/etc/redis/redis.conf`.
- The service commands used `<service>` placeholders. Changed them to `redis`, matching the RHEL systemd service name shown in Red Hat documentation.
- The setup verification command `sudo <service> --test` was not a valid Redis verification command. Replaced it with `redis-cli PING`, `redis-cli CONFIG GET`, and `redis-cli INFO` commands that verify Redis availability and the memory/persistence settings.
- The firewall command used `--add-service=<service>`, but firewalld does not necessarily provide a predefined Redis service. Changed it to open Redis' default TCP port, `6379/tcp`.
- The performance monitoring commands used generic placeholders and would not identify the Redis process correctly. Changed them to query the `redis` systemd unit and the `redis-server` process.
- The troubleshooting port check was generic. Changed it to filter for Redis' default port, `6379`.
- The post lacked actual Redis memory and persistence configuration despite the title. Added a minimal Redis configuration snippet for `maxmemory`, `maxmemory-policy`, AOF, AOF fsync policy, and RDB snapshot intervals, using directives documented by Redis.

## Review Notes
The example `maxmemory 2gb` value is illustrative and should be sized for the host and workload. For production deployments, Redis should remain bound to trusted interfaces, protected by firewall rules, and secured with ACLs or authentication; TLS is available when supported by the installed Redis build and configured with certificates.
