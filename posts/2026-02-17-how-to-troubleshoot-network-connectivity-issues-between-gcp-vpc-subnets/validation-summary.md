# Validation Summary: How to Troubleshoot Network Connectivity Issues Between GCP VPC Subnets

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPC
- Compute Engine firewall rules
- VPC routes
- VPC Network Peering
- Network Intelligence Center Connectivity Tests
- VPC Flow Logs
- Google Cloud CLI

## Sources Consulted
- Google Cloud VPC firewall rules: https://cloud.google.com/firewall/docs/firewalls
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud VPC routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud VPC Network Peering overview: https://cloud.google.com/vpc/docs/about-peering-connections
- Google Cloud VPC Network Peering setup and troubleshooting: https://cloud.google.com/vpc/docs/using-vpc-peering
- gcloud compute networks subnets update reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud VPC Flow Logs access guide: https://cloud.google.com/vpc/docs/access-flow-logs
- Google Cloud VPC Flow Logs record format: https://cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud Connectivity Tests guide: https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- gcloud network-management connectivity-tests create reference: https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Google Cloud Private Google Access overview: https://cloud.google.com/vpc/docs/private-google-access

## Issues Found
- The routes section said custom routes or route priorities can override automatic subnet routing. Google Cloud evaluates subnet routes before custom routes and prevents static or dynamic routes from conflicting with local subnet routes in normal subnet routing. I changed the text to note that custom routes cannot override same-or-more-specific local subnet routes, while policy-based routes, peering route issues, and network appliances can still affect traffic.
- The VPC peering section implied that `exchangeSubnetRoutes` is an operator-controlled setting that should be enabled for route exchange. Google Cloud automatically exchanges private IPv4 subnet routes when peering is ACTIVE. I changed the guidance to distinguish automatic subnet route exchange from optional custom route import and export.
- The flow logs command used `--logging-flow-log-interval=INTERVAL_5_SEC`, which is not the current `gcloud compute networks subnets update` flag. I changed it to `--logging-aggregation-interval=interval-5-sec`.
- The flow logs query displayed `jsonPayload.disposition` and the text said VPC Flow Logs show ALLOWED or DENIED. The documented VPC Flow Logs record format includes connection, packet, and byte fields, not a `disposition` field. I changed the query to show `packets_sent` and `bytes_sent`, and updated the explanation to use Connectivity Tests and firewall rule logging for deny confirmation.
- The Private Google Access gotcha was too broad. I changed it to the narrower documented case: VMs without external IP addresses need Private Google Access on the subnet to reach Google APIs and services through their internal IP address.

## Review Notes
The remaining CLI examples match the documented command shape. The post could later mention firewall rule logging explicitly when diagnosing allow versus deny decisions, but the existing Connectivity Tests guidance already covers the main troubleshooting path.
