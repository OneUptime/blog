# Validation Summary: How to Integrate Portainer API with Datadog for Monitoring - Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Datadog Metrics API
- Python
- Docker Compose / Portainer Stacks

## Sources Consulted
- Portainer: Accessing the Portainer API — https://docs.portainer.io/2.21/api/access
- Portainer: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer: Using your own SSL certificate with Portainer — https://docs.portainer.io/advanced/ssl
- Portainer: How Relative Path Support works in Portainer — https://docs.portainer.io/sts/advanced-topics/relative-paths
- Docker Docs: docker container stats — https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Engine API version history — https://docs.docker.com/reference/api/engine/version-history/
- Requests docs: SSL Cert Verification and timeouts — https://docs.python-requests.org/en/latest/user/advanced/#ssl-cert-verification
- Datadog API: Metrics — https://docs.datadoghq.com/api/latest/metrics/
- Datadog guide: metric and tag naming best practices — https://docs.datadoghq.com/extend/guide/what-best-practices-are-recommended-for-naming-metrics-and-tags/
- Datadog: Organization Settings — https://docs.datadoghq.com/account_management/org_settings/
- Datadog: API and Application Keys — https://docs.datadoghq.com/account_management/api-app-keys/

## Issues Found
- The Python example authenticated Portainer access tokens with `Authorization: Bearer ...`, but Portainer’s access-token flow uses the `X-API-Key` header. I updated both Portainer requests to use `X-API-Key`.
- The CPU percentage calculation used only `percpu_usage` length and did not guard against zero deltas. Docker documents the `online_cpus` field for stats responses and notes compatibility fallback behavior, so I updated the calculation to prefer `online_cpus`, fall back to `percpu_usage`, and return `0.0` when the deltas are not usable.
- The stack example used `https://portainer:9443` without accounting for Portainer’s default self-signed certificate. Requests verifies HTTPS certificates by default, so I added `PORTAINER_CA_CERT` / `PORTAINER_VERIFY_TLS` handling in the script and documented the requirement in the deployment section.
- The stack example mounted `./collector.py` but did not explain when that relative bind mount works in Portainer. I added a brief note that, in Portainer, this requires deploying from Git with relative path volumes enabled and storing `collector.py` alongside the compose file.
- The stack example omitted `PORTAINER_ENDPOINT_ID`, even though the script supports it. I added the environment variable to make the deployment example match the script.
- The stack example used `https://portainer:9443` as a hostname, which is not generally resolvable unless the collector can actually reach Portainer by that service name on a shared network. I replaced it with a host placeholder.

## Review Notes
- Datadog documents both `v1` and `v2` metric submission endpoints. The post’s `v1` submission flow is still officially documented, so it remains valid.
- Docker’s stats API reports raw memory usage, which can differ from the `docker stats` CLI display on Linux because the CLI subtracts cache usage. The post’s memory metric is still valid, but readers should not assume it exactly matches the CLI output.
