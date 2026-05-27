# Validation Summary: How to Troubleshoot High Latency Between Compute Engine Instances Across Regions

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud VPC networking
- Google Cloud Network Service Tiers
- Google Cloud Monitoring
- Cloud VPN
- VPC Network Peering
- Linux networking tools: ping, traceroute, MTR, curl, hping3
- TCP, ICMP, HTTP, HTTPS, gRPC, and MTU tuning

## Sources Consulted
- Google Cloud Network Service Tiers overview: https://docs.cloud.google.com/network-tiers/docs/overview
- Google Cloud VPC MTU documentation: https://docs.cloud.google.com/vpc/docs/mtu
- Google Cloud Compute Engine network bandwidth documentation: https://docs.cloud.google.com/compute/docs/network-bandwidth
- Google Cloud general-purpose machine family documentation: https://docs.cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud compact placement policies documentation: https://docs.cloud.google.com/compute/docs/instances/use-compact-placement-policies
- Google Cloud SDK reference for `gcloud monitoring uptime create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud SDK reference for `gcloud compute networks update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Google Cloud SDK reference for `gcloud compute vpn-tunnels list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/list
- Google Cloud Monitoring API time series documentation: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics
- Google Cloud VPN overview: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview

## Issues Found
- The HTTPS curl example used an IP placeholder, which commonly fails TLS hostname validation. Changed it to use a hostname placeholder.
- The MTR guidance treated intermediate-hop packet loss as direct evidence of congestion. Clarified that only loss continuing to the destination is usually meaningful because intermediate hops can rate-limit ICMP responses.
- The network-tier section implied all cross-region VM traffic is affected by Premium or Standard tier. Clarified that internal IP traffic in the same or peered VPC is routed within the VPC network, while network tier matters for external IP traffic.
- The Standard Tier explanation overstated the behavior as simply "uses the public internet for cross-region traffic." Updated it to match Google documentation: Standard Tier normally exits Google's network from the sender's region for external paths.
- The Cloud VPN latency claim gave a fixed 2-10ms overhead without an official source. Replaced it with the documented IPsec encapsulation/encryption and gateway-routing overhead.
- The `gcloud monitoring time-series list` examples are not part of the current documented `gcloud monitoring` command surface. Replaced them with Monitoring API `timeSeries.list` calls authenticated with `gcloud auth print-access-token`.
- The monitoring date command used BSD `date -v-1H`, which does not work on typical Linux Compute Engine instances. Replaced it with GNU `date -d '1 hour ago'`.
- The compact placement policy command used `--collocation=COLLOCATED`, but the current `gcloud` flag value is `collocated`. Updated the command.
- The uptime-check command used an unsupported `--display-name` flag, uppercase `TCP`, and duration-style `--period=60s`. Updated it to use the required positional display name, `--protocol=tcp`, `--timeout=10`, and `--period=1`.

## Review Notes
The regional RTT table is reasonable as an illustrative baseline, but live values vary over time and should be compared with Google Cloud Performance Dashboard or direct measurements from the user's instances.
