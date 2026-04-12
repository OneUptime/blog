# Validation Summary: How to Monitor Redis with Nagios

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (monitoring via INFO command variables)
- Nagios 4 (host, service, and command definitions)
- check_redis.pl Nagios plugin (by William Leibzon / WL-NagiosPlugins)
- NRPE (Nagios Remote Plugin Executor) for remote monitoring
- Debian/Ubuntu package management (apt)

## Sources Consulted
- Nagios Core 4 Object Definitions documentation — https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios Core 4 Macros documentation — https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/macros.html
- WL-NagiosPlugins GitHub repository (check_redis.pl source) — https://github.com/willixix/WL-NagiosPlugins
- Nagios Exchange check_redis.pl listing — https://exchange.nagios.org/directory/plugins/databases/check_redis-2epl/details/
- Debian packages: libredis-perl — https://packages.debian.org/sid/libredis-perl
- Debian Wiki Nagios4 — https://wiki.debian.org/Nagios4

## Issues Found

### 1. Incorrect Perl dependency package name
- **What was wrong:** The post listed `libnet-redis-perl` as the required Perl dependency. This package does not exist in standard Debian/Ubuntu repositories.
- **What was changed:** Replaced `libnet-redis-perl` with `libredis-perl`, which is the correct Redis Perl client library package available in Debian/Ubuntu.
- **Why:** Installing the non-existent package would cause an `apt` error, breaking the setup flow for readers.

### 2. Incorrect `-m` flag usage for memory monitoring
- **What was wrong:** The post used `-m used_memory_rss -w 80 -c 90` to check memory. The `-m` flag in check_redis.pl enables memory utilization percentage checking and expects a max memory value (e.g., `4G`), not a Redis INFO variable name. Passing `used_memory_rss` as the argument to `-m` would cause the plugin to error.
- **What was changed:** Replaced `-m used_memory_rss` with `-a used_memory_rss` (which correctly checks an arbitrary Redis INFO variable) and updated the thresholds from percentage values (80/90) to byte values (1073741824/2147483648, i.e., 1GB/2GB). Updated the comment, command definition, service configuration, and NRPE command consistently.
- **Why:** The `-a` flag is the correct option for monitoring specific Redis INFO variables with threshold-based alerting. The thresholds must be in the same unit as the variable's value (bytes for `used_memory_rss`).

## Review Notes
- The GitHub URL for downloading check_redis.pl (`https://raw.githubusercontent.com/willixix/WL-NagiosPlugins/master/check_redis.pl`) is correct but points to the master branch. If the repository changes its default branch name, this URL could break.
- The `nagios-plugins-contrib` package in Debian/Ubuntu does include check_redis, so the dual installation approach (package or manual download) is valid.
- All Nagios 4 configuration syntax (host definitions, service definitions, command definitions, macros like `$HOSTADDRESS$`, `$ARG1$`, `$ARG2$`) was verified as correct.
- NRPE configuration syntax (`allowed_hosts`, `command[name]=...`) and the `check_nrpe!check_redis` service command are correct.
- The `check_ping!100.0,20%!500.0,60%` host check command uses correct syntax (RTA in ms, packet loss percentage).
- The byte-based thresholds (1GB warn, 2GB crit) are reasonable defaults for a tutorial but readers should adjust these to match their Redis deployment's expected memory usage.
