# Validation Summary: How to Diagnose Packet Drops in Google Cloud VPC Using Flow Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud VPC Flow Logs
- Google Cloud Firewall Rules Logging
- Google Cloud Packet Mirroring
- Google Cloud CLI
- Cloud Logging and BigQuery log sinks
- Kubernetes NetworkPolicy
- tcpdump and Wireshark

## Sources Consulted
- Google Cloud VPC Flow Logs overview and record format: https://cloud.google.com/vpc/docs/flow-logs and https://cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud VPC Flow Logs configuration guide: https://cloud.google.com/vpc/docs/using-flow-logs
- Google Cloud Firewall Rules Logging documentation: https://cloud.google.com/firewall/docs/firewall-rules-logging and https://cloud.google.com/firewall/docs/using-firewall-rules-logging
- Google Cloud Packet Mirroring overview and usage guide: https://cloud.google.com/vpc/docs/packet-mirroring and https://cloud.google.com/vpc/docs/using-packet-mirroring
- Google Cloud internal passthrough Network Load Balancer setup for Packet Mirroring: https://cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud CLI reference for subnet flow logs and packet mirroring commands: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update and https://cloud.google.com/sdk/gcloud/reference/compute/packet-mirrorings/create
- Google Cloud VPC MTU documentation: https://cloud.google.com/vpc/docs/mtu

## Issues Found
- VPC Flow Logs were described as showing whether traffic was allowed or denied. That is incorrect for Google Cloud VPC Flow Logs; firewall allow/deny decisions are exposed by Firewall Rules Logging. Updated the explanation and changed denied-traffic examples to query `compute.googleapis.com/firewall`.
- The Cloud Logging and BigQuery examples queried `jsonPayload.disposition` in VPC Flow Logs. That field belongs to firewall logs, not VPC Flow Logs. Reworked the VPC Flow Logs examples to inspect traffic presence and packet volume, and added a separate firewall-log query for denied connections.
- The Packet Mirroring collector load balancer example referenced `packet-collector-group` without creating it and omitted `--instance-group-zone` when adding it as a backend. Added unmanaged instance group creation, instance membership, and the required zone flag.
- The Packet Mirroring forwarding rule omitted `--ports=ALL` and `--ip-protocol=TCP`, which are part of the documented internal passthrough Network Load Balancer setup for Packet Mirroring. Added both flags.
- The MTU test examples used payload sizes that did not match Google Cloud's documented MTU sizes. Updated the examples to use ICMP payload sizes 28 bytes below the target MTU: `1432` for the default 1460 byte MTU and `8868` for an 8896 byte jumbo-frame MTU.
- The heading "Security Groups and Network Policies" used AWS terminology in a Google Cloud/GKE context. Changed it to "Kubernetes Network Policies."
- The SYN timeout explanation was too absolute. Adjusted it to say a firewall, route, or host-level policy can cause this pattern.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was checked against official Google Cloud CLI reference pages rather than local `--help` output.
