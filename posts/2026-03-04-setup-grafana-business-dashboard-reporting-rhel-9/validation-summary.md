# Validation Summary: How to Set Up Grafana for Business Dashboard Reporting on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Grafana Enterprise and Grafana OSS
- Grafana reporting
- Grafana Image Renderer service
- PostgreSQL
- MySQL
- SQL dashboard queries
- Grafana dashboard variables
- Grafana Alerting
- firewalld
- systemd
- cron

## Sources Consulted
- Grafana documentation: Install Grafana on RHEL or Fedora, https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Grafana documentation: Configure Grafana, https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Configure Grafana Enterprise, https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/enterprise-configuration/
- Grafana documentation: Create and manage reports, https://grafana.com/docs/grafana/latest/visualizations/dashboards/create-reports/
- Grafana documentation: Set up image rendering, https://grafana.com/docs/grafana/latest/setup-grafana/image-rendering/
- Grafana documentation: Grafana HTTP API authentication, https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana documentation: Service accounts, https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana documentation: Configure the MySQL data source, https://grafana.com/docs/grafana/latest/datasources/mysql/configure/
- Grafana documentation: Variable syntax, https://grafana.com/docs/grafana/latest/dashboards/variables/variable-syntax/
- Grafana documentation: Create and link alert rules to panels, https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-alerts-panels/

## Issues Found
- The repository setup omitted the explicit Grafana GPG key import shown in the official RHEL/Fedora installation steps. Added `wget` and `rpm --import` before creating the YUM repository file.
- The post implied that installing the Enterprise package by itself includes usable reporting features. Clarified that scheduled reporting requires a Grafana Enterprise license or Grafana Cloud.
- The prerequisites understated resources for rendering. Clarified that 2 GB RAM is for Grafana itself and report rendering needs separate renderer capacity.
- The authentication snippet used `[auth] disable_login_form = false` while describing anonymous access. Replaced it with `[auth.anonymous] enabled = false`, which is the setting that controls anonymous access.
- The reporting configuration lacked renderer settings required for dashboard images and PDF reports. Added a `[rendering]` block with `server_url`, `callback_url`, and `renderer_token`.
- The data source navigation used older Grafana UI labels. Updated PostgreSQL and MySQL instructions to the current Connections workflow.
- The dashboard variable example used `WHERE region = '$region'`, which is fragile and does not handle escaped or multi-value SQL variables well. Updated it to `WHERE region IN (${region:sqlstring})`.
- The scheduled reporting UI steps referenced a deprecated "Report" tab. Updated them to use Share > Schedule report and the current report drawer flow.
- The OSS reporting workaround installed the deprecated `grafana-image-renderer` plugin. Replaced it with the supported Grafana Image Renderer service approach and a matching auth token.
- The automation example used an API key placeholder. Updated it to use a service account token, matching current Grafana API authentication guidance.
- The render URL omitted the dashboard slug and the script description said it generated a PDF while producing a PNG. Added a slug variable and corrected the script comments.
- The script wrote to `/opt/grafana/send_report.sh` without ensuring the directory existed and then ran `chmod` without sudo. Added `sudo mkdir -p /opt/grafana` and `sudo chmod`.
- The alerting UI steps used the older panel "Alert tab" flow as the primary creation path. Updated them to the current panel menu More > New alert rule flow and current contact point / notification policy terminology.

## Review Notes
The post is now technically valid for current Grafana documentation as of 2026-05-14. The example remains a high-level tutorial rather than a hardened production deployment; future improvements could include explicit TLS setup for Grafana itself, secrets management for database and SMTP passwords, and a persistent systemd unit or container service for the renderer.
