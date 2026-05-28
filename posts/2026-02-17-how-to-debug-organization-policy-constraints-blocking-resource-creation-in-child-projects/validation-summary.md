# Validation Summary: How to Debug Organization Policy Constraints Blocking Resource Creation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Organization Policy
- Google Cloud resource hierarchy
- Google Cloud CLI (`gcloud`)
- Resource Manager tags
- Policy Intelligence Policy Simulator
- Cloud Logging audit logs

## Sources Consulted
- Organization Policy hierarchy evaluation: https://docs.cloud.google.com/organization-policy/hierarchy-evaluation
- Organization policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Create organization policies: https://docs.cloud.google.com/organization-policy/create-organization-policies
- gcloud resource-manager org-policies describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- gcloud resource-manager org-policies list reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- gcloud resource-manager org-policies allow reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/allow
- gcloud resource-manager tags keys create reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/tags/keys/create
- gcloud resource-manager tags values create reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/tags/values/create
- Policy Simulator for Organization Policy: https://docs.cloud.google.com/policy-intelligence/docs/test-organization-policies
- gcloud policy-intelligence simulate orgpolicy reference: https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/simulate/orgpolicy

## Issues Found
- The hierarchy explanation said child resources cannot override a parent constraint unless the parent explicitly allows overrides. Google Cloud hierarchy evaluation allows child policies to override or merge with inherited policy depending on constraint type and `inheritFromParent`, so the wording was corrected.
- The policy tracing section said the first explicitly set level is where the policy must be changed. For merged list policies, more than one ancestor can contribute to the effective result, so the wording was changed to refer to all levels that explicitly set the policy.
- The Resource Manager tag value creation command used `--parent=organizations/your-org-id/org-policy-exception`, which is not the accepted parent format for `gcloud resource-manager tags values create`. It was changed to `--parent=your-org-id/org-policy-exception`.
- The section claiming to list all effective constraints used `gcloud resource-manager org-policies list`, but that command lists policies associated with a resource and can show unset constraints; it does not show every inherited effective policy. The section was revised to describe what the command actually returns and to recommend `describe --effective` for specific constraints.
- The Policy Simulator command used a non-existent `gcloud resource-manager org-policies simulate` subcommand with unsupported flags. It was replaced with the current `gcloud policy-intelligence simulate orgpolicy --organization=... --policies=...` command shape.
- A common gotcha repeated the incorrect claim that project owners cannot override policies unless the parent allows it. It was changed to clarify that project owners need organization policy permissions to change organization policies.

## Review Notes
`gcloud` is not installed in the local workspace, so command verification was performed against official Google Cloud CLI documentation rather than local `--help` output. The examples use placeholder IDs and omit the full `policy.yaml` body for conditional policies and Policy Simulator input; that is acceptable for this troubleshooting guide but could be expanded in a future hands-on tutorial.
