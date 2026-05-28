# Validation Summary: How to Choose Between Identity-Aware Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- IAP TCP forwarding
- Google Cloud IAM and IAM Conditions
- Cloud Run
- External Application Load Balancing and serverless NEGs
- Cloud VPN and HA VPN
- Cloud Interconnect
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud IAP for Cloud Run: https://cloud.google.com/iap/docs/enabling-cloud-run
- Google Cloud external Application Load Balancer with IAP: https://cloud.google.com/iap/docs/load-balancer-howto
- Google Cloud IAP TCP forwarding: https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud IAP context-aware access: https://cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Google Cloud SDK `backend-services update`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK `iap web add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK `compute instances add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-iam-policy-binding
- Google Cloud Cloud VPN overview: https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud HA VPN setup: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Google Cloud SDK Dedicated Interconnect attachment create: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud IAP pricing: https://cloud.google.com/iap/pricing

## Issues Found
- The post described "Cloud VPN or Cloud Interconnect" as an encrypted VPN tunnel for user access. Cloud VPN is an IPsec VPN for peer networks, while Cloud Interconnect is private connectivity and not itself a VPN. Updated the wording and client-software comparison to distinguish site-to-site Cloud VPN, self-managed remote-user VPN, and Cloud Interconnect.
- The Cloud Run IAP example omitted the IAP service agent and `roles/run.invoker` binding required for IAP to invoke a private Cloud Run service. Added the service identity and Cloud Run IAM binding commands.
- The Cloud Run backend-service example used explicit OAuth client credentials even though current Cloud Run IAP guidance supports enabling IAP with a Google-managed OAuth client through `--iap=enabled`. Updated the command and clarified that the omitted load balancer frontend resources must already be configured.
- The IAP TCP forwarding examples omitted the required firewall rules allowing IAP's TCP forwarding source range (`35.235.240.0/20`) to reach target ports. Added SSH and PostgreSQL firewall examples.
- The SSH example granted only `roles/iap.tunnelResourceAccessor`, but `gcloud compute ssh` also needs Compute Engine permissions. Added a project-level Compute Instance Admin binding to match Google Cloud's documented minimal example for gcloud SSH workflows.
- The context-aware access IAM condition was syntactically incorrect and did not check `request.auth.access_levels`. Updated it to use the documented access-level expression form.

## Review Notes
The load balancer example is still intentionally abbreviated; a complete runnable setup also needs a URL map, target HTTPS proxy, forwarding rule, certificate, and DNS. Cloud Run now also supports enabling IAP directly on a Cloud Run service in preview, which can be simpler than using a load balancer for some deployments.
