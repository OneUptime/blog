# Validation Summary: How to Build Mutation Testing Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Mutation testing
- StrykerJS
- JavaScript
- TypeScript
- Jest
- PIT / Pitest
- Maven
- GitHub Actions

## Sources Consulted
- StrykerJS configuration documentation: https://stryker-mutator.io/docs/stryker-js/configuration/
- StrykerJS config file documentation: https://github.com/stryker-mutator/stryker-js/blob/master/docs/config-file.md
- StrykerJS CLI help for @stryker-mutator/core 9.6.1
- Stryker supported mutators documentation: https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/
- PIT Maven quickstart: https://pitest.org/quickstart/maven/
- PIT mutators documentation: https://pitest.org/quickstart/mutators/
- PIT Maven artifact metadata on Maven Central: https://central.sonatype.com/artifact/org.pitest/pitest-maven

## Issues Found
- The Stryker command for passing a specific config file used `--configFile`, but current StrykerJS expects the config file as the `run` command argument. Changed it to `npx stryker run stryker.config.json`.
- The PIT Maven plugin version was outdated at `1.15.0`. Updated it to the current Maven Central version, `1.25.4`.
- The PIT mutator list used `RETURN_VALS`, which PIT documents as superseded by the newer return mutator set. Replaced it with `EMPTY_RETURNS`, `FALSE_RETURNS`, `TRUE_RETURNS`, `NULL_RETURNS`, and `PRIMITIVE_RETURNS`.
- The PIT Maven commands skipped the `test-compile` phase shown in the official quickstart. Added `test-compile` before the PIT goal.
- The GitHub Actions example attempted to parse `.mutationScore` from Stryker's JSON report, but Stryker's JSON reporter emits the mutation testing report schema rather than a top-level `mutationScore`, and the example did not enable the JSON reporter. Removed the incorrect parsing step and left Stryker's built-in threshold handling via configuration.
- The mutation score definition was too narrow because mutation testing tools calculate score against valid/non-equivalent mutants and may count detected mutants beyond only the `Killed` state. Updated the wording and formula accordingly.

## Review Notes
The example GitHub Actions workflow depends on thresholds configured in `stryker.config.json`; future revisions could make that dependency explicit in the surrounding prose. The JavaScript and Jest examples are syntactically valid and use current APIs.
