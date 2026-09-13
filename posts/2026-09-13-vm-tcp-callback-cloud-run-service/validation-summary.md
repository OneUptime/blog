# Validation Summary: Why a VM Cannot Open a TCP Callback to a Cloud Run Service

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Run services, jobs, and worker pools
- Direct VPC egress and ingress
- Google Cloud VPC firewall connection tracking
- Compute Engine VM service accounts
- Cloud Run IAM authentication and `roles/run.invoker`
- Google Cloud CLI (`gcloud`)
- Python `google-auth` ID tokens and `urllib.request`
- Durable and idempotent callback processing

## Sources Consulted
- [Direct VPC with a VPC network](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Restrict network endpoint ingress for Cloud Run services and instances](https://docs.cloud.google.com/run/docs/securing/ingress)
- [Private networking and Cloud Run](https://docs.cloud.google.com/run/docs/securing/private-networking)
- [Authenticating service-to-service](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Set custom audiences for Cloud Run services](https://docs.cloud.google.com/run/docs/configuring/custom-audiences)
- [Authenticate Compute Engine workloads using service accounts](https://docs.cloud.google.com/compute/docs/access/authenticate-workloads)
- [`gcloud run services describe` reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [`gcloud run services add-iam-policy-binding` reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding)
- [VPC firewall rules and connection tracking](https://docs.cloud.google.com/firewall/docs/firewalls)

## Issues Found
No technical issues found.

## Review Notes
The post correctly distinguishes established-flow return traffic from a new TCP connection. It also accurately reflects the current product distinction: Cloud Run services and jobs support Direct VPC egress but not Direct VPC ingress, while worker pools support Direct VPC ingress on ephemeral private instance IPs. Worker-pool ingress firewall rules cannot target network tags and IP-based policy must use the subnet range; the post appropriately leaves the implementation as a design consideration rather than presenting an incorrect configuration. The authenticated Python callback follows the documented Cloud Run audience and ID-token pattern, and both `gcloud` commands use current supported syntax.
