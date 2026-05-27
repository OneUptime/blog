# Validation Summary: How to Use the Ansible grafana_annotations Callback Plugin

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible callback plugins
- `community.grafana` Ansible collection
- Grafana annotations
- Grafana HTTP API
- Grafana service account tokens

## Sources Consulted
- Ansible `community.grafana.grafana_annotations` callback documentation: https://docs.ansible.com/ansible/latest/collections/community/grafana/grafana_annotations_callback.html
- Ansible callback plugin documentation, including `callbacks_enabled`: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- `community.grafana` collection index and supported version information: https://docs.ansible.com/projects/ansible/latest/collections/community/grafana/index.html
- `community.grafana` callback source code: https://github.com/ansible-collections/community.grafana/blob/main/plugins/callback/grafana_annotations.py
- Grafana Annotations HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana annotation query documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana service account documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/

## Issues Found
- The post enabled `community.grafana.grafana` with `callback_whitelist` / `ANSIBLE_CALLBACK_WHITELIST`. The documented callback FQCN is `community.grafana.grafana_annotations`, and current Ansible documentation uses `callbacks_enabled` / `ANSIBLE_CALLBACKS_ENABLED`, so all examples were updated.
- The post used `[callback_grafana]`; the callback's documented INI section is `[callback_grafana_annotations]`. Updated all configuration snippets.
- The post set `grafana_url` to the Grafana base URL. The callback posts directly to the configured URL, so it must be the annotations API endpoint such as `https://grafana.example.com/api/annotations`. Updated all callback examples.
- The post showed Jinja `lookup('env', ...)` expressions in `ansible.cfg`, which is not valid INI configuration. Replaced those with literal placeholders and kept environment-variable examples for secret injection.
- The post documented unsupported options: `grafana_tags`, singular `grafana_panel_id`, and `http_timeout`. Removed or replaced them with supported options, including `grafana_panel_ids`, `http_agent`, `grafana_user`, and `grafana_password`.
- The post described custom success/failure tags and environment routing through `GRAFANA_TAGS`, but the callback uses fixed tags and has no custom tag option. Updated the tag explanation and the environment example to use `GRAFANA_DASHBOARD_ID`.
- The post described dashboard targeting using the UID from `/d/<uid>`. The callback option is `grafana_dashboard_id` and expects the older numeric dashboard ID, so that guidance was corrected.
- The annotation content examples did not match the callback's actual text templates. Replaced them with representative output based on the callback implementation.
- The Grafana authentication guidance referred only to API keys and the old UI path. Updated it to current service account token guidance while noting legacy API keys where the callback option name still uses `grafana_api_key`.

## Review Notes
Grafana's legacy `/api/annotations` endpoint remains usable, but Grafana documentation notes that `/api` endpoints are being deprecated in favor of the newer `/apis` route starting in Grafana 13. The `community.grafana.grafana_annotations` callback currently still targets the legacy annotations API URL supplied in `grafana_url`.
