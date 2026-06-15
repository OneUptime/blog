# Validation Summary: How to Configure Mutation Testing with Stryker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- StrykerJS
- Mutation testing
- JavaScript
- TypeScript
- Jest
- GitHub Actions
- npm
- jq

## Sources Consulted
- StrykerJS Getting Started: https://stryker-mutator.io/docs/stryker-js/getting-started/
- StrykerJS Usage: https://stryker-mutator.io/docs/stryker-js/usage/
- StrykerJS Config File: https://stryker-mutator.io/docs/stryker-js/config-file/
- StrykerJS Configuration Options: https://stryker-mutator.io/docs/stryker-js/configuration/
- StrykerJS Jest Runner: https://stryker-mutator.io/docs/stryker-js/jest-runner/
- StrykerJS TypeScript Checker: https://stryker-mutator.io/docs/stryker-js/typescript-checker/
- StrykerJS Incremental Mode: https://stryker-mutator.io/docs/stryker-js/incremental/
- StrykerJS Disable Mutants: https://stryker-mutator.io/docs/stryker-js/disable-mutants/
- Stryker Supported Mutators: https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/
- Stryker Mutant States and Metrics: https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/

## Issues Found
- The initializer command used `npm init stryker`; updated it to the officially documented `npm init stryker@latest`.
- The configuration did not enable the JSON reporter, but the CI workflow read `reports/mutation/mutation-report.json`; added the `json` reporter and `jsonReporter.fileName`.
- The workflow's `jq` expression expected a non-existent per-file `mutationScore` field; replaced it with a calculation based on mutant statuses from the Stryker JSON report schema.
- The mutation operator examples included generic statement removal and `array.map()` removal, which do not match the current StrykerJS supported mutator list; changed these to block statement removal and `some()` to `every()`.
- The changed-files shell example created a trailing comma in the `--mutate` value; changed it to use `paste -sd, -` for a clean comma-separated list.

## Review Notes
The dashboard reporter is valid, but real projects usually need dashboard options and credentials before uploads are useful. The post keeps it as an optional reporter in the example.
