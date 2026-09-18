# Validation Summary: How to Fan Out Drone Test Shards and Fan In Coverage and Test Reports

## Status
validated

## Post Type
Technical guide / CI configuration tutorial

## Technologies Covered
- Drone Docker pipelines
- Python 3.13
- pytest
- pytest-cov
- coverage.py
- JUnit XML reports
- CI artifact storage

## Sources Consulted
- Drone Docker pipeline workspace documentation: https://docs.drone.io/pipeline/docker/syntax/workspace/
- Drone Docker pipeline steps documentation: https://docs.drone.io/pipeline/docker/syntax/steps/
- Drone Docker pipeline parallelism documentation: https://docs.drone.io/pipeline/docker/syntax/parallelism/
- Drone pipeline status conditions documentation: https://docs.drone.io/pipeline/docker/syntax/conditions/
- coverage.py `combine` command documentation: https://coverage.readthedocs.io/en/latest/commands/cmd_combine.html
- coverage.py reporting command documentation: https://coverage.readthedocs.io/en/latest/commands/cmd_reporting.html
- pytest-cov reporting documentation: https://pytest-cov.readthedocs.io/en/latest/reporting.html
- pytest-cov configuration documentation: https://pytest-cov.readthedocs.io/en/latest/config.html
- pytest-cov project documentation and coverage data-file behavior: https://github.com/pytest-dev/pytest-cov
- pytest JUnit XML documentation: https://docs.pytest.org/en/stable/how-to/output.html#creating-junitxml-format-files

## Issues Found
- Added `--cov-fail-under=0` to both shard commands. Suppressing report output does not disable a coverage threshold inherited from project configuration, so passing shards could fail on partial coverage even when combined coverage exceeds the intended threshold. The override defers coverage threshold enforcement to the collector without suppressing test assertion failures.

## Review Notes
- The configuration correctly gives every step an explicit place in the Drone dependency graph, runs the two shards concurrently after preparation, and allows collection on both success and failure without suppressing shard failures.
- The per-shard `COVERAGE_FILE` values isolate coverage databases, `--cov-report=` suppresses per-shard reports while retaining coverage data, and `coverage combine --keep` accepts the explicitly named files and preserves them.
- `coverage report --fail-under=80` correctly exits nonzero when combined coverage is below the threshold.
- A local pytest-cov reproduction with a configured 80% threshold produced 75% coverage in each passing shard and 100% combined coverage. It confirmed the original per-shard commands failed prematurely. No live Drone pipeline was run.
- The cautions about JUnit XML concatenation, workspace lifetime, distinct storage identities for separate pipelines, source-path consistency, and incomplete executions are technically sound.
- The post intentionally leaves the artifact uploader implementation service-specific. Its advice to pin dependencies and the container image by digest is important because the example otherwise tracks mutable package and image releases.
