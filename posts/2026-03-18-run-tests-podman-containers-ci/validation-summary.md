# Validation Summary: How to Run Tests in Podman Containers in CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile multi-stage builds
- Node.js and npm
- Bash scripting
- CI/CD test execution
- Container bind mounts and environment variables

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman start documentation: https://docs.podman.io/en/v4.9.3/markdown/podman-start.1.html
- Podman create documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-create.1.html
- Podman cp documentation: https://docs.podman.io/en/v4.4/markdown/podman-cp.1.html
- npm install / ci configuration documentation: https://docs.npmjs.com/cli/v11/commands/npm-install/

## Issues Found
- The first unit test shell script said the container exit code would fail CI, but the script ran `echo` after `podman run` without preserving or exiting with the test status. I changed it to store `TEST_EXIT_CODE`, print it, and exit with that code so CI receives the test result.
- The production stage was labeled "slim, no test deps" but copied `node_modules` from the build stage, which includes development dependencies in a normal Node build. I changed the production stage to run `npm ci --omit=dev` and then copy only the built `dist` output.
- The parallel execution example used `wait $PID || FAILED=1` and then checked `$?` in the following `echo`. When `wait` failed, `$?` would reflect the successful assignment instead of the test failure, causing failed suites to be reported as passed. I changed the script to capture each wait status in a dedicated variable before printing and updating `FAILED`.

## Review Notes
- Podman was not installed in the local environment, so command verification used official Podman documentation rather than local `--help` output.
- The `:Z` bind mount labels are valid on SELinux-enabled hosts, but teams running Podman through a remote machine or on non-SELinux hosts may need to adjust volume behavior for their CI environment.
