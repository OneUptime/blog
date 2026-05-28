# Validation Summary: How to Configure a Passthrough Network Load Balancer for UDP Traffic in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Load Balancing
- External passthrough Network Load Balancer
- Internal passthrough Network Load Balancer
- UDP traffic
- Compute Engine instance groups
- Google Cloud health checks
- Cloud DNS server policies
- gcloud CLI

## Sources Consulted
- Google Cloud: Backend service-based regional external passthrough Network Load Balancer overview: https://cloud.google.com/load-balancing/docs/network/networklb-backend-service
- Google Cloud: Internal passthrough Network Load Balancer overview: https://cloud.google.com/load-balancing/docs/internal
- Google Cloud: Health checks overview: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud: Configure DNS server policies: https://cloud.google.com/dns/docs/policies
- Google Cloud SDK: `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: `gcloud compute health-checks create http`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Google Cloud SDK: `gcloud dns policies create`: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create

## Issues Found
- The startup scripts installed only `socat`, but the post later created HTTP health checks on port 8080. I updated the startup scripts to install `python3`, create a `/health` response file, and run a lightweight HTTP server so the health check endpoint can actually return HTTP 200.
- The post described UDP packets as independently routed with no connection state. I changed this to note that UDP is connectionless while Google Cloud can still use UDP flow tracking for load-balancing decisions.
- The post did not mention the direct server return implication for UDP replies. I added a note that response-bearing UDP services need to reply from the load balancer IP because passthrough load balancers preserve the destination forwarding-rule IP.
- The external health-check firewall rule used `130.211.0.0/22`, which is not the current IPv4 probe range set documented for regional external passthrough Network Load Balancers. I changed it to `35.191.0.0/16`, `209.85.152.0/22`, and `209.85.204.0/22`.
- The internal load balancer example used placeholder VPC names that did not match the earlier default-network backend setup and forwarded port 53 to instances listening on 5353. I aligned the example to the default network/subnet and port 5353.
- The internal load balancer example omitted firewall rules for internal UDP traffic and internal passthrough health checks. I added rules for VPC-sourced UDP traffic and the documented internal passthrough health-check ranges.
- The session affinity list omitted `CLIENT_IP_PROTO` and described `NONE` as round-robin. I added `CLIENT_IP_PROTO` and changed the `NONE` description to avoid implying round-robin packet routing.
- The DNS use case showed an invalid `gcloud compute networks subnets update` command with no DNS-related option. I replaced it with a Cloud DNS outbound server policy using `gcloud dns policies create --private-alternative-name-servers`.
- The limitations section said there is no connection draining. Backend service-based regional external passthrough Network Load Balancers support connection draining, so I replaced that item with a more accurate note about time-limited UDP connection tracking.
- The testing section said `nc` would listen for a response from the UDP echo service. Because passthrough UDP replies require backend source-IP handling, I changed the wording to describe the command as sending UDP packets.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against current official Google Cloud SDK reference documentation rather than local `gcloud --help` output.
