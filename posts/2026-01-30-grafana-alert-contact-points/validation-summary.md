# Validation Summary: How to Build Grafana Alert Contact Points

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Alerting
- Grafana contact points and notification policies
- Grafana alerting file provisioning
- Grafana notification templates
- Email and SMTP
- Slack
- PagerDuty
- Webhooks
- Microsoft Teams
- Opsgenie
- Node.js and Express
- Kubernetes logging with kubectl
- Prometheus-style alerting metrics

## Sources Consulted
- Grafana documentation: Configure contact points - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana documentation: File provisioning for alerting resources - https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana documentation: Configure Slack for Alerting - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-slack/
- Grafana documentation: Configure webhook notifications - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/
- Grafana documentation: Configure email for alert notifications - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-email/
- Grafana documentation: Configure Microsoft Teams for Alerting - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-teams/
- Grafana documentation: Configure PagerDuty for Alerting - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/pager-duty/
- Grafana documentation: Configure Opsgenie for Alerting - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-opsgenie/
- Grafana documentation: Notification template language and reference - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/language/ and https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/reference/
- Grafana documentation: Configure Grafana SMTP settings - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Upgrade to Grafana v13.0 - https://grafana.com/docs/grafana/latest/upgrade-guide/upgrade-v13.0/
- Grafana source: v1beta1 receiver integration test request body - https://github.com/grafana/grafana/blob/main/apps/alerting/notifications/pkg/apis/alertingnotifications/v1beta1/receiver_createreceiverintegrationtest_request_body_types_gen.go

## Issues Found
- The UI navigation for contact points used an older path. Updated it to the current **Alerts & IRM** > **Alerting** > **Notification configuration** > **Contact points** path and the current **+ New contact point** button text.
- Slack Bot API examples used channel names as `recipient`. Current Grafana Slack guidance asks for the channel ID when using a bot token, so the examples now use placeholder channel IDs.
- The SMTP config used `starttls_policy`; current Grafana config documents this key as `startTLS_policy`.
- The PagerDuty provisioning example included unsupported settings (`source`, `client`, `clientURL`, and `details`). Removed them and kept the officially documented PagerDuty settings.
- The PagerDuty severity template used a non-documented `default` template function and did not actually map `high`/`medium`/`low` labels to PagerDuty severity values. Replaced it with documented Go template conditionals.
- The webhook example mixed Basic Auth username/password with an Authorization-header scheme and used a numeric `maxAlerts` value. Removed `authorization_scheme` from the Basic Auth example and updated `maxAlerts` to `'10'`.
- The Microsoft Teams setting used `sectionTitle`; Grafana provisioning documents the key as `sectiontitle`. Updated the example.
- The Opsgenie example used the base API host and included unsupported `responders` settings. Updated `apiUrl` to `https://api.opsgenie.com/v2/alerts` and removed `responders`.
- The contact point API test example used the removed Grafana 13 legacy endpoint. Replaced it with the current Kubernetes-style receiver test endpoint and request-body shape.
- The API example used an API-key variable name. Updated it to a service account token variable, matching current Grafana API authentication practice.
- The troubleshooting template example used an undocumented `json` function. Replaced it with Grafana's documented `data.ToJSON` template function.

## Review Notes
The post is now aligned with Grafana v13-era documentation. The Grafana App Platform notification APIs are marked beta/versioned in current docs, so future Grafana releases may still require minor endpoint or schema updates.
