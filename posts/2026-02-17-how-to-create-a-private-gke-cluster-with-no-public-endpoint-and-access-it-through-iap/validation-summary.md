# Validation Summary: How to Create a Private GKE Cluster with No Public Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE private clusters and private control plane endpoints
- Google Cloud VPC subnet secondary ranges
- Identity-Aware Proxy (IAP) TCP forwarding
- Compute Engine VMs
- Cloud NAT and Cloud Router
- Tinyproxy
- Google Cloud CLI
- GKE Connect Gateway and Fleet memberships
- Cloud Build private pools
- Kubernetes kubectl access

## Sources Consulted
- Google Cloud Documentation: Customize network isolation in GKE, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation
- Google Cloud SDK Reference: gcloud container clusters create, https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK Reference: gcloud container clusters get-credentials, https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Google Cloud Documentation: Using IAP for TCP forwarding, https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud Documentation: Set up and manage network address translation with Public NAT, https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Google Cloud Documentation: Connect to registered clusters with the Connect gateway, https://docs.cloud.google.com/kubernetes-engine/enterprise/multicluster-management/gateway
- Google Cloud Documentation: Set up the Connect gateway, https://cloud.google.com/kubernetes-engine/enterprise/multicluster-management/gateway/setup
- Google Cloud SDK Reference: gcloud container fleet memberships register, https://cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud Documentation: Create and manage private pools, https://docs.cloud.google.com/build/docs/private-pools/create-manage-private-pools
- Google Cloud SDK Reference: gcloud builds worker-pools create, https://docs.cloud.google.com/sdk/gcloud/reference/builds/worker-pools/create

## Issues Found
- The cluster creation command enabled master authorized networks but did not enforce them on the private endpoint. Added `--enable-authorized-networks-on-private-endpoint` and an initial `--master-authorized-networks 10.0.0.0/20` range so the private endpoint restriction matches the text.
- The proxy VM had no external IP and no outbound path for `apt-get update` or package installation. Added Cloud Router and Cloud NAT commands before VM creation, and clarified that NAT provides outbound access without exposing inbound access.
- The proxy VM startup script installed unnecessary Google Cloud and Kubernetes packages. Simplified it to install `tinyproxy`, which is the component used for the HTTPS proxy tunnel.
- The tinyproxy configuration allowed `10.0.0.0/8`, but IAP TCP forwarding reaches the VM from Google's documented IAP range `35.235.240.0/20`. Updated the configuration to allow the IAP range and to listen beyond localhost.
- The alternative access section incorrectly described Connect Gateway as a direct IAP tunnel and stated that it requires GKE Enterprise. Renamed the section to "Connect Gateway" and replaced the requirement statement with the documented requirements: fleet registration, Connect Gateway API, IAM permissions, and Kubernetes RBAC.
- The Cloud Build private pool example later authorized `10.1.0.0/20`, but the worker pool creation command did not reserve that peered range. Added `--peered-network-ip-range 10.1.0.0/20` so the CI/CD and authorized networks examples line up.
- The control plane authorized networks update command did not enforce authorized networks on the internal endpoint. Added `--enable-authorized-networks-on-private-endpoint`.

## Review Notes
The remaining commands use documented Google Cloud CLI flags as of the review date. In a production setup, teams should also pin or validate their Google Cloud CLI version and define exact IAM/RBAC scopes instead of granting broad project-level access.
