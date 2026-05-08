# Validation Summary: How to Rotate Secrets in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Bash scripting
- Container health checks
- Blue-green deployment
- Cron-style scheduled automation
- PostgreSQL password rotation

## Sources Consulted
- Podman secret create manual: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman secret rm manual: https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- Podman run secret option manual: https://docs.podman.io/en/latest/markdown/podman-run.1.html#secret-secret-opt-opt
- Podman healthcheck run manual: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html

## Issues Found
- The post stated that Podman does not have a built-in rotation command and only described remove-and-recreate. Podman supports `podman secret create --replace`, so the explanation and examples were updated to use `--replace`.
- The rotation script stopped containers and then used `podman start`, which would not recreate containers with the new secret value. The script was changed to remove affected containers and instruct the operator to recreate them with the original `podman run` options.
- The automated rotation example also used `podman start` after replacing the secret. It was updated to remove and recreate `my-app` so the new secret is available to the application container.
- The blue-green example described recreating the original secret name as a rename step. It was updated to use `podman secret create --replace` and describe this as replacing the standard secret name for future deployments.

## Review Notes
Podman was not installed in the local review environment, so command behavior was verified against current official Podman documentation rather than local `--help` output. Future improvements could show a complete production recreate command including all original ports, volumes, environment variables, and labels, because Podman cannot infer those from the shortened examples.
