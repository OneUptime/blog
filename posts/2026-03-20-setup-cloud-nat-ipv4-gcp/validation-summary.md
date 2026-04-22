# Validation Summary: How to Set Up Cloud NAT for IPv4 Outbound Access in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Cloud NAT / Public NAT
- Cloud Router
- Compute Engine VM instances
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- Identity-Aware Proxy TCP forwarding

## Sources Consulted
- Google Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Google Cloud Public NAT documentation: https://cloud.google.com/nat/docs/public-nat
- Google Cloud Public NAT setup guide: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Google Cloud NAT IP addresses and ports: https://cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics: https://cloud.google.com/nat/docs/monitoring
- Google Cloud IAP TCP forwarding: https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud SDK `gcloud compute routers create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/create
- Google Cloud SDK `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud SDK `gcloud compute routers nats update`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud SDK `gcloud compute routers nats describe`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/describe
- Google Cloud SDK `gcloud compute routers get-nat-ip-info`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-nat-ip-info
- Google Cloud SDK `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Google Cloud SDK `gcloud compute ssh`: https://cloud.google.com/sdk/gcloud/reference/compute/ssh

## Issues Found
- The verification SSH command did not make the access path for a VM without an external IP explicit. Added `--tunnel-through-iap` and updated the comment to clarify that IAP is used for SSH access while Cloud NAT handles outbound traffic.
- The verification text implied a single NAT IP address. Updated it to say the returned IP is one of the Cloud NAT gateway's automatically allocated external IP addresses.
- The static IP section attempted to create `prod-nat` again after the guide had already created it. Changed the example to update the existing NAT configuration with `--nat-external-ip-pool`.
- The subnet-limiting section also attempted to create `prod-nat` again. Changed it to update the existing NAT configuration instead.
- The subnet-limiting command used bare subnet names, which include only primary ranges. Updated the example to use `app-subnet:ALL,db-subnet:ALL` so it matches the stated goal of NATing all ranges in those specific subnets.
- The port allocation explanation stated the default as 64 ports per VM without the static-allocation context. Clarified that 64 is the default for the static port allocation used in the post.
- The Cloud NAT logging comment said "all NAT translations." Updated it to "NAT translations and errors" to match the `--log-filter=ALL` behavior and Cloud NAT logging documentation.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command verification was performed against the official Google Cloud SDK reference documentation. No further technical issues were found after the corrections.
