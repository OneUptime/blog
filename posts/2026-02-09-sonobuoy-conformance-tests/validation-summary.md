# Validation Summary: How to Run Kubernetes Cluster Conformance Tests Using Sonobuoy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Sonobuoy
- Kubernetes e2e conformance tests
- Sonobuoy plugins
- kubectl
- GitHub Actions
- Bash
- YAML

## Sources Consulted
- Sonobuoy v0.57.3 CLI help from the official release binary: `sonobuoy run`, `sonobuoy modes`, `sonobuoy results`, `sonobuoy delete`, `sonobuoy wait`, `sonobuoy logs`, and `sonobuoy gen`
- Sonobuoy Overview: https://sonobuoy.io/docs/v0.57.3/
- Sonobuoy E2E plugin and built-in modes: https://sonobuoy.io/docs/v0.57.3/e2eplugin/
- Sonobuoy CLI documentation for `run`: https://sonobuoy.io/docs/v0.57.3/cli/sonobuoy_run/
- Sonobuoy plugin documentation: https://sonobuoy.io/docs/v0.57.3/plugins/
- Sonobuoy results documentation: https://sonobuoy.io/docs/v0.57.3/results/
- Sonobuoy FAQ for failure analysis and e2e result paths: https://sonobuoy.io/docs/v0.57.3/faq/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- GitHub Actions documentation for current action versions: https://docs.github.com/en/actions

## Issues Found
- The post described invalid or misleading Sonobuoy modes. Replaced the nonexistent `conformance` mode and incorrect quick-mode description with the actual built-in modes: `non-disruptive-conformance`, `quick`, `conformance-lite`, and `certified-conformance`.
- The post implied full conformance was safe for production. Clarified that `certified-conformance` can include disruptive tests and should not be run against production workloads without care.
- Updated Linux and GitHub Actions installation examples from Sonobuoy v0.57.0 to v0.57.3, matching the current official release binary verified during review.
- Corrected the e2e JUnit result filename from `junit.xml` to `junit_01.xml`.
- Replaced invalid `--e2e-parallel=y` examples with `--mode conformance-lite` and `--plugin-env=e2e.E2E_PARALLEL=true`.
- Replaced invalid `--node-selectors` usage with the supported `--aggregator-node-selector` flag and corrected its `key:value` syntax.
- Reworked custom plugin YAML examples to use valid Sonobuoy plugin fields, `/tmp/results`, a named container, manual result files, and a done file containing the result filename.
- Fixed shell portability in the storage plugin by removing Bash-only brace expansion while the command runs under `/bin/sh`.
- Fixed the default StorageClass check to inspect the official `storageclass.kubernetes.io/is-default-class` annotation rather than grepping table output.
- Updated CI result checking to match Sonobuoy report output (`Failed: 0`) and scoped checks to the `e2e` plugin.
- Updated GitHub Actions examples from deprecated `actions/checkout@v2` and `actions/upload-artifact@v2` to v4.
- Corrected failed-test analysis commands to use `--mode detailed --plugin e2e`, matching Sonobuoy's documented detailed result output.
- Fixed result tarball extraction examples so paths under `sonobuoy-results/` exist before being referenced.
- Replaced invalid `sonobuoy delete --force` with `sonobuoy delete --all --wait`, which is the supported cleanup option for dangling e2e namespaces.
- Fixed conformance artifact copy commands so `junit_01.xml` and `e2e.log` are copied to the current directory without overwriting one another.

## Review Notes
The post is now technically valid for Sonobuoy v0.57.3. The custom plugin examples are illustrative and assume Sonobuoy's default cluster-admin permissions; more restrictive deployments may need explicit RBAC and namespace adjustments.
