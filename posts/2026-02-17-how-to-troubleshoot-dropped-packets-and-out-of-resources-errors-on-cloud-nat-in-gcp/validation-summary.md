# Validation Summary: How to Troubleshoot Dropped Packets and OUT_OF_RESOURCES Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud NAT
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Cloud Monitoring
- Google Cloud VPC firewall rules

## Sources Consulted
- Google Cloud NAT logs and metrics documentation: https://cloud.google.com/nat/docs/monitoring
- Google Cloud NAT troubleshooting documentation: https://cloud.google.com/nat/docs/troubleshooting
- Google Cloud NAT IP addresses and ports documentation: https://cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT tuning documentation: https://cloud.google.com/nat/docs/tune-nat-configuration
- Google Cloud NAT quotas and limits documentation: https://cloud.google.com/nat/quota
- Google Cloud SDK reference for `gcloud compute routers nats update`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud SDK reference for `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create

## Issues Found
- Corrected the endpoint-independent conflict explanation. The original wording implied this is specifically two VMs using the same NAT IP:port. Google documents the conflict as endpoint-independent mapping assigning the same NAT source IP and port tuple to more than one internal IP address and ephemeral source port tuple.
- Replaced the unsupported "rate limiting" drop cause. The official Cloud NAT troubleshooting and limits documentation describes port exhaustion, endpoint-independent conflicts, missing connection tracking entries for received packets, logging throttling, and connection tracking limits, but not a per-VM or per-gateway connection creation rate drop reason.
- Added the endpoint-independent mapping requirement to the dynamic port allocation examples. Google Cloud requires endpoint-independent mapping to be disabled before enabling dynamic port allocation.
- Added a disruption caveat for changing the port allocation method. Google documents that enabling dynamic port allocation is only non-disruptive when the new maximum ports per VM is at least the previous minimum and at least 1,024.
- Clarified the TCP TIME_WAIT wording. The timeout retains the NAT mapping for a fully closed TCP connection, rather than holding ports because of the VM operating system's TIME_WAIT state.
- Clarified the emergency auto-allocation wording. Automatic NAT IP allocation adds addresses as needed by the gateway and is not guaranteed to add capacity unconditionally.

## Review Notes
The `gcloud` commands and flags in the post match the current Google Cloud SDK reference. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK documentation rather than local `--help` output.
