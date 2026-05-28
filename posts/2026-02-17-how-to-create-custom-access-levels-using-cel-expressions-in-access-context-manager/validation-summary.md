# Validation Summary: How to Create Custom Access Levels Using CEL Expressions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Access Context Manager
- Custom access levels
- Common Expression Language (CEL)
- Google Cloud CLI
- VPC Service Controls service perimeters
- Cloud Audit Logs

## Sources Consulted
- Google Cloud Access Context Manager custom access level specification: https://docs.cloud.google.com/access-context-manager/docs/custom-access-level-spec
- Google Cloud guide to creating custom access levels: https://docs.cloud.google.com/access-context-manager/docs/create-custom-access-level
- Google Cloud CLI reference for `gcloud access-context-manager levels create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud CLI reference for `gcloud access-context-manager policies list`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/list
- Google Cloud CLI reference for `gcloud access-context-manager perimeters update`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud Access Context Manager REST resource reference for access levels: https://docs.cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- VPC Service Controls audit logging documentation: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud CLI projections reference for `basename()`: https://cloud.google.com/sdk/gcloud/reference/topic/projections

## Issues Found
- Access level resource names used hyphens, such as `business-hours` and `combined-trust`. Access level IDs must begin with a letter and contain only alphanumeric characters or underscores, so the examples were changed to names such as `business_hours` and `combined_trust`.
- `inIpRange` examples passed a single CIDR string. The documented Access Context Manager CEL function signature expects a list of subnet strings, so the examples now use list values such as `["203.0.113.0/24"]`.
- The access policy lookup used `--format="value(name)"`, which can return the full resource name. The examples use the numeric policy ID later, so this was changed to `--format="value(name.basename())"`.
- The simple IP example used direct string equality on `origin.ip`. Google recommends `inIpRange` for IP matching, so the example now uses `inIpRange(origin.ip, ["203.0.113.1/32"])`.
- The post described custom CEL identity matching as email domain and group matching. The documented custom access level identity fields are user principal IDs and authentication claims, so the wording was corrected.
- The variable list omitted `request.auth`, which is a documented custom access level object. It was added.
- The example for referencing another access level used `request.auth.access_levels`, which is IAM-condition style syntax rather than Access Context Manager custom access level syntax. It was changed to `levels.office_network`.
- The perimeter attachment example referenced the old hyphenated access level name. It now references `business_hours`.
- The testing guidance referred generically to dry-run mode for the expression. Dry-run mode applies to service perimeters, so the wording now says to attach the access level to a dry-run service perimeter.

## Review Notes
- Device attributes in custom access level expressions require a paid BeyondCorp Enterprise-related subscription per Google Cloud documentation.
- The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud CLI reference instead of local `--help` output.
