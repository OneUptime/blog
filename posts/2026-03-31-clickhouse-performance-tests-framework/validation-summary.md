# Validation Summary: How to Use ClickHouse Performance Tests Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse performance testing framework (`tests/performance/`)
- ClickHouse `scripts/perf.py` Python runner
- ClickHouse XML test definition format
- ClickHouse `system.query_log` table
- Python (`clickhouse_driver`, `scipy`)

## Sources Consulted
- ClickHouse GitHub repository: https://github.com/ClickHouse/ClickHouse/tree/master/tests/performance
- ClickHouse performance test scripts: https://github.com/ClickHouse/ClickHouse/tree/master/tests/performance/scripts
- Actual XML test files in the ClickHouse repository (e.g., hits.xml, jit_sort.xml, and others)
- `perf.py` source code for CLI argument validation

## Issues Found

1. **Wrong `perf.py` path**: The post referenced `tests/performance/perf.py` but the actual location is `tests/performance/scripts/perf.py`. Fixed all occurrences.

2. **Non-existent `requirements.txt`**: The post referenced `pip3 install -r tests/performance/requirements.txt` but no such file exists. Replaced with the actual dependencies: `pip3 install clickhouse_driver scipy`.

3. **Wrong CLI flags**: The post used `--test` and `--output json` flags which do not exist in `perf.py`. The test file is a positional argument, and there is no `--output` flag. Fixed all command examples.

4. **Fabricated XML structure**: The post used `<name>`, `<preconditions>` (as a wrapper for create/fill queries), `<stop_conditions>`, `<all_of>`, `<iterations>`, and `<min_time_not_changing_for_ms>` tags — none of which exist in the actual framework. Fixed XML to use the correct structure where `<create_query>`, `<fill_query>`, `<query>`, and `<drop_query>` are direct children of `<test>`.

5. **Missing `<drop_query>`**: The post omitted the `<drop_query>` cleanup tag, which is standard in ClickHouse performance test files. Added it to the example.

6. **Non-existent `report.py`**: The post referenced `tests/performance/report.py` which does not exist. Removed all references and corrected the workflow description.

7. **Wrong multi-host syntax**: The post used `--host localhost:9000 --host new-server:9000` (combined host:port with repeated flags). The actual syntax uses space-separated lists: `--host localhost new-server --port 9000 9000`. Fixed.

8. **Fabricated output format**: The post showed a made-up output format (`Query 1: 12.3 ms -> 9.8 ms (1.25x speedup)`). Replaced with accurate description of TSV-formatted output.

9. **Misleading query filter**: The `fill_query` used `toString(rand() % 5)` which produces values '0' through '4', but the example query filtered on `event_type = 'page_view'` which would never match. Changed to `event_type = '3'` to match actual inserted data.

## Review Notes
- The `system.query_log` SQL query is correct: `query_duration_ms` is a valid column, `median()` works as an alias for `quantile(0.5)`, and `QueryFinish` is a valid type value.
- The post does not mention `<substitutions>` (parameterized tests) or `<settings>` blocks, which are commonly used features. These are mentioned in passing in the overview but could be covered in more detail in a future update.
- The `--runs` flag was added to the CI/CD example for clarity on controlling iteration count, since the `<stop_conditions>` mechanism was removed.
