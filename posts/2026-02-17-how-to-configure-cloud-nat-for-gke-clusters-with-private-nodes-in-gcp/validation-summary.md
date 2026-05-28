# Validation Summary: How to Configure Cloud NAT for GKE Clusters with Private Nodes in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE private nodes and VPC-native clusters
- Google Cloud NAT / Public NAT
- Cloud Router
- Private Google Access
- Artifact Registry and `gcr.io` repositories
- `gcloud` CLI
- Kubernetes `kubectl`

## Sources Consulted
- Google Cloud NAT product interactions: https://cloud.google.com/nat/docs/nat-product-interactions
- Google Cloud NAT IP addresses and ports: https://cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT logs and metrics: https://cloud.google.com/nat/docs/monitoring
- Google Cloud SDK reference for `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud SDK reference for `gcloud compute routers nats update`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud SDK reference for `gcloud compute networks subnets update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- GKE network isolation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation
- Artifact Registry transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- GKE Container Registry transition notice: https://cloud.google.com/kubernetes-engine/docs/deprecations/container-registry

## Issues Found
- The post referred to Google Container Registry (GCR) as if it were still the active Google container registry. Container Registry is shut down, while `gcr.io` URLs can be hosted by Artifact Registry. I changed the wording to refer to Artifact Registry, including `gcr.io` repositories hosted on Artifact Registry.
- The introductory list said private nodes cannot pull images from GCR without NAT, which conflicts with the later Private Google Access guidance and is outdated after the Container Registry transition. I removed GCR from the public registry examples.
- The Private Google Access command used `--enable-private-google-access`, which is not the current `gcloud compute networks subnets update` flag. I changed it to `--enable-private-ip-google-access`.
- The Private Google Access section implied manual enablement is always required alongside Public NAT. Google Cloud documentation states Public NAT automatically enables Private Google Access for subnet ranges that the NAT gateway applies to. I adjusted the wording to say enabling it is useful when you want Google API access without depending on Public NAT.

## Review Notes
The Cloud NAT commands, custom subnet range syntax, dynamic port allocation flags, static NAT IP pool usage, logging flags, GKE private node flags, and Cloud NAT per-node port allocation explanation match current Google Cloud documentation. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
