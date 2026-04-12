# Validation Summary: How to Configure InnoDB NUMA Support in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6.27+, 5.7.9+, 8.x)
- InnoDB storage engine
- NUMA (Non-Uniform Memory Access) architecture
- numactl / numastat Linux utilities
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual: innodb_numa_interleave — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_numa_interleave
- MySQL 5.7 Reference Manual: innodb_numa_interleave — https://dev.mysql.com/doc/refman/5.7/en/innodb-parameters.html#sysvar_innodb_numa_interleave
- Linux numactl man page — https://man7.org/linux/man-pages/man8/numactl.8.html
- Linux numastat man page — https://man7.org/linux/man-pages/man8/numastat.8.html
- systemd drop-in override documentation — https://www.freedesktop.org/software/systemd/man/systemd.unit.html

## Issues Found
No technical issues found.

## Review Notes
- The `innodb_numa_interleave` variable is not dynamically changeable; it requires a MySQL restart to take effect. The post does not explicitly state this, but since the configuration is shown in `my.cnf` (which implies a restart), this is not misleading.
- The variable was introduced in MySQL 5.6.27 and 5.7.9. Users on very old MySQL versions would need the `numactl` wrapper approach, which the post correctly covers as an alternative.
- The `numastat -p` output columns include per-node allocation statistics; the post mentions checking `Numa_Hit` counts, which is one of the fields in the default `numastat` output (not the `-p` per-process output which shows memory categories). However, the general guidance to look for balanced distribution across nodes is correct and sufficient for the reader.
