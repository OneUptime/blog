# Validation Summary: How to Deploy Cloud Next Generation Firewall with Intrusion Detection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Next Generation Firewall
- Cloud NGFW Enterprise intrusion detection and prevention
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring log-based alerts
- BigQuery log exports
- Python Google Cloud Monitoring client library

## Sources Consulted
- Google Cloud NGFW overview: https://docs.cloud.google.com/firewall/docs/about-firewalls
- Configure firewall endpoints and endpoint associations: https://docs.cloud.google.com/firewall/docs/configure-firewall-endpoints
- Configure intrusion detection and prevention service: https://docs.cloud.google.com/firewall/docs/configure-intrusion-prevention
- Create and manage threat prevention security profiles: https://docs.cloud.google.com/firewall/docs/configure-security-profiles
- Security profile overview: https://docs.cloud.google.com/firewall/docs/about-security-profiles
- Security profile group overview: https://cloud.google.com/firewall/docs/about-security-profile-groups
- Create global network firewall policies and rules: https://docs.cloud.google.com/firewall/docs/use-network-firewall-policies
- Cloud NGFW threat logs: https://docs.cloud.google.com/firewall/docs/threat_logs
- Cloud Logging BigQuery export documentation: https://docs.cloud.google.com/logging/docs/export/bigquery
- Google Cloud Firewall pricing: https://cloud.google.com/firewall/pricing
- Google Cloud SDK references for `network-security firewall-endpoints`, `security-profiles threat-prevention`, `security-profile-groups create`, and `compute network-firewall-policies` commands.

## Issues Found
- The post described firewall endpoints as regional resources. Google Cloud documents firewall endpoints and endpoint associations as zonal resources, so the wording and prerequisites were corrected.
- The endpoint association command passed `--tls-inspection-policy=""`. The flag is optional and expects a TLS inspection policy resource when used, so the empty value was removed for the non-TLS inspection flow.
- The threat prevention override example used a non-existent `security-profiles threat-prevention update` command with `--severity-overrides`. The commands were replaced with supported `add-override` commands using `--severities` and `--action`.
- The firewall policy section called a network firewall policy a hierarchical firewall policy. The wording was corrected to "global network firewall policy."
- The Cloud Logging queries used firewall rule log fields and `jsonPayload.threat_details`, but Cloud NGFW threat logs use the `networksecurity.googleapis.com/firewall_threat` log and fields such as `jsonPayload.name`, `jsonPayload.alert_severity`, `jsonPayload.action`, `jsonPayload.source_ip_address`, and `jsonPayload.destination_ip_address`. The queries, alert filter, log sink filter, and BigQuery query were updated accordingly.
- The blocked-threat query looked for action `DENY`. Cloud NGFW threat logs document that a `DENY` override appears as `DROP` in the threat log action field, so the query was corrected.
- The threat ID override example used the unsupported `--threat-overrides` syntax. It was changed to `add-override` with `--threat-ids` and `--action=ALLOW`.
- The Cloud NGFW Standard tier description omitted Google Threat Intelligence for firewall policy rules. That feature was added to the tier description.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against current official Google Cloud SDK reference pages rather than local `gcloud --help` output. The BigQuery table name for routed logs can vary depending on sink configuration and table partitioning settings; the example was updated to the documented log-derived naming pattern for routed Cloud Logging entries.
