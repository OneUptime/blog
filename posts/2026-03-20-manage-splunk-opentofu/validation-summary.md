# Validation Summary: How to Manage Splunk Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Splunk Enterprise
- Splunk Terraform/OpenTofu provider (`splunk/splunk`)
- HCL
- Splunk HTTP Event Collector (HEC)

## Sources Consulted
- Splunk provider overview: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/index.md
- Splunk provider changelog: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/CHANGELOG.md
- Splunk provider README: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/README.md
- `splunk_indexes` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/indexes.md
- `splunk_saved_searches` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/saved_searches.md
- `splunk_global_http_event_collector` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/global_http_event_collector.md
- `splunk_inputs_http_event_collector` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/inputs_http_event_collector.md
- `splunk_authorization_roles` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/authorization_roles.md
- `splunk_admin_saml_groups` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/admin_saml_groups.md
- `splunk_inputs_monitor` resource docs: https://raw.githubusercontent.com/splunk/terraform-provider-splunk-enterprise/master/docs/resources/inputs_monitor.md
- Splunk `indexes.conf` reference: https://docs.splunk.com/Documentation/Splunk/9.4.2/Admin/Indexesconf
- Splunk HEC configuration reference: https://docs.splunk.com/Documentation/Splunk/9.4.2/Data/UseHECusingconffiles

## Issues Found
- The provider version constraint used `~> 1.4`, which is outdated relative to the current published provider line. Updated it to `~> 1.5`.
- The introduction described the provider generically as managing “Splunk” configuration. The official provider is for Splunk Enterprise, while Splunk Cloud Platform uses a different provider. Updated the wording to say Splunk Enterprise.
- The saved search example used `action_email = true`, but the provider documents `action_email` as a read-only field whose value is ignored on create/update. Removed it and relied on `actions = "email,webhook"` instead.
- The saved search example used `action_webhook_enable_allowlist`, which is not a documented field in the provider resource. Replaced it with the documented `action_webhook_param_url` setting required for a webhook action.
- The `alert_severity` comment labeled value `3` as “High”, but the provider documents `3` as `WARN`. Corrected the comment.
- The section heading said “Data Input from S3”, but the example used `splunk_inputs_monitor`, which manages file or directory monitoring on the Splunk host. Renamed the heading to match the resource.

## Review Notes
- The `home_path` and `cold_path` examples use `volume:` references. That is valid in Splunk `indexes.conf`, even though the provider resource docs describe these fields in absolute-path terms.
- The HEC example is technically valid for Splunk Enterprise. Its `max_sockets = 0` and `max_threads = 0` settings rely on Splunk’s documented auto-sizing behavior.
