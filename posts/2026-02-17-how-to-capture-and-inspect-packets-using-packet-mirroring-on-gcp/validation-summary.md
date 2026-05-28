# Validation Summary: How to Capture and Inspect Packets Using Packet Mirroring on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPC Packet Mirroring
- Compute Engine
- Internal passthrough Network Load Balancing
- Google Cloud CLI
- Python Google Cloud Compute client library
- tcpdump
- tshark
- Suricata
- Cloud Logging Ops Agent

## Sources Consulted
- Google Cloud VPC Packet Mirroring overview: https://docs.cloud.google.com/vpc/docs/packet-mirroring
- Google Cloud VPC Packet Mirroring usage guide: https://docs.cloud.google.com/vpc/docs/using-packet-mirroring
- Google Cloud SDK reference for `gcloud compute packet-mirrorings create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/packet-mirrorings/create
- Google Cloud SDK reference for `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud internal passthrough Network Load Balancer setup guide: https://docs.cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud Python Compute client reference for `PacketMirroring` and `PacketMirroringFilter`: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.PacketMirroring and https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.PacketMirroringFilter
- Google Cloud Ops Agent overview and configuration docs: https://docs.cloud.google.com/logging/docs/agent/ops-agent and https://cloud.google.com/logging/docs/agent/ops-agent/configuration
- Google Cloud Ops Agent installation docs: https://cloud.google.com/monitoring/agent/ops-agent/installation
- Suricata configuration documentation: https://docs.suricata.io/en/suricata-7.0.12/configuration/suricata-yaml.html

## Issues Found
- The post said mirrored traffic was encapsulated and had no performance impact. Google Cloud VPC Packet Mirroring docs state that it clones traffic, captures headers and payloads, and consumes additional bandwidth on mirrored VMs. I changed the wording to say it does not change the original traffic path but does consume additional bandwidth.
- The packet capture explanation did not mention application-layer encryption. I clarified that payload visibility is subject to encryption already present in the traffic.
- The collector setup omitted firewall rules required for mirrored traffic and Google Cloud health checks to reach collector instances. I added targeted firewall rule examples and a collector network tag.
- The health check used TCP port 80 even though the collector startup script did not install a service listening on port 80. I changed the health check to TCP port 22.
- The filter example claimed to mirror TCP traffic on specific ports, but VPC Packet Mirroring filters by protocol, CIDR range, and direction, not by TCP/UDP port. I corrected the comment and changed the CLI direction value to the documented lowercase `both`.
- The Python client example used `IP_protocols`, but the current generated Python field name is `I_p_protocols`. I corrected the field name.
- The logging section used the legacy Cloud Logging agent (`google-fluentd`). Google recommends the Ops Agent for new Google Cloud workloads, so I updated the installation and configuration example to use the Ops Agent with a file receiver and JSON parser.
- The Suricata alert command used `jq`, but the collector startup script did not install it. I added `jq` to the package install command.
- The cost section described only network bandwidth charges. I updated it to include Packet Mirroring data processing charges and cross-zone egress.

## Review Notes
The Google Cloud CLI is not installed in the review workspace, so CLI validation was performed against the official Google Cloud SDK reference pages rather than local `gcloud --help` output.
