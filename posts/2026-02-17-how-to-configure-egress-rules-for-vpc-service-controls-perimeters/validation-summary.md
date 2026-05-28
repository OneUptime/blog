# Validation Summary: How to Configure Egress Rules for VPC Service Controls Perimeters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Access Context Manager service perimeters
- Egress policies and ingress policies
- Google Cloud CLI (`gcloud`)
- Cloud Audit Logs / Cloud Logging
- BigQuery, Cloud Storage, Cloud Monitoring, Cloud Logging, Compute Engine

## Sources Consulted
- Google Cloud VPC Service Controls: Ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud VPC Service Controls: Configuring ingress and egress policies: https://docs.cloud.google.com/vpc-service-controls/docs/configuring-ingress-egress-policies
- Google Cloud VPC Service Controls: Supported service method restrictions: https://docs.cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- Google Cloud VPC Service Controls: Audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud SDK reference: `gcloud access-context-manager perimeters update`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud SDK reference: `gcloud access-context-manager perimeters dry-run update`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/update
- Access Context Manager REST reference: ServicePerimeter, EgressPolicy, EgressFrom, EgressTo, ApiOperation, MethodSelector: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.servicePerimeters and https://cloud.google.com/access-context-manager/docs/reference/rest/v1/MethodSelector

## Issues Found
- The introduction described egress rules as controlling everything that "goes out" and mentioned arbitrary third-party services. Updated the wording to clarify that VPC Service Controls egress policies control requests from protected sources to specified resources outside the perimeter through supported Google Cloud APIs, not general outbound network access to arbitrary services.
- The blocked-audit-log query used `RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER`, but the documented violation reason is `RESOURCE_NOT_IN_SAME_SERVICE_PERIMETER`. Corrected the filter.
- The audit section implied successful data-access calls are always visible. Added a note that relevant Data Access audit logs must be enabled for successful data-access operations.

## Review Notes
The YAML structure, `identityType` values, `resources` format, `methodSelectors`, and `gcloud --set-egress-policies` commands match the current Google Cloud documentation. The examples still use broad `method: "*"` selectors in some scenarios for demonstration; the post already warns readers to narrow these in production.
