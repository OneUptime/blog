# Validation Summary: How to Balance Pytest Shards Across Buildkite Parallel Jobs

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Buildkite Pipelines parallel jobs
- Buildkite Test Engine Client (`bktec`)
- Tests Buildkite plugin v1.0.0
- pytest and JUnit XML output
- Buildkite Test Collector for Python
- pytest-xdist

## Sources Consulted

- [Tests Buildkite plugin documentation](https://github.com/buildkite-plugins/tests-buildkite-plugin)
- [Tests Buildkite plugin configuration schema](https://github.com/buildkite-plugins/tests-buildkite-plugin/blob/main/plugin.yml)
- [Tests plugin v1.0.0 client installation and upload compatibility checks](https://github.com/buildkite-plugins/tests-buildkite-plugin/blob/v1.0.0/hooks/pre-command)
- [Buildkite Test Engine Client pytest guide](https://github.com/buildkite/test-engine-client/blob/main/docs/pytest.md)
- [Installing and using the Test Engine Client](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client)
- [Buildkite parallel builds documentation](https://buildkite.com/docs/pipelines/best-practices/parallel-builds)
- [pytest invocation and selection documentation](https://docs.pytest.org/en/stable/how-to/usage.html)

## Issues Found
- Clarified that Tests plugin v1.0.0 reuses an existing `bktec` on `PATH` instead of automatically replacing it. Added the v2.7.0 minimum for built-in uploads so an older preinstalled client does not silently lose the example's result-upload behavior.

## Review Notes
The examples target the current Tests plugin v1.0.0 and current bktec selector-based pytest behavior. The post appropriately advises readers to inspect the behavior of a pinned client version because older bktec releases differ in splitting behavior and collector compatibility.
