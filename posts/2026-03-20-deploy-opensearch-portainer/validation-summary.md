# Validation Summary: How to Deploy OpenSearch via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenSearch
- OpenSearch Dashboards
- Portainer
- Docker Compose
- Linux `sysctl` / `vm.max_map_count`
- `curl`

## Sources Consulted
- OpenSearch Docker install docs: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker
- OpenSearch Dashboards Docker docs: https://docs.opensearch.org/latest/install-and-configure/install-dashboards/docker/
- OpenSearch demo security configuration docs: https://docs.opensearch.org/latest/security/configuration/demo-configuration/
- OpenSearch Index Document API docs: https://docs.opensearch.org/latest/api-reference/document-apis/index-document/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- OpenSearch release schedule: https://opensearch.org/releases/
- OpenSearch downloads and current Docker tags: https://opensearch.org/downloads/

## Issues Found
- The post pinned `opensearchproject/opensearch:2.14.0` and `opensearchproject/opensearch-dashboards:2.14.0`. The OpenSearch 2.14 documentation is now unmaintained, so I updated both images to `3.6.0`, the current release available on 2026-05-01.
- The Dashboards container configuration used the `admin` account and did not set TLS verification mode. Official secured-Docker guidance uses the built-in `kibanaserver` service account and `opensearch.ssl.verificationMode: none` when using the demo certificates, so I updated the environment variables accordingly.
- The indexing example used `POST /my-index/_doc/1` with an explicit document ID. The documented endpoint for indexing a document with a fixed ID is `PUT /{index}/_doc/{id}`, so I corrected the example to `PUT`.
- The conclusion referred to the behavior as applying to “versions 2.x+”. I updated it to the current documented rule that `OPENSEARCH_INITIAL_ADMIN_PASSWORD` is required for new demo-configuration installs in OpenSearch 2.12 and later, including the current 3.x line.

## Review Notes
- The compose snippet uses OpenSearch's bundled demo security configuration. That is acceptable for a tutorial, but production deployments should replace the demo certificates and default internal service-user passwords.
- The `depends_on` health-check gating shown in the stack file is valid Docker Compose behavior and is suitable for Portainer stacks on Docker standalone environments.
