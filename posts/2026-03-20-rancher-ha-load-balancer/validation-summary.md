# Validation Summary: How to Configure Rancher HA with External Load Balancer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- K3s
- AWS Elastic Load Balancing v2 (ALB and NLB)
- AWS Route 53
- Google Cloud Load Balancing
- AWS CLI
- Google Cloud SDK (`gcloud`)

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Amazon ELB Network Load Balancer guide: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/infrastructure-setup/amazon-elb-load-balancer
- Rancher high-availability architecture guidance: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher RKE2 for Rancher guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- RKE2 High Availability: https://docs.rke2.io/install/ha
- AWS Application Load Balancer listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS CLI `modify-listener`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-listener.html
- AWS Application Load Balancer attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- AWS Application Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- Google Cloud SDK `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK `gcloud compute backend-services update`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK `gcloud compute health-checks create http`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Google Cloud SDK `gcloud compute target-https-proxies create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Google Cloud SDK `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create

## Issues Found
- The ALB example terminated TLS at the load balancer but still forwarded to backend `HTTPS:443`. Rancher documents Layer 7 external TLS termination with `--set tls=external` and backend traffic to node port `80`, so the example was updated to `HTTP:80` with `/healthz`.
- The ALB HTTP-to-HTTPS redirect omitted the target port. AWS listener redirect configuration supports an explicit `Port`; the example was updated to include `443`.
- The NLB section claimed NLB was preferred for WebSocket support. AWS documents that Application Load Balancers already support WebSockets, so the section was corrected to describe NLB as the Layer 4 TCP pass-through option instead.
- The NLB example mixed Rancher frontend traffic with an RKE2 API listener on `6443`. RKE2 HA requires separate control-plane load balancer listeners for `9345` and `6443`, while Rancher frontend traffic is typically `80/443`, so the post was corrected to stay scoped to Rancher traffic.
- The NLB example did not register targets for its target groups, so it would not work as written. Target registration commands were added.
- The GCP example created the backend service before creating its referenced health check, which would fail. The commands were reordered so the health check is created first.
- The GCP example used HTTPS backends and `/ping` for a Layer 7 HTTPS load balancer. For Rancher's documented external TLS termination model, the post was corrected to use HTTP backends on port `80` with `/healthz`.
- The session persistence section made an unsupported Rancher version-specific claim about statelessness. That was replaced with a version-agnostic note that session affinity is optional and environment-dependent.
- The health check section incorrectly described `/ping` as Rancher's general health endpoint. Rancher documents `/healthz` for Rancher health checks, while `/ping` is the Traefik/K3s ingress path, so the examples and explanation were corrected.
- The GCP timeout command used `--timeout=3600` without an explicit duration suffix. The current SDK documents duration-formatted values such as `10s`, so the example was updated to `3600s`.

## Review Notes
- The corrected post now reflects Rancher's two common patterns: Layer 4 pass-through on `80/443`, and Layer 7 TLS termination with `--set tls=external`.
- If a deployment also reuses a load balancer for the RKE2 control plane, that is a separate concern from Rancher ingress and requires listeners for both `9345` and `6443`.
