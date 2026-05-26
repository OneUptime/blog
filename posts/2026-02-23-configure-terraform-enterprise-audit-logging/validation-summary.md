# Validation Summary: How to Configure Terraform Enterprise Audit Logging

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise audit logs
- Terraform Enterprise service logs
- Fluent Bit log forwarding
- Splunk HTTP Event Collector
- Amazon CloudWatch Logs
- Elasticsearch through downstream log collectors
- Bash, grep, awk, jq

## Sources Consulted
- HashiCorp Terraform Enterprise logging documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/monitor/logs
- HashiCorp Terraform Enterprise legacy Replicated log forwarding documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/monitoring/logging
- HashiCorp HCP Terraform Audit Trails API documentation: https://developer.hashicorp.com/terraform/enterprise/v202206-1/api-docs/audit-trails
- HashiCorp Terraform Enterprise Settings API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings

## Issues Found
- The post described `/api/v2/organization/audit-trail` as a Terraform Enterprise API. HashiCorp documents this as the HCP Terraform Audit Trails API and explicitly says it is not available for Terraform Enterprise. I replaced the API examples with service-log access and filtering examples for Terraform Enterprise audit logs.
- The post used an HCP Terraform audit trail JSON response shape, including `.data[].attributes.timestamp`, `.attributes.action`, and `.attributes.actor.email`. Terraform Enterprise audit logs are emitted in service logs with fields such as `event_type`, `resource`, `source_ip`, `request_id`, and `actor_id`. I updated examples and analysis scripts to use the documented TFE log format and documented field names rather than the HCP Terraform response schema.
- The post claimed Terraform Enterprise audit logs capture workspace, run, variable, team, VCS, policy, and token lifecycle events through the audit trail API. Current Terraform Enterprise audit log documentation focuses on authentication success, authentication failure, CSRF violations, admin console access, and system API endpoint access. I narrowed the event list accordingly.
- The post provided polling scripts for Splunk, CloudWatch Logs, and Elasticsearch using the unavailable audit trail API. I replaced them with documented Fluent Bit `[OUTPUT]` examples for Splunk, CloudWatch Logs, and a supported `forward` destination for downstream Elasticsearch routing.
- The post included an unsupported `audit-log-retention-days` attribute under `/api/v2/admin/general-settings`. The Terraform Enterprise Settings API does not document that attribute, and the logging docs state that no specific local audit log retention period is guaranteed. I replaced this with guidance to forward logs externally for long-term retention.

## Review Notes
Terraform Enterprise logging differs by deployment model. Current documentation recommends native platform log forwarding and notes that built-in Fluent Bit is only available for Docker-deployed Terraform Enterprise, not Kubernetes deployments.
