# Validation Summary: How to Integrate Terraform with SIEM Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Splunk Terraform provider and HTTP Event Collector
- Elastic Stack Terraform provider and Elasticsearch index lifecycle management
- Microsoft Sentinel and AzureRM Terraform provider
- GitHub Actions
- Bash, curl, and jq

## Sources Consulted
- Splunk Terraform provider documentation: https://registry.terraform.io/providers/splunk/splunk/latest/docs
- Splunk HEC Terraform resource documentation: https://registry.terraform.io/providers/splunk/splunk/latest/docs/resources/inputs_http_event_collector
- Splunk HTTP Event Collector documentation: https://help.splunk.com/splunk-enterprise/get-data-in/get-started-with-getting-data-in/9.1/get-data-with-http-event-collector/format-events-for-http-event-collector
- Elastic Stack Terraform provider documentation: https://registry.terraform.io/providers/elastic/elasticstack/latest/docs/resources/elasticsearch_index_template
- Elastic Stack ILM Terraform resource documentation: https://registry.terraform.io/providers/elastic/elasticstack/latest/docs/resources/elasticsearch_index_lifecycle
- AzureRM Sentinel scheduled alert rule documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/sentinel_alert_rule_scheduled
- AzureRM Log Analytics workspace table documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace_table
- Azure CLI Log Analytics workspace table documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/learn-github-actions/contexts
- jq manual: https://jqlang.org/manual/

## Issues Found
- The Splunk HEC Terraform resource used `use_ack = true`, but the provider examples and Splunk HEC behavior use a numeric acknowledgement flag. Changed it to `use_ack = 0`, which also matches the simple curl sender that does not poll indexer acknowledgement status.
- The Splunk curl example used `curl -k`, which disables TLS certificate verification. Removed `-k` so the example does not encourage bypassing TLS verification by default.
- The Microsoft Sentinel example said `azurerm_log_analytics_workspace_table` creates a custom table. Current AzureRM documentation states this resource manages attributes for existing tables and does not create or destroy tables. Updated the comments to say the table must already exist, for example through Azure Monitor Logs or a Data Collection Rule.
- The Sentinel scheduled alert rule used an outdated/incorrect `incident_configuration` block with `create_incident`. Current AzureRM provider syntax uses `incident` and `create_incident_enabled`. Updated the block accordingly.
- The jq parser used `(.change.before | keys // [])` and `(.change.after | keys // [])`, which errors when `before` or `after` is null. Changed it to default null values to `{}` before calling `keys`.
- The Terraform plan parser only used the first action in `.change.actions`, which misses replacement operations represented as multiple actions such as `delete,create`. Changed it to join all actions and count create/delete replacements correctly.
- The GitHub Actions workflow referenced `${{ steps.apply.outcome }}` without assigning `id: apply` to the Terraform Apply step. Added the step id so the context reference resolves.

## Review Notes
- Terraform CLI was not installed in the local environment, so provider validation was performed against official provider documentation rather than `terraform validate`.
- The examples still assume supporting variables, credentials, ingestion scripts, and any custom Log Analytics table ingestion pipeline are defined elsewhere.
