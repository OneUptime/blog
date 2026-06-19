# Validation Summary: How to Handle Mutation Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mutation testing
- StrykerJS
- Jest
- PIT / Pitest Maven plugin
- mutmut
- GitHub Actions
- JavaScript / TypeScript
- Java
- Python

## Sources Consulted
- StrykerJS configuration documentation: https://stryker-mutator.io/docs/stryker-js/configuration/
- StrykerJS config file documentation: https://stryker-mutator.io/docs/stryker-js/config-file/
- StrykerJS Jest runner documentation: https://stryker-mutator.io/docs/stryker-js/jest-runner/
- StrykerJS disable mutants documentation: https://stryker-mutator.io/docs/stryker-js/disable-mutants/
- StrykerJS incremental mode documentation: https://stryker-mutator.io/docs/stryker-js/incremental/
- PIT Maven quickstart documentation: https://pitest.org/quickstart/maven/
- PIT mutator documentation: https://pitest.org/quickstart/mutators/
- Maven Central entry for `org.pitest:pitest-maven`: https://central.sonatype.com/artifact/org.pitest/pitest-maven
- mutmut latest documentation: https://mutmut.readthedocs.io/en/latest/
- GitHub Actions checkout action: https://github.com/actions/checkout
- GitHub Actions setup-node action: https://github.com/actions/setup-node
- GitHub Actions upload-artifact action: https://github.com/actions/upload-artifact

## Issues Found
- The PIT Maven plugin version was outdated. Updated `pitest-maven` from `1.15.3` to the current `1.25.5` shown on Maven Central.
- The mutmut configuration used mutmut 2 keys (`paths_to_mutate`, `tests_dir`, and `runner`). Updated the example to current mutmut 3 configuration using `source_paths` and `pytest_add_cli_args_test_selection`.
- The mutmut results commands used older workflow commands (`mutmut results` and `mutmut show 42`). Updated the example to use `mutmut browse`, which is the current documented way to inspect results.
- The equivalent-mutant Java example was not syntactically complete. Replaced it with a complete `absoluteValue` method and kept the equivalent mutated condition as the point being illustrated.
- The Stryker "ignore specific mutants" example used `ignorers: ['string-literal']`, but `ignorers` requires configured ignore plugins and `string-literal` is not a built-in ignorer. Replaced it with the documented `mutator.excludedMutations: ['StringLiteral']` option.
- The GitHub Actions mutation score check expected a JSON report and field that the workflow did not configure. Replaced the custom `jq` check with a note that Stryker exits non-zero when `thresholds.break` is not met.
- The Stryker changed-file command was a manual `--mutate` shell pipeline rather than Stryker's documented incremental mode. Replaced it with `npx stryker run --incremental`.
- The mutmut single-file command used the removed `--paths-to-mutate` option. Replaced it with the current documented wildcard style for targeting a module or function.
- The PIT best-practices mutator list used the older `RETURN_VALS` mutator name. Replaced it with the current return mutator names: `EMPTY_RETURNS`, `FALSE_RETURNS`, `TRUE_RETURNS`, `NULL_RETURNS`, and `PRIMITIVE_RETURNS`.

## Review Notes
The article remains a high-level guide. Some examples, such as the JavaScript calculator tests, assume surrounding project setup and imports are present. That is acceptable for the tutorial context, but a future revision could make those snippets fully standalone.
