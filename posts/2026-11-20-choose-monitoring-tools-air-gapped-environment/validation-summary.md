# Validation Summary: Choosing Air-Gapped Monitoring Tools

## Scope

Reviewed on 20 November 2026. This is a tool-selection guide based on official documentation, not a tested deployment procedure or performance comparison.

## Documentation checks

- Confirmed Prometheus Apache 2.0 licensing, local storage limitations, and Alertmanager SMTP/webhook configuration.
- Confirmed Grafana core open-source licensing information, offline plugin ZIP installation, and reporting/update-check controls.
- Confirmed Zabbix's version-dependent GPLv2/AGPLv3 licensing and documented database/frontend requirements.
- Confirmed OneUptime's documented offline bundle workflow and database components. Read the repository license, including the enterprise-directory and third-party exceptions.
- Product-specific statements link to official sources. Recommendations, scoring weights, and acceptance exercises are editorial proposals, not measured product results.

## Artifact checks

- Metadata matches the repository README format; author is in Authors.json and all three tags already exist in Tags.md.
- Title: 60 characters. Description: 153 characters.
- Article word count including metadata: 1409 (links excluded from count).
- One H1 with sequential H2 sections; no executable examples or configuration snippets require syntax testing.
- Generated social-media.png with the existing npm script; confirmed 1280 x 720 dimensions and visually inspected the full image. Both title lines are legible and unclipped.

## Limitations and integration

No installation, network isolation, licensing activation/renewal, storage benchmark, backup/restore, upgrade, or notification-delivery test was performed. No claims of hands-on product results are made. Current documentation and the repository's master-branch license can change; readers are instructed to retain the exact release's records.

The repository-wide validator was not run because it automatically edits Blogs.json and Tags.md, which are reserved for parent integration. Focused read-only metadata and image checks passed. The parent integrated the catalog entry and marked Todo.md complete after focused repository validation. No commits or pushes were made.

## Sources checked

- https://www.zabbix.com/documentation/current/en/manual/installation/requirements
- https://oneuptime.com/enterprise/air-gapped/
- https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- https://prometheus.io/docs/introduction/faq/
- https://grafana.com/licensing/
- https://www.zabbix.com/license
- https://raw.githubusercontent.com/OneUptime/oneuptime/master/LICENSE
- https://prometheus.io/docs/prometheus/latest/storage/
- https://prometheus.io/docs/alerting/latest/configuration/
- https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
