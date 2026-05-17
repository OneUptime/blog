# Validation Summary: How to Run stress-ng for System Stress Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- stress-ng (system stress testing tool)
- Ubuntu (apt package management)
- lm-sensors (hardware temperature monitoring)
- Bash scripting
- /proc/cpuinfo, iostat, htop, watch (Linux monitoring utilities)
- YAML / JSON output formats

## Sources Consulted
- Official stress-ng man page (master): https://raw.githubusercontent.com/ColinIanKing/stress-ng/master/stress-ng.1
- stress-ng source code: https://github.com/ColinIanKing/stress-ng (stress-cpu.c, stress-ng.h for `EXIT_*` constants)
- stress-ng project page: https://github.com/ColinIanKing/stress-ng
- Ubuntu package: https://packages.ubuntu.com/search?keywords=stress-ng

## Issues Found

1. **Invalid CPU method `matrix`**: The post used `--cpu-method matrix` in four places (CPU stress section, method list, throttling test, and overnight script). The stress-ng `stress_cpu_methods` array contains no entry called `matrix` — the actual method is `matrixprod` (matrix product of two 128x128 double-float matrices). Running `--cpu-method matrix` would fail with "cpu-method must be one of: ...". Fixed all four occurrences to `matrixprod` and updated the descriptive bullet accordingly.

2. **Invalid CPU method `sha512`**: The post listed `sha512` as a CPU method. `sha512` is not in the `stress_cpu_methods` array — it exists only as a standalone stressor (`--sha512`), not as a `--cpu-method` value. Removed the line from the method list.

3. **Invalid flag `--hdd-dir`**: The post used `stress-ng --hdd 4 --hdd-dir /tmp/stress_test --timeout 60s`. There is no `--hdd-dir` option in stress-ng. The correct flag for specifying where temporary test files are written is `--temp-path PATH`. Replaced `--hdd-dir` with `--temp-path`.

4. **Incorrect exit code description (code 3)**: The post stated exit code 3 = "PARTIAL - some stressors were skipped". Per `stress-ng.h` and the man page EXIT STATUS section, exit code 3 is `EXIT_NO_RESOURCE` — a stressor failed to initialise because of lack of resources (e.g., ENOMEM). There is no `EXIT_PARTIAL`. Also added the missing documented codes 4 (`EXIT_NOT_IMPLEMENTED`), 5 (`EXIT_SIGNALED`), 6 (`EXIT_BY_SYS_EXIT`), and 7 (`EXIT_METRICS_UNTRUSTWORTHY`) to make the list match the documented set. Removed the `130` line — stress-ng catches SIGINT and returns its own exit code rather than the shell's 128+signum convention, so quoting 130 as a stress-ng exit code was misleading.

## Review Notes

- `--cpu-method list` and `--class list` are not officially documented enumeration commands. In practice they will produce useful output because stress-ng prints the valid options when given an invalid value. The properly documented discovery mechanism is `--stressors` (lists all stressors) and `--class <name>\?` (lists stressors in a specific class). Left as written since both forms achieve the user's goal of seeing the list.
- The Ubuntu repository often ships an older stress-ng than upstream master; the fixed method names (`matrixprod`) and flag names (`--temp-path`) have existed for many years and are valid across all current Ubuntu LTS releases.
- The `--vm-bytes 75%` percentage syntax is officially supported.
- `--sequential 0` correctly defaults to the number of CPUs.
- The `nohup ./overnight_stress.sh &` example does not redirect stdout/stderr, so output would still go to `nohup.out` in the current directory — fine for the use case but worth noting.
