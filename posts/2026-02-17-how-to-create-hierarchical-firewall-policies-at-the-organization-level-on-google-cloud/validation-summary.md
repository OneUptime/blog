# Validation Summary: How to Create Hierarchical Firewall Policies at the Organization Level

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Cloud Next Generation Firewall
- Hierarchical firewall policies
- VPC firewall rules
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Infrastructure as Code

## Sources Consulted
- Google Cloud: Hierarchical firewall policies overview: https://docs.cloud.google.com/firewall/docs/firewall-policies
- Google Cloud: Create hierarchical firewall policies and rules: https://docs.cloud.google.com/firewall/docs/using-firewall-policies
- Google Cloud: Evaluation order for firewall policies and rules: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-eval-order
- Google Cloud: Firewall policy rule components: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- Google Cloud SDK: `gcloud compute firewall-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/create
- Google Cloud SDK: `gcloud compute firewall-policies rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/rules/create
- Google Cloud SDK: `gcloud compute firewall-policies associations create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/associations/create
- Google Cloud SDK: `gcloud compute firewall-policies associations list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/associations/list
- Google Cloud: Deployment Manager deprecation: https://cloud.google.com/deployment-manager/docs/deprecations

## Issues Found
- The evaluation flow incorrectly showed `ALLOW` in hierarchical policies continuing to lower-level policies. Changed the diagram and text to state that matching `allow` and `deny` rules stop evaluation, while `goto_next` continues evaluation.
- The evaluation order omitted regional system firewall policies and network firewall policies. Updated the simplified default `AFTER_CLASSIC_FIREWALL` order to include those policy types and clarified implied actions.
- The prerequisites listed older or incomplete role guidance for creating and associating policies. Updated the role comments to include `roles/compute.orgFirewallPolicyAdmin` or `roles/compute.securityAdmin` for create/update work, and `roles/compute.orgSecurityResourceAdmin` for association.
- The organization policy used priority `65534` for both ingress and egress rules. Firewall policy rule priorities must be unique within a policy, so the egress rule was changed to priority `65533`.
- The production SSH example used `--target-service-accounts=bastion-sa@...`, which targets destination VMs using that service account, not source bastion hosts. Changed it to a production VM service account and adjusted the description.
- Folder association examples using short policy names omitted the organization ID required by the documented `gcloud compute firewall-policies associations create` syntax. Added `--organization=123456789` to those commands.
- The dev tools example described a `goto_next` rule as allowing traffic. Changed the comment and description to say it delegates matching traffic to project-level rules.
- The association listing command included `--firewall-policy`, but the current `associations list` command lists associations by organization or folder target. Removed the unsupported flag.
- The best-practices section recommended Deployment Manager, whose support was discontinued on March 31, 2026. Replaced it with Infrastructure Manager.

## Review Notes
The installed environment did not include `gcloud`, so CLI syntax was verified against official Google Cloud SDK reference pages instead of local `--help` output.
