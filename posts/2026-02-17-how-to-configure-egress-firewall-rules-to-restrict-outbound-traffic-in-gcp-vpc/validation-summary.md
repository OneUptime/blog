# Validation Summary: How to Configure Egress Firewall Rules to Restrict Outbound Traffic in GCP VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC firewall rules
- Google Cloud CLI (`gcloud`)
- Compute Engine metadata server
- Cloud Load Balancing health checks
- GKE networking
- Firewall Rules Logging

## Sources Consulted
- Google Cloud VPC firewall rules: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud CLI `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud Private Google Access and restricted VIP ranges: https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud Firewall Rules Logging: https://cloud.google.com/firewall/docs/firewall-rules-logging
- Google Cloud Use Firewall Rules Logging: https://cloud.google.com/firewall/docs/using-firewall-rules-logging
- Google Cloud Load Balancing health check firewall rules: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Kubernetes Engine firewall rules: https://cloud.google.com/kubernetes-engine/docs/concepts/firewall-rules

## Issues Found
- The post implied that a deny-all IPv4 egress rule prevents all traffic from leaving the VPC. Updated the wording to clarify that metadata-server traffic is always allowed and that IPv6 requires a separate `::/0` rule.
- The post said Google APIs access covered metadata server access and package updates. Updated the wording to focus on Google APIs and image pulls, and added the DNS requirement for using the restricted VIP.
- The post showed an egress rule for Google health check ranges. Google Cloud health checks require ingress allow rules to backends, so the command was corrected to `--direction=INGRESS` with `--source-ranges`.
- The post recommended an egress allow rule for the metadata server. Google Cloud always allows VM communication with `169.254.169.254`, so the command was replaced with a note explaining that no firewall rule is required.
- The DNS section incorrectly treated the metadata resolver as something that must be allowed by VPC firewall rules. Updated it to clarify that metadata-server DNS is always allowed and changed the example to external DNS resolvers.
- The GKE control-plane egress example allowed TCP 10250. GKE documentation states node egress to the control plane uses TCP 443; TCP 10250 is used for control-plane-to-node access in ingress rules. Removed TCP 10250 from the egress example.
- The complete example included redundant metadata, DNS-to-metadata, and NTP-to-metadata egress rules. Removed those unnecessary metadata-server rules and kept an optional external DNS example.
- The introduction overstated internet reachability. Updated it to clarify that internet egress also depends on routing and external IP or Cloud NAT.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command syntax was verified against official Google Cloud CLI documentation instead of local `--help` output. The post remains IPv4-focused; environments using IPv6 should add equivalent IPv6 deny and allow rules.
