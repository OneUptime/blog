# Validation Summary: How to Configure Cloud Load Balancing for IPv4 in GCP

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Cloud Load Balancing
- Global external Application Load Balancer
- Google Cloud CLI (`gcloud`)
- Compute Engine managed instance groups
- HTTP health checks
- Google-managed SSL certificates
- IPv4 addressing and forwarding rules

## Sources Consulted
- Google Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/application-load-balancer
- Set up a global external Application Load Balancer with VM instance group backends: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Use Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- `gcloud compute instance-groups managed create`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/create
- `gcloud compute instance-groups managed set-named-ports`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-named-ports
- `gcloud compute health-checks create http`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- `gcloud compute url-maps create`: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/create
- `gcloud compute target-http-proxies create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-http-proxies/create
- `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- `gcloud compute ssl-certificates create`: https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- `gcloud compute target-https-proxies create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- `gcloud compute backend-services get-health`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health

## Issues Found
- The introduction overstated Cloud Load Balancing as globally scoped in general. I narrowed the wording to the global external HTTP(S) load balancer case and clarified that multi-region distribution applies to backends.
- The architecture text implied one instance group could span multiple regions. I corrected it to refer to instance groups hosting VMs across multiple zones or regions.
- The health check example used bare integer duration values. I updated `--check-interval` and `--timeout` to the documented duration format (`10s` and `5s`) and made the health check explicitly global.
- The backend service and forwarding rule examples omitted `--load-balancing-scheme=EXTERNAL_MANAGED`. I added that flag so the commands align with the current global external Application Load Balancer resource model rather than relying on the classic external scheme.
- The URL map and target proxy examples relied on implicit scope. I added explicit `--global` flags to keep the commands unambiguous for a global configuration.
- The IPv4 address reservation example relied on defaults. I added `--ip-version=IPV4` and `--network-tier=PREMIUM` to make the IPv4 and premium-tier requirements explicit.
- The post was missing the firewall prerequisite for backend reachability. I added a note that the health check and GFE source ranges must be allowed to TCP port `80`.
- The HTTPS section omitted the DNS prerequisite for Google-managed certificate activation. I added a note that the public DNS `A` record must point to the load balancer IP for the certificate to become `ACTIVE`.

## Review Notes
- The example still uses a single zonal managed instance group in `us-central1-a`. That is valid, but readers must add additional instance groups as backends if they want actual multi-region traffic distribution.
- Google Cloud still documents both classic and global external Application Load Balancer modes. For new global HTTP(S) setups, the current documentation aligns with the `EXTERNAL_MANAGED` configuration used in the corrected commands.
