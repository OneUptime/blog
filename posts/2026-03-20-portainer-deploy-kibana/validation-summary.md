# Validation Summary: How to Deploy Kibana via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Kibana
- Elasticsearch
- Nginx

## Sources Consulted
- Elastic Docs: Install Kibana with Docker — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Elastic Docs: General settings in Kibana — https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- Elastic Docs: Telemetry settings in Kibana — https://www.elastic.co/docs/reference/kibana/configuration-reference/telemetry-settings
- Elastic Docs: Reporting settings in Kibana — https://www.elastic.co/docs/reference/kibana/configuration-reference/reporting-settings
- Elastic Docs: Built-in users in self-managed clusters — https://www.elastic.co/guide/en/elasticsearch/reference/current/built-in-users.html
- Elastic Docs: Change passwords API — https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-change-password-3
- Elastic Docs: Get Kibana's current status — https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-get-status
- Elastic Docs: Data views — https://www.elastic.co/guide/en/kibana/current/data-views.html
- Elastic Docs: Create a dashboard — https://www.elastic.co/guide/en/kibana/current/create-dashboard.html
- Elastic Docs: Upgrade Kibana — https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster/kibana
- NGINX Docs: `ngx_http_proxy_module` — https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The stack used `TELEMETRY_ENABLED=false`, but Kibana's documented telemetry setting is `telemetry.optIn`, not `telemetry.enabled`. I removed the invalid environment variable so the post no longer instructs readers to use a non-existent setting.
- The stack used `ELASTICSEARCH_HOSTS=http://elasticsearch:9200`. Elastic's Docker documentation shows this setting being passed in JSON array form, and `elasticsearch.hosts` is documented as a list of URLs. I changed it to `ELASTICSEARCH_HOSTS='["http://elasticsearch:9200"]'`.
- The healthcheck called `GET /api/status` anonymously even though Kibana's `status.allowAnonymous` default is `false` when authentication is enabled, and the status API is documented with basic or API-key auth. I updated the healthcheck to authenticate with `elastic:elastic_password`.
- The prerequisites did not state that Kibana should run against Elasticsearch of the same version. Elastic's upgrade guidance says Kibana must be upgraded after Elasticsearch and to the same version. I clarified that the example expects Elasticsearch `8.13.0`.
- The section heading used the outdated term "Index Patterns". Current Kibana documentation uses "Data Views" and describes index patterns as the former name. I updated the heading to match current Kibana terminology.
- The Nginx example forwarded requests upstream without clearing the client's `Authorization` header. Based on NGINX's documented default of forwarding request headers and Kibana's documented handling of client `authorization` headers for basic authentication, I inferred that the proxy's Basic Auth credentials could interfere with Kibana's own login flow. I added `proxy_set_header Authorization "";` to prevent that.
- The conclusion said the healthcheck makes Kibana "become available" only when initialized. Healthchecks actually determine container health state, not whether the port is reachable. I corrected the wording to say Kibana is marked healthy when fully initialized.

## Review Notes
- The example version `8.13.0` is older than the current latest Kibana release as of April 24, 2026, but the documented settings and APIs used here remain valid for Kibana 8.13.0. I kept that version so the post stays aligned with the linked Elasticsearch example and the same-version requirement.
- The reverse-proxy example is still intentionally minimal. It is acceptable for a basic internal setup, but production hardening would usually add more proxy headers and stricter TLS handling.
