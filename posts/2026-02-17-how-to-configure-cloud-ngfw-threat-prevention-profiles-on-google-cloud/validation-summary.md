# Validation Summary: How to Configure Cloud NGFW Threat Prevention Profiles on Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Cloud Next Generation Firewall
- Threat prevention security profiles
- Security profile groups
- Global network firewall policies
- Cloud Logging
- BigQuery log analysis
- Python automation with subprocess

## Sources Consulted
- Google Cloud: Security profile overview: https://docs.cloud.google.com/firewall/docs/about-security-profiles
- Google Cloud: Create and manage threat prevention security profiles: https://docs.cloud.google.com/firewall/docs/configure-security-profiles
- Google Cloud: Configure intrusion detection and prevention service: https://docs.cloud.google.com/firewall/docs/configure-intrusion-prevention
- Google Cloud: Threat signatures overview: https://docs.cloud.google.com/firewall/docs/about-threats
- Google Cloud: Threat logs: https://docs.cloud.google.com/firewall/docs/threat_logs
- Google Cloud SDK: gcloud network-security security-profiles threat-prevention: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/security-profiles/threat-prevention
- Google Cloud SDK: gcloud network-security security-profiles threat-prevention add-override: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/security-profiles/threat-prevention/add-override
- Google Cloud SDK: gcloud compute network-firewall-policies rules create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- Google Cloud: Create global network firewall policies and rules: https://docs.cloud.google.com/firewall/docs/use-network-firewall-policies

## Issues Found
- The post used a non-existent `gcloud network-security security-profiles threat-prevention update` command with `--severity-overrides` and `--threat-overrides`. Replaced these examples with the documented `add-override` command using `--severities`, `--threat-ids`, and `--action`.
- The actions list omitted the default "No override" behavior. Added it because new threat prevention profiles default to no override for severity levels.
- The detection-only profile claimed it detected all threats while configuring informational severity as `ALLOW`. Adjusted the explanation to say it alerts on critical, high, medium, and low severities.
- The firewall policy step implied policy rules alone route traffic through Cloud NGFW. Added the prerequisite that firewall endpoints must be created and associated for workload zones.
- The Cloud Logging and BigQuery examples queried firewall rule log fields such as `jsonPayload.threat_details`, which do not match the documented Cloud NGFW threat log schema. Updated the examples to query the `networksecurity.googleapis.com/firewall_threat` log and documented payload fields such as `threat_id`, `name`, `alert_severity`, `source_ip_address`, and `destination_ip_address`.
- The monitoring query counted `DENY`, `ALERT`, and `ALLOW` under `jsonPayload.threat_details.action`. Updated it to use the documented threat log `action` field and count `DROP` as blocked traffic.
- The Python automation used the removed `update` command and manually rebuilt `--threat-overrides`. Updated it to use `list-overrides`, then choose `add-override` or `update-override` with `--threat-ids`.

## Review Notes
The examples remain illustrative and use placeholder organization, project, VPC, subnet, and threat IDs. The local environment did not have `gcloud` installed, so CLI verification was performed against current official Google Cloud SDK reference pages instead of local `--help` output.
