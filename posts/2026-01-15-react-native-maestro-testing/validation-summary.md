# Validation Summary: How to Set Up End-to-End Testing for React Native with Maestro

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- Maestro CLI
- Maestro Flows
- Maestro Cloud
- YAML
- JavaScript
- GitHub Actions
- GitLab CI
- CircleCI

## Sources Consulted
- Maestro CLI installation documentation: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli
- Maestro CLI commands and options: https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options
- Maestro commands reference: https://docs.maestro.dev/reference/commands-available
- Maestro selectors documentation: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/how-to-use-selectors
- Maestro core selectors reference: https://docs.maestro.dev/reference/selectors/core-selectors
- Maestro relational selectors reference: https://docs.maestro.dev/reference/selectors/relational-selectors
- Maestro state selectors reference: https://docs.maestro.dev/reference/selectors/state-selectors
- Maestro conditions documentation: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/conditions
- Maestro nested flows documentation: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/nested-flows
- Maestro JavaScript and runScript documentation: https://docs.maestro.dev/reference/commands-available/runscript
- Maestro workspace configuration reference: https://docs.maestro.dev/reference/workspace-configuration
- React Native environment setup documentation: https://reactnative.dev/docs/set-up-your-environment

## Issues Found
- Added Maestro's Java 17+ prerequisite and updated the install command to the documented `curl -fsSL` form.
- Corrected `launchApp` wording because it does not clear app state unless `clearState: true` is supplied.
- Replaced unsupported or outdated Maestro commands and snippets: `clearText` to `eraseText`, `waitForElement` and `waitUntilNotVisible` to `extendedWaitUntil`, arbitrary `wait` examples to supported wait commands, and `assertEnabled` / `assertDisabled` to `assertVisible` with `enabled` state selectors.
- Replaced unsupported selector syntax: `label` with `text` for accessibility labels, removed `regex: true`, and expanded `containsChild` to a selector object.
- Corrected swipe examples to use `from` instead of `element`, and removed the unsupported `scrollUntilVisible.container` example.
- Reworked JavaScript examples to match Maestro's documented `evalScript`, `copyTextFrom`, `assertTrue`, and `runScript` APIs.
- Corrected CLI environment variable usage from an unsupported dotenv-style `--env file` example to documented `-e KEY=VALUE` usage and inline `env` constants.
- Corrected nested flow and script paths to be relative to the calling flow file.
- Corrected Maestro Cloud login from `maestro cloud login` to `maestro login`, and replaced unsupported Cloud config fields with documented workspace configuration fields.
- Corrected debugging examples to use global `--verbose`, a required `--debug-output` path, and the documented uppercase `JUNIT` format.
- Revised an inaccurate Detox performance claim that test changes require a full build cycle.

## Review Notes
The CI examples remain representative and may still require project-specific build paths, signing, simulator names, or emulator setup changes in a real React Native repository. Maestro Cloud device selection can also be configured through CLI flags such as `--android-api-level`, `--device-model`, and `--device-os` when needed.
