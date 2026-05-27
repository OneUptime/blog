# Validation Summary: How to Switch from Static to Dynamic Port Allocation on Cloud NAT in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Cloud NAT
- Public NAT
- Dynamic port allocation
- Endpoint-Independent Mapping
- Google Cloud CLI (`gcloud`)
- Cloud Logging

## Sources Consulted
- Google Cloud NAT: IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT: Tune NAT configuration: https://docs.cloud.google.com/nat/docs/tune-nat-configuration
- Google Cloud NAT: Logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud NAT: Troubleshoot configuration: https://docs.cloud.google.com/nat/docs/troubleshooting
- Google Cloud SDK reference: `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud Public NAT setup and management: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation

## Issues Found
- The post said Cloud NAT uses static port allocation by default. Updated this to Public NAT, because Public NAT uses static port allocation by default while Private NAT uses dynamic port allocation by default.
- The static allocation explanation said each VM gets exactly `min-ports-per-vm` ports. Updated this to say allocation is fixed based on `min-ports-per-vm`, because Cloud NAT allocates source IP and port tuples using documented reservation rules and can allocate at least the configured minimum.
- The dynamic port allocation limits only said values must be powers of 2. Added the documented ranges: minimum ports must be between 32 and 32,768, maximum ports must be between 64 and 65,536, and maximum must be greater than minimum.
- The dynamic allocation command did not account for Endpoint-Independent Mapping. Added `--no-enable-endpoint-independent-mapping` because dynamic port allocation cannot be configured while Endpoint-Independent Mapping is enabled.
- The migration text said existing connections are not disrupted. Updated it with the documented exceptions: switching to dynamic allocation can break connections if `max-ports-per-vm` is lower than the previous static minimum or lower than 1024.
- The monitoring text described sample NAT flow logs as per-VM port consumption. Updated the wording to describe NAT errors and recent translations, which matches what the commands actually query.
- The Endpoint-Independent Mapping section said static allocation uses Endpoint-Independent Mapping. Corrected this because static allocation can be used with or without Endpoint-Independent Mapping, while dynamic allocation requires it to be disabled.
- The rollback section omitted the disruptive nature of switching from dynamic back to static allocation. Added a note that active NAT connections are broken when disabling dynamic port allocation.
- The timeout examples used bare integer values. Updated them to duration values with `s` suffixes, matching the Google Cloud CLI duration format examples.
- The conclusion overstated that dynamic allocation has no downtime and should be the default for new Cloud NAT gateways. Updated it to reflect the documented disruption caveats and that dynamic allocation is a better fit for many variable workloads.

## Review Notes
The `gcloud` commands and Cloud Logging field names were checked against official Google Cloud documentation. The sample logging queries are syntactically aligned with documented Cloud NAT log fields, but production users may also want to monitor Cloud NAT metrics such as port usage when tuning min and max values.
