# Validation Summary: How to Set Up Advanced Network DDoS Protection for External Passthrough Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Armor
- Cloud Armor Enterprise
- Advanced Network DDoS Protection
- External passthrough Network Load Balancers
- Network edge security policies
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring

## Sources Consulted
- Google Cloud Armor: Configure advanced network DDoS protection: https://docs.cloud.google.com/armor/docs/advanced-network-ddos
- Google Cloud Armor: Configure network edge security policies: https://docs.cloud.google.com/armor/docs/network-edge-policies
- Google Cloud Armor Enterprise usage and enrollment: https://docs.cloud.google.com/armor/docs/armor-enterprise-using
- Google Cloud Monitoring metrics list for `networksecurity.googleapis.com`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud CLI reference for `gcloud compute security-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud CLI reference for `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The Cloud Armor Enterprise enrollment command was incorrect. Replaced the security policy creation command with the documented `gcloud compute project-info update --cloud-armor-tier=CA_ENTERPRISE_PAYGO` and `CA_ENTERPRISE_ANNUAL` commands, and updated verification to read `cloudArmorTier`.
- The Advanced Network DDoS attachment flow was incorrect. Replaced forwarding rule attachment with the documented `gcloud compute network-edge-security-services create ... --security-policy ...` flow.
- The custom filtering rule flow mixed DDoS enablement and network edge filtering in one policy. Updated the guide to create a separate `CLOUD_ARMOR_NETWORK` policy for custom rules and attach it to a regional backend service.
- The monitoring log filter and metric names were inaccurate. Updated them to use the documented `network_security_policy` log resource, `jsonPayload.mitigationType`, `networksecurity.googleapis.com/l3/external/packet_count`, and `networksecurity.googleapis.com/dos/ingress_packets_count`.
- The Cloud Monitoring alert command used unsupported threshold flags. Replaced them with the documented `--if` and `--duration` flags for `gcloud alpha monitoring policies create`.
- The emergency restriction example did not actually restrict traffic when the default action remained `allow`. Added a default deny update for the emergency mode example.
- The cost and key-difference sections referred to forwarding-rule attachment and per-forwarding-rule policy charges. Updated them to match the current regional network edge security service and Cloud Armor Enterprise model.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud CLI and product documentation rather than local `--help` output.
