# Validation Summary: How to Configure GCP Cloud Load Balancing with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Load Balancing
- Classic Application Load Balancer
- Regional external passthrough Network Load Balancer
- IPv6
- `gcloud` CLI
- Terraform
- DNS AAAA records
- `curl`

## Sources Consulted
- Google Cloud, IPv6 for Application Load Balancers and proxy Network Load Balancers: https://docs.cloud.google.com/load-balancing/docs/ipv6
- Google Cloud, Request routing to a multi-region classic Application Load Balancer: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-https
- Google Cloud, Convert Application Load Balancer to IPv6: https://docs.cloud.google.com/load-balancing/docs/https/convert-applb-dualstack
- Google Cloud, Target pool-based regional external passthrough Network Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/network/networklb-target-pools
- Google Cloud, Backend service-based regional external passthrough Network Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/network/networklb-backend-service
- Google Cloud, Set up an external passthrough Network Load Balancer with a backend service: https://docs.cloud.google.com/load-balancing/docs/network/setting-up-network-backend-service
- Google Cloud SDK reference, `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Google Cloud SDK reference, `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK reference, `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- HashiCorp Google provider, `google_compute_backend_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_service.html.markdown
- HashiCorp Google provider, `google_compute_global_forwarding_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- HashiCorp Google provider, `google_compute_global_address`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_address.html.markdown
- curl man page, `--resolve`: https://curl.se/docs/manpage.html#--resolve

## Issues Found
- The post treated all HTTP(S) and network load balancer IPv6 behavior as if it were the same. I updated the introduction and conclusion to distinguish classic Application Load Balancers, which can proxy IPv6 clients to IPv4 backends, from newer `EXTERNAL_MANAGED` Application Load Balancers and passthrough Network Load Balancers, which require dual-stack backends for IPv6 traffic.
- The HTTP(S) example was presented generically, but the commands actually create a classic Application Load Balancer because they use the `EXTERNAL` load-balancing scheme. I renamed the section accordingly, made the scheme explicit, and added the missing health check and backend attachment steps so the flow matches the documented classic setup.
- The regional Network Load Balancer example was incorrect because it used a target pool with an IPv6 frontend. Google Cloud documents target pool-based passthrough Network Load Balancers as IPv4-only. I replaced that example with a backend service-based regional external passthrough Network Load Balancer flow, including the IPv6 address reservation, health check, backend service, backend attachment, and IPv6 forwarding rule.
- The Terraform example referenced undeclared resources for the VM instance, health check, and SSL certificate. I added a defined health check resource and converted the VM and certificate references to explicit placeholder self-links so the snippet is internally consistent and matches current provider fields.
- The `curl` verification example used an IPv6 literal URL together with `--resolve`, which does not correctly test the production hostname's TLS SNI path. I changed it to `curl --resolve ... https://example.com/` so the host header and SNI match the intended validation flow.

## Review Notes
- The corrected HTTP(S) example now explicitly documents the classic Application Load Balancer path. Google recommends `EXTERNAL_MANAGED` for newer global external Application Load Balancers, but Google Cloud's current IPv6 documentation says IPv6 traffic for that mode requires dual-stack backends.
- The Terraform block still uses placeholder values for an existing VM self-link and an existing global SSL certificate self-link. Those placeholders are intentional and must be replaced in a real deployment.
