# Validation Summary: How to Manage Splunk Resources with OpenTofu - Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Splunk Enterprise
- Splunk Enterprise Terraform provider (`splunk/splunk`)
- Splunk HTTP Event Collector (HEC)
- Splunk saved searches and alerts
- Splunk role and SAML group management
- HCL

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings and `terraform` block compatibility: https://opentofu.org/docs/language/settings/
- Official Splunk Enterprise provider repository: https://github.com/splunk/terraform-provider-splunk-enterprise
- Splunk provider docs index: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/index.md
- Splunk provider indexes resource docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/indexes.md
- Splunk provider saved searches resource docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/saved_searches.md
- Splunk provider HEC token docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/inputs_http_event_collector.md
- Splunk provider global HEC docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/global_http_event_collector.md
- Splunk provider monitor input docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/inputs_monitor.md
- Splunk provider authorization roles docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/authorization_roles.md
- Splunk provider SAML groups docs: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/docs/resources/admin_saml_groups.md
- Splunk provider changelog: https://github.com/splunk/terraform-provider-splunk-enterprise/blob/master/CHANGELOG.md
- Splunk roles and capabilities docs: https://docs.splunk.com/Documentation/Splunk/9.4.2/Security/Rolesandcapabilities
- Official Splunk Cloud Platform provider repository: https://github.com/splunk/terraform-provider-scp
- Splunk Cloud Platform Terraform announcement: https://www.splunk.com/en_us/blog/platform/revolutionize-data-ingestion-introducing-terraform-support-for-splunk-cloud-platform.html

## Issues Found
- The post treated Splunk Enterprise and Splunk Cloud as interchangeable for this provider. I corrected the wording to target Splunk Enterprise, because Splunk documents a separate `splunk/scp` provider for Splunk Cloud Platform and this post includes resources that are specific to the Enterprise provider.
- The provider version was pinned to `~> 1.4`. I updated it to `~> 1.5` because the official provider changelog shows HEC-related fixes in `1.5.0`, which are relevant to the HEC example in this post.
- The prerequisites implied token-based authentication was universally available. I clarified that auth tokens are only applicable when the Splunk deployment supports token-based authentication, which matches the official provider documentation.
- The index example used `max_data_size = 0`. I changed this to `max_data_size = "auto"` because the provider schema expects a string and the documented supported values are `auto`, `auto_high_volume`, or a valid size value.
- The saved search example used `action_email_message`, which is not a valid argument in the official provider. I changed it to `action_email_message_alert`, which is the supported alert-message field.
- The HEC token example created only `splunk_inputs_http_event_collector`. I added `splunk_global_http_event_collector` and a dependency because the provider documents global HEC configuration separately and its official examples/tests enable the global HEC endpoint before creating tokens.

## Review Notes
- `tofu` and `terraform` CLIs were not installed in the workspace, so I validated the examples against the official provider documentation, provider schema/source, changelog, and Splunk documentation rather than by running `tofu validate`.
- The description mentions dashboards, but the post does not include a dashboard resource example. This is technically acceptable because the official Enterprise provider does support dashboard resources, but the post does not demonstrate them.
