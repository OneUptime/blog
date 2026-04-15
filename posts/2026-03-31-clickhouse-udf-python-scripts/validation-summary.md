# Validation Summary: How to Create UDFs with Python Scripts in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (executable UDFs)
- Python 3
- ClickHouse XML configuration for UDF registration
- scikit-learn / joblib (ML model loading example)
- TabSeparated format for stdin/stdout communication

## Sources Consulted
- ClickHouse official documentation on executable UDFs: https://clickhouse.com/docs/en/sql-reference/functions/udf
- ClickHouse server configuration reference for `user_defined_executable_functions_config` and `user_scripts_path`
- ClickHouse source default config for glob patterns (`*_function.xml`)

## Issues Found

### 1. Incorrect `<command>` value in XML config (two occurrences)
- **What was wrong:** The `<command>` tag used `python3 /var/lib/clickhouse/user_scripts/normalize_phone.py` (full path with `python3` prefix). With `execute_direct=1` (the default since ClickHouse 21.11), ClickHouse resolves the command name against the `user_scripts/` directory and executes the script directly. Using the full path with a `python3` prefix would cause ClickHouse to search for a binary named `python3` inside user_scripts, which would fail.
- **What was changed:** Changed `<command>python3 /var/lib/clickhouse/user_scripts/normalize_phone.py</command>` to `<command>normalize_phone.py</command>`. Same fix applied to the `executable_pool` example: `classifier.py` instead of the full path.
- **Why:** The script's shebang (`#!/usr/bin/env python3`) handles interpreter selection. ClickHouse executes the script directly from the user_scripts directory.

### 2. Incorrect XML config file path and naming
- **What was wrong:** The post specified `/etc/clickhouse-server/user_defined/normalize_phone.xml` as the config file location. The default `user_defined_executable_functions_config` glob pattern is `*_function.xml`, resolved relative to `/etc/clickhouse-server/`. The `user_defined/` subdirectory is not part of the default config path for executable UDFs, and the filename `normalize_phone.xml` does not match the default glob pattern.
- **What was changed:** Updated path to `/etc/clickhouse-server/normalize_phone_function.xml`.
- **Why:** The file must match the default glob `*_function.xml` and be in the correct directory for ClickHouse to auto-discover it.

## Review Notes
- The `executable_pool` section is correct but could benefit from mentioning `send_chunk_header` (which tells the script how many rows to expect per batch) and timeout options (`max_command_execution_time`, `command_termination_timeout`). These are optional but commonly used in production setups.
- The `sudo -u clickhouse pip3 install` command is functional but may fail if the `clickhouse` user lacks a writable home directory. Adding `--user` flag or mentioning virtual environments would be more robust, but this is acceptable for a tutorial.
- The Python scripts correctly demonstrate the stdin/stdout communication pattern, including `sys.stdout.flush()` which is important for avoiding buffering issues.
- The multi-argument tab-separated parsing is correct for the `TabSeparated` format.
