# Validation Summary: How to Set Up Packet Mirroring for Deep Network Inspection in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC Packet Mirroring
- Google Cloud internal passthrough Network Load Balancer
- Google Cloud CLI (`gcloud`)
- Compute Engine VM instances and unmanaged instance groups
- Suricata IDS
- Linux `tcpdump`

## Sources Consulted
- Google Cloud VPC Packet Mirroring overview: https://cloud.google.com/vpc/docs/packet-mirroring
- Google Cloud Use Packet Mirroring guide: https://cloud.google.com/vpc/docs/using-packet-mirroring
- Google Cloud internal passthrough Network Load Balancer setup guide, including Packet Mirroring collector setup: https://cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud SDK reference for `gcloud compute packet-mirrorings create`: https://cloud.google.com/sdk/gcloud/reference/compute/packet-mirrorings/create
- Google Cloud SDK reference for `gcloud compute packet-mirrorings list`: https://cloud.google.com/sdk/gcloud/reference/compute/packet-mirrorings/list
- Google Cloud SDK reference for `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK reference for `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Suricata AF_PACKET documentation: https://docs.suricata.io/en/suricata-8.0.3/capture-hardware/af-packet.html

## Issues Found
- The post stated that Packet Mirroring has no source VM performance impact because mirroring happens at the network infrastructure level. Google Cloud documents that mirroring happens on VM instances, consumes additional bandwidth, and can reduce packet processing rate. Updated the explanation accordingly.
- The post described the collector as a generic internal load balancer. Google Cloud requires an internal passthrough Network Load Balancer. Updated the terminology.
- The second collector VM was created for redundancy but was not added to a backend instance group. Added a second zonal unmanaged instance group and backend entry so both collector VMs participate in the collector load balancer.
- The backend service command incorrectly used `--is-mirroring-collector` and UDP. The mirroring collector flag belongs on the forwarding rule, and the documented Packet Mirroring collector forwarding rule uses TCP with `--ports=all`. Updated the backend service and forwarding rule commands.
- The health check used TCP port 4789, but the collector instances did not run a TCP service on that port. Updated the example to install `nginx` and use a regional HTTP health check on port 80, matching Google Cloud's Packet Mirroring collector guidance.
- The post claimed mirrored packets arrive as VXLAN on UDP 4789 and showed commands to create a VXLAN interface. Google Cloud's VPC Packet Mirroring documentation describes forwarding cloned packet data to collector instances through the collector load balancer and does not document VXLAN decapsulation for this setup. Removed the VXLAN interface commands and configured Suricata to inspect the receiving interface directly.
- The filter example said it mirrored HTTP and HTTPS traffic, but Packet Mirroring filters protocols and CIDR ranges, not TCP ports. Updated the text to say TCP traffic.
- The filter option list omitted supported protocols and used uppercase direction values. Updated the protocol list and direction values to match the `gcloud` reference.
- The `packet-mirrorings list` command used `--region`, but the list command uses filters or `--regions`. Updated the example to filter by region.
- The cost section said Packet Mirroring itself does not charge per packet. Google Cloud documents Packet Mirroring data processing charges and related egress/resource charges. Updated the cost wording.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against the current official Google Cloud SDK reference instead of local `--help` output.
