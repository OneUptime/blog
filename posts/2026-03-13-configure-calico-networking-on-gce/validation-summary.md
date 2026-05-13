# Validation Summary: Configure Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Google Compute Engine
- Google Cloud VPC routes and firewall rules
- Google Cloud CLI (`gcloud`)
- Helm

## Sources Consulted
- Calico Open Source documentation: Google Compute Engine: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Open Source documentation: Install using Helm: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Open Source documentation: IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Google Cloud documentation: Use routes / enable IP forwarding for instances: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud documentation: Static routes: https://cloud.google.com/vpc/docs/static-routes
- Google Cloud SDK reference: `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK reference: `gcloud compute routes create`: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud SDK reference: `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create

## Issues Found
- The introduction incorrectly stated that GCP VMs automatically forward packets for any IP address without a source/destination check equivalent. Google Cloud documentation says IP forwarding is disabled by default and strict source address checking is performed. Updated the wording to state that IP forwarding must be enabled for pod traffic forwarding.
- The Helm installation example skipped the current documented CRD installation step. Updated the commands to create the `tigera-operator` namespace, apply the Calico CRDs with `helm template ... | kubectl apply --server-side -f -`, and install the Tigera Operator with an explicit version.
- Step 5 described IP forwarding as an alternative and showed only a describe command under a comment saying "Enable IP forwarding." For native routing with VPC static routes, next-hop instances must have IP forwarding enabled. Updated the section title and text to make it a required check for static-route mode and added the zone and format flags to the verification command.

## Review Notes
- The firewall rule and static route `gcloud` command flags are valid according to Google Cloud SDK documentation.
- The `IPPool` fields shown (`cidr`, `ipipMode`, `vxlanMode`, `natOutgoing`, and `blockSize`) are valid Calico `projectcalico.org/v3` fields. The custom `/24` block size is valid for IPv4 but can only be set when the pool is created.
