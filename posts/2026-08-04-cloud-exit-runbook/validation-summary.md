# Validation Summary: Build a Cloud Exit Runbook That Can Be Executed

## Status
validated

## Post Type
Guide / Operational Runbook

## Technologies Covered
- Cloud migration and cloud exit planning
- AWS Transform discovery tool
- AWS Application Discovery Service
- Azure Migrate discovery and dependency analysis
- Google Cloud Migration Center discovery client
- Infrastructure as code and dependency graphs
- Change data capture (CDC) and data replication
- DNS, DNSSEC, TTL-based cutover, and TLS certificates
- PostgreSQL backup and restore
- Service quotas, capacity testing, observability, rollback, and decommissioning
- YAML runbook metadata

## Sources Consulted
- AWS Transform discovery tool: https://docs.aws.amazon.com/transform/latest/userguide/discovery-tool.html
- AWS Application Discovery Service: https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html
- AWS Database Migration Service CDC guidance: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html
- AWS Database Migration Service latency troubleshooting: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Troubleshooting_Latency.html
- AWS Service Quotas documentation: https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html
- AWS Billing and Cost Management dashboard documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/view-billing-dashboard.html
- Azure Migrate discovery methods: https://learn.microsoft.com/en-us/azure/migrate/discovery-methods-modes
- Azure Migrate dependency analysis: https://learn.microsoft.com/en-us/azure/migrate/concepts-dependency-visualization
- Azure subscription and service limits, quotas, and constraints: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure service availability by region: https://learn.microsoft.com/en-us/azure/reliability/availability-service-by-category
- Azure Cost Management automation and data latency: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/manage-automation
- Google Migration Center discovery client CLI overview: https://cloud.google.com/migration-center/docs/discovery-client-cli-overview
- Google Migration Center discovery data collection and security: https://cloud.google.com/migration-center/docs/discovery-client-data-and-security
- Google Cloud Quotas overview: https://docs.cloud.google.com/docs/quotas/overview
- RFC 1034, Domain Names—Concepts and Facilities: https://www.rfc-editor.org/rfc/rfc1034.html
- RFC 6781, DNSSEC Operational Practices, Version 2: https://www.rfc-editor.org/rfc/rfc6781.html
- RFC 8767, Serving Stale Data to Improve DNS Resiliency: https://www.rfc-editor.org/rfc/rfc8767.html
- PostgreSQL backup and restore documentation: https://www.postgresql.org/docs/current/backup.html
- Terraform resource dependency and destruction ordering: https://developer.hashicorp.com/terraform/tutorials/configuration-language/dependencies
- NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems: https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- The transfer-time example said to use effective throughput after overhead, then described the 44-hour result as being before overhead. It also stated without qualification that cutover could never converge when changes arrived too quickly, even though pausing or reducing writes allows a capable incremental path to drain its backlog. I clarified that 40 TB takes about 44 hours at an effective payload rate of 2 Gbit/s, that a nominal 2 Gbit/s link takes longer, and that lag cannot converge only while the sustained source change rate exceeds apply capacity. The arithmetic is 160,000 seconds, or approximately 44.44 hours, using decimal terabytes.
- The decommissioning checklist said to delete resources "in dependency order," which could be read as deleting foundations before their consumers. I changed it to reverse dependency order and explicitly stated that dependents must be removed before their dependencies.
- The checklist required bills to stop referencing deleted resources, but billing and cost data is historical and can have a reporting delay. I changed the step to reconcile residual charges after billing data refreshes while separately checking that DNS, certificates, and inventories no longer reference source resources.
- AWS Application Discovery Service is no longer open to new customers; AWS directs new customers to AWS Transform. I updated the documentation link label to state that Application Discovery Service is for existing customers only.

## Review Notes
- Both YAML examples are syntactically valid under YAML 1.2. The fields are an illustrative runbook schema, not configuration for a named migration product, so their operational meaning must be implemented by the team that consumes the runbook.
- The 40 TB transfer estimate assumes decimal TB and decimal Gbit/s. If the source reports tebibytes instead, the equivalent wire-time estimate is higher.
- DNS TTL reduction minimizes ordinary cache inconsistency, as described by RFC 1034. RFC 8767 permits resolvers to serve stale data in limited failure conditions, so teams should retain the post's multi-resolver verification and rollback monitoring.
- Azure Migrate's current dependency-analysis documentation says agent-based analysis is limited to the classic experience, cannot onboard new servers, and the classic view is scheduled for deprecation by the end of 2026. The post does not depend on agent-based analysis, so no content change was required.
- PostgreSQL's `current` documentation URL is intentionally rolling and resolves to PostgreSQL 18 at the validation date. The post does not claim a specific PostgreSQL version or a single backup mechanism.
