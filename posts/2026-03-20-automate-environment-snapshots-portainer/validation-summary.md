# Validation Summary: How to Automate Environment Snapshots and Reporting in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer API
- Bash
- `curl`
- Python
- Docker Engine API (via Portainer reverse proxy)
- Prometheus Pushgateway
- Cron

## Sources Consulted
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.2 OpenAPI: https://api-docs.portainer.io/versions/ce/2.39.2/openapi.yaml
- Portainer CE 2.39.2 endpoints schema: https://api-docs.portainer.io/versions/ce/2.39.2/endpoints.yaml
- Portainer CE 2.39.2 stacks schema: https://api-docs.portainer.io/versions/ce/2.39.2/stacks.yaml
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker Engine API v1.24 container list reference: https://docs.docker.com/reference/api/engine/version/v1.24/
- Prometheus exposition format docs: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus Pushgateway usage guidance: https://prometheus.io/docs/practices/pushing/
- Prometheus Pushgateway README: https://github.com/prometheus/pushgateway/blob/master/README.md
- Local CLI help for `curl`: `curl --help`

## Issues Found
- The post originally claimed explicit snapshot triggering was a Portainer Business Edition-only feature. The current Portainer CE 2.39.2 API spec exposes `POST /api/endpoints/{id}/snapshot`, so I corrected the text to remove the CE/BE split and note that administrator access is required.
- The report example was described as working across all environments, but it calls Portainer’s Docker reverse-proxy endpoints (`/api/endpoints/{id}/docker/...`), which only apply to Docker-compatible environment types. I updated the wording and filtered the script to Docker, Agent-on-Docker, and Edge Agent-on-Docker environments.
- The stack count example sent `{"EndpointID": env_id}` in the `filters` query parameter. Portainer documents `filters` as a JSON-encoded string map for `/api/stacks`, so I changed the example to send `EndpointID` as a string.
- The reporting script wrote `Report saved to: ...` to standard output after the JSON payload. That breaks the later `json.load(sys.stdin)` pipeline in the Pushgateway example, so I redirected the status line to standard error to keep stdout machine-readable.
- The dashboard section said to pipe the data to Prometheus, but the actual example pushes metrics to a Pushgateway. I corrected the wording to match Prometheus’ documented Pushgateway workflow for batch jobs.
- The Pushgateway example emitted `# HELP` metadata inside the per-environment loop, which violates the Prometheus text exposition format because each metric may only have one `HELP` and one `TYPE` line. I moved the metadata outside the loop and added label-value escaping for backslashes, quotes, and newlines.

## Review Notes
- The `X-API-Key` authentication header, snapshot endpoints, Docker reverse-proxy paths, and stack filter shape were verified against current Portainer documentation and the CE 2.39.2 OpenAPI files.
- The extracted Bash and Python snippets were syntax-checked locally after patching, including the inline Python used in the Pushgateway pipeline.
- The end-to-end workflow was not executed against a live Portainer instance in this environment.
- The `mail` utility is not installed in this review environment, so the cron line’s surrounding syntax was reviewed but the `mail` command itself was not execution-tested here.
