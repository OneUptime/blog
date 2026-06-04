# Validation Summary: How to Run Grafana OnCall in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Grafana OnCall OSS
- Grafana and the Grafana OnCall plugin
- Redis
- Celery
- SQLite, MySQL, and PostgreSQL
- Prometheus Alertmanager
- Grafana Alerting
- Slack integration

## Sources Consulted
- Grafana OnCall GitHub repository README: https://github.com/grafana/oncall
- Official Grafana OnCall hobby Docker Compose file: https://raw.githubusercontent.com/grafana/oncall/dev/docker-compose.yml
- Official Grafana OnCall MySQL/RabbitMQ Docker Compose file: https://raw.githubusercontent.com/grafana/oncall/dev/docker-compose-mysql-rabbitmq.yml
- Grafana OnCall OSS setup documentation: https://grafana.com/docs/oncall/latest/set-up/
- Grafana OnCall OSS maintenance/archive notice: https://grafana.com/docs/oncall/latest/set-up/open-source/
- Grafana Labs OnCall OSS maintenance mode announcement: https://grafana.com/blog/grafana-oncall-maintenance-mode/
- Grafana OnCall Alertmanager integration documentation: https://grafana.com/docs/oncall/latest/configure/integrations/references/alertmanager/
- Grafana OnCall Grafana Alerting integration documentation: https://grafana.com/docs/oncall/latest/configure/integrations/references/grafana-alerting/
- Grafana OnCall inbound webhook documentation: https://grafana.com/docs/oncall/latest/configure/integrations/references/webhook/
- Grafana OnCall Slack integration documentation: https://grafana.com/docs/oncall/latest/manage/notify/slack/
- Grafana Docker image documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/

## Issues Found
- The post described Grafana OnCall OSS as a current open-source deployment option without noting its lifecycle status. Updated the introduction and production notes to state that OnCall OSS entered maintenance mode on March 11, 2025 and was archived on March 24, 2026, and that new production deployments should evaluate a maintained fork or Grafana Cloud IRM.
- The architecture section implied MySQL or PostgreSQL as required for the described Docker setup. Updated it to clarify that the hobby Docker Compose setup uses SQLite, while reliable production deployments should use the official Helm-based production path with external backing services.
- The Docker Compose example did not match the current official hobby compose pattern. Updated it to use a separate migration service, `DJANGO_SETTINGS_MODULE=settings.hobby`, the bundled `celery_with_exporter.sh` worker entrypoint, current Celery queue settings, Redis health checks, and Grafana feature toggles needed for newer Grafana versions.
- The Grafana Alerting instructions incorrectly implied that selecting OnCall as a contact point was sufficient. Updated the guidance to use OnCall's Grafana Alerting integration Quick connect flow and connect the created contact point to a Grafana notification policy.
- The Alertmanager example omitted the documented `max_alerts` setting. Added `max_alerts: 100`.
- The Slack integration section used incorrect environment variables for the OSS Slack app setup. Replaced the bot token guidance with the documented `FEATURE_SLACK_INTEGRATION_ENABLED`, OAuth client ID/secret, signing secret, and redirect host variables.
- The production notification guidance did not mention the end of Grafana Cloud Connection support for OSS. Added a note that phone, SMS, and push notifications need third-party alternatives after March 24, 2026.

## Review Notes
The code and configuration snippets were checked for YAML syntax. The Docker stack was not started locally because it requires pulling and running multiple external services and the task only required technical validation against official documentation.
