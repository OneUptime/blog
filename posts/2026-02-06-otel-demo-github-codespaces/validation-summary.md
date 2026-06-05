# Validation Summary: How to Run the OpenTelemetry Demo App in GitHub Codespaces for Hands-On Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Demo
- GitHub Codespaces
- Docker Compose
- OpenTelemetry JavaScript API
- Jaeger
- Prometheus
- Grafana

## Sources Consulted
- OpenTelemetry Demo Docker deployment documentation: https://opentelemetry.io/docs/demo/docker-deployment/
- OpenTelemetry Demo GitHub repository: https://github.com/open-telemetry/opentelemetry-demo
- OpenTelemetry Demo Docker Compose file and environment configuration: https://github.com/open-telemetry/opentelemetry-demo/blob/main/docker-compose.yml and https://github.com/open-telemetry/opentelemetry-demo/blob/main/.env
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Span API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- GitHub Codespaces machine type documentation: https://docs.github.com/en/codespaces/customizing-your-codespace/changing-the-machine-type-for-your-codespace
- GitHub Codespaces port forwarding documentation: https://docs.github.com/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- Docker Compose CLI reference: https://docs.docker.com/compose/reference/
- Docker Compose ps reference: https://docs.docker.com/reference/cli/docker/compose/ps/

## Issues Found
- The post said the default Codespaces machine type is 4-core, 16GB RAM. GitHub documentation says Codespaces uses the lowest valid machine type by default, and available machine types vary. Updated the wording to avoid a fixed default and to note the demo's documented RAM requirement.
- The post used `docker compose up -d` as the main start command. This works in many cases, but the official OpenTelemetry Demo Docker documentation recommends `docker compose up --force-recreate --remove-orphans --detach`. Updated the command to match the official instructions.
- The post said to wait until all services report as healthy. The current Compose file only defines health checks for some supporting services, so not every service can report `healthy`. Updated the wording to say services should be running, and services with health checks should be healthy.
- The post listed Jaeger on port 16686 and Grafana on port 3000 as key browser ports. The current demo routes browser traffic through the Envoy proxy on port 8080, with Jaeger at `/jaeger/ui/` and Grafana at `/grafana/`; Prometheus remains directly exposed on port 9090. Updated the port list and Jaeger instructions.
- The post used the service name `loadgenerator`, but the current Docker Compose service is `load-generator`. Updated the `docker compose ps` and restart commands.
- The instrumentation example referenced a Node.js currency service at `src/currencyservice/charge.js`, but the current demo has a C++ currency service under `src/currency` and a Node.js payment service under `src/payment`. Replaced the example with a syntactically valid OpenTelemetry JavaScript span helper for `src/payment/charge.js`, and updated the rebuild/restart commands to use the `payment` service.

## Review Notes
The demo changes over time, so future reviews should re-check service names, exposed routes, and language implementations against the current `main` branch or the specific demo release the post targets.
