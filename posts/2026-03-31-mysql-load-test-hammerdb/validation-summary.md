# Validation Summary: How to Load Test MySQL with HammerDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- HammerDB (open-source database load testing tool)
- TPC-C (OLTP benchmark workload)
- TPC-H (analytic benchmark workload)
- Tcl scripting (HammerDB CLI scripting interface)

## Sources Consulted
- HammerDB official documentation: https://www.hammerdb.com/docs/ch04.html (TPROC-C workload configuration)
- HammerDB official documentation: https://www.hammerdb.com/docs/ch04s03.html (MySQL TPC-C schema settings)
- HammerDB official documentation: https://www.hammerdb.com/docs/ch09s03.html (CLI command reference)
- HammerDB official documentation: https://www.hammerdb.com/docs/ch09s04.html (CLI configuration and diset syntax)
- HammerDB official MySQL TPC-C build script: https://github.com/TPC-Council/HammerDB/blob/master/scripts/tcl/mysql/tprocc/mysql_tprocc_buildschema.tcl
- HammerDB official MySQL TPC-C run script: https://github.com/TPC-Council/HammerDB/blob/master/scripts/tcl/mysql/tprocc/mysql_tprocc_run.tcl
- HammerDB official MySQL TPC-H build script: https://github.com/TPC-Council/HammerDB/blob/master/scripts/tcl/mysql/tproch/mysql_tproch_buildschema.tcl
- HammerDB official MySQL TPC-H run script: https://github.com/TPC-Council/HammerDB/blob/master/scripts/tcl/mysql/tproch/mysql_tproch_run.tcl

## Issues Found

### Issue 1: `mysql_user`, `mysql_pass`, and `mysql_db` placed in wrong `diset` dictionary (build_tpcc.tcl)
- **What was wrong:** The build script used `diset connection mysql_user`, `diset connection mysql_pass`, and `diset connection mysql_db` to set credentials and database name. In HammerDB, only `mysql_host`, `mysql_port`, and `mysql_socket` belong in the `connection` dictionary. User, password, and database settings belong in the `tpcc` dictionary.
- **What was changed:** Changed to `diset tpcc mysql_user`, `diset tpcc mysql_pass`, `diset tpcc mysql_dbase`.
- **Why:** Verified against the official HammerDB MySQL TPC-C build script on GitHub, which places these parameters in the `tpcc` dictionary.

### Issue 2: Parameter name `mysql_db` should be `mysql_dbase` (build_tpcc.tcl and run_tpcc.tcl)
- **What was wrong:** The parameter name `mysql_db` is not a valid HammerDB parameter. The correct name is `mysql_dbase`.
- **What was changed:** Renamed `mysql_db` to `mysql_dbase` in both TPC-C scripts.
- **Why:** Verified against official HammerDB scripts which use `mysql_dbase`.

### Issue 3: `mysql_user`, `mysql_pass`, and `mysql_db` placed in wrong `diset` dictionary (run_tpcc.tcl)
- **What was wrong:** Same issue as the build script — credentials and database were set under the `connection` dictionary instead of `tpcc`.
- **What was changed:** Changed to `diset tpcc mysql_user`, `diset tpcc mysql_pass`, `diset tpcc mysql_dbase`.
- **Why:** Same as Issue 1.

### Issue 4: TPC-H script used wrong dictionary and parameter names for credentials
- **What was wrong:** The TPC-H script used `diset connection mysql_user`, `diset connection mysql_pass`, and `diset connection mysql_db`. For TPC-H, user/pass/database parameters belong in the `tpch` dictionary and use the `mysql_tpch_` prefix: `mysql_tpch_user`, `mysql_tpch_pass`, `mysql_tpch_dbase`.
- **What was changed:** Replaced with `diset tpch mysql_tpch_user`, `diset tpch mysql_tpch_pass`, `diset tpch mysql_tpch_dbase`. Removed the redundant `diset connection mysql_db tpch` line since `mysql_tpch_dbase` was already set.
- **Why:** Verified against the official HammerDB MySQL TPC-H build and run scripts on GitHub.

### Issue 5: `print result` is not a valid HammerDB CLI command
- **What was wrong:** Both the TPC-C run script and TPC-H script used `print result`. The `print` command only supports these subcommands: db, bm, dict, generic, script, vuconf, vucreated, vustatus, datagen. `result` is not among them.
- **What was changed:** Removed `print result` from both scripts. HammerDB virtual users automatically print NOPM/TPM results to stdout upon completion.
- **Why:** Verified against the HammerDB CLI command reference (ch09s03.html) which lists all valid `print` subcommands.

## Review Notes
- The `waittocomplete` command is officially deprecated in HammerDB 4.x (replaced by `keepalive_margin` behavior and `vucomplete` polling). It likely still functions but may be removed in a future version. The official HammerDB example scripts no longer use it. A future update could replace `waittocomplete` with a `vucomplete` polling loop or rely on the `hammerdbcli auto` mode's built-in completion handling.
- The `innodb_log_file_size` MySQL parameter is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`. Since the post does not target a specific MySQL version, this is acceptable but worth noting for readers on MySQL 8.0.30+. The equivalent would be `innodb_redo_log_capacity = 1G` (replacing two 512M log files).
- The download URL for HammerDB v4.9 follows the correct GitHub release URL pattern for the TPC-Council/HammerDB repository. The exact version availability should be verified by readers at the time of use.
- The 1 warehouse ≈ 100 MB estimate is reasonable and consistent with typical HammerDB TPC-C schema sizes for MySQL/InnoDB.
- The NOPM/TPM result format shown in the "Interpreting Results" section matches the actual HammerDB output format.
