# Validation Summary: How to Fix Cloud NAT Port Exhaustion Errors in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud NAT
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Cloud Monitoring
- Python `requests`
- TCP connection lifecycle and TIME_WAIT behavior

## Sources Consulted
- Google Cloud NAT: IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT: Tune NAT configuration: https://docs.cloud.google.com/nat/docs/tune-nat-configuration
- Google Cloud NAT: Logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud NAT: Troubleshoot configuration: https://docs.cloud.google.com/nat/docs/troubleshooting
- Google Cloud SDK reference for `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update

## Issues Found
- Corrected the description of NAT source port uniqueness. Cloud NAT allocates NAT source IP address and source port tuples, and the effective connection uniqueness is scoped with the destination IP, destination port, and protocol, not just a globally unique source port.
- Corrected the symptom description to distinguish `DROPPED` Cloud NAT log entries from `OUT_OF_RESOURCES` reasons on Cloud NAT dropped packet metrics.
- Corrected the default minimum port allocation statement. Public NAT with static allocation defaults to 64 ports per VM, while dynamic port allocation defaults to 32 minimum ports per VM if no value is set.
- Corrected the static allocation explanation. Cloud NAT uses a fixed allocation with static port allocation, but the allocated count is based on the configured minimum and Cloud NAT allocation rules, not always exactly the user-entered minimum.
- Corrected the troubleshooting flow for dropped logs. `jsonPayload.allocation_status="DROPPED"` identifies dropped outbound packets, but the `OUT_OF_RESOURCES` reason is exposed through Cloud Monitoring dropped packet metrics, so logs alone do not prove port exhaustion.
- Added the documented dynamic port allocation constraints: min and max values must be powers of 2, min must be at least 32, and max must be greater than min.
- Clarified the TCP TIME_WAIT tradeoff. Lowering the timeout can improve port reuse, but it can expose unrelated later connections to retransmitted packets from closed connections; Google also recommends at least 15 seconds when dynamic port allocation is enabled.

## Review Notes
The main `gcloud compute routers nats update` flags used in the post are current in the official CLI reference. The local environment did not have `gcloud` installed, so command verification was performed against official Google Cloud documentation instead of local `--help` output.
