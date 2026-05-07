# Validation Summary: How to Install Rancher on Google Cloud Compute Engine

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- Helm
- cert-manager
- Google Cloud Compute Engine
- Google Cloud DNS
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher installation and upgrade on Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Google Compute Engine cluster guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-a-google-compute-engine-cluster
- Rancher bootstrap password reference: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s install script: https://get.k3s.io
- Helm installation docs: https://helm.sh/docs/v3/intro/install/
- Helm install script: https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- `gcloud compute instances add-access-config`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- `gcloud compute instances delete-access-config`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Cloud DNS record management: https://cloud.google.com/dns/docs/records

## Issues Found
- The prerequisites said a domain name was optional, but the walkthrough requires a hostname and DNS setup. I changed this to say a domain name is recommended.
- The firewall rule opened TCP 6443 to the world and described it as required for the guide. For this walkthrough, Rancher access is through ports 80 and 443 and administration is done over SSH on 22, so I removed 6443 from the public firewall rule and updated the description.
- The K3s installation step did not pin a Rancher-supported K3s version and did not use `server --cluster-init`, which Rancher’s current quickstart recommends for a supported setup with embedded etcd. I updated the command to use `INSTALL_K3S_VERSION=<supported-k3s-version>`, `server`, and `--cluster-init`.
- The Helm install command used a less robust `curl` invocation. I updated it to `curl -fsSL`, which matches Helm’s documented script usage more closely.
- The cert-manager “wait” step used `kubectl get pods`, which only lists resources and does not wait for readiness. I replaced it with `kubectl rollout status` commands for the cert-manager deployments.
- The Rancher install example used `bootstrapPassword=admin`. Rancher supports setting a bootstrap password, but current docs recommend setting a unique value. I changed this to a placeholder value.
- The Cloud DNS example used an unqualified record name format and unquoted command substitution. I updated it to a fully qualified DNS name with a trailing dot and quoted the `--rrdatas` value.
- The Google GCE node driver section was outdated. Current Rancher docs state that the Google GCE node driver is built in but not enabled by default. I updated the text to reflect the required activation and cloud credential steps.
- The performance section implied that `e2-standard-2` is sufficient in general. Current Rancher installation requirements distinguish proof-of-concept from production sizing, and production K3s guidance starts at 4 vCPUs and 16 GB RAM per node for small deployments. I corrected that statement.
- The browser access step omitted the expected certificate warning when using Rancher-generated certificates. I added that note so the behavior matches the default installation path used in the post.

## Review Notes
- The post now aligns with current official docs for Rancher, K3s, Helm, cert-manager, and the relevant Google Cloud CLI commands as of 2026-05-07.
- The tutorial still relies on latest chart and script defaults for some components. It should be revalidated if Rancher’s supported K3s versions, cert-manager installation guidance, or Helm chart defaults change.
