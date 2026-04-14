# Validation Summary: How to Fix Dapr Sidecar Injection on Private GKE Clusters

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar injector, admission webhook)
- Google Kubernetes Engine (GKE) private clusters
- GKE Autopilot
- Kubernetes MutatingWebhookConfiguration
- Google Cloud VPC firewall rules
- Helm (Dapr chart)
- gcloud CLI
- kubectl

## Sources Consulted
- Dapr Helm chart source (dapr/dapr GitHub repository) — deployment templates and values.yaml for sidecar injector configuration
- GKE private cluster documentation — default firewall rules, control plane to node connectivity
- GKE documentation on master-authorized-networks — confirms it controls inbound API server access only
- kubectl CLI reference — verified `kubectl run --annotations` flag availability (supported since Kubernetes 1.25+)

## Issues Found

### 1. Error code block language tag (minor)
- **What was wrong:** The error message block was tagged as ` ```yaml ` but the content is a terminal error message, not YAML.
- **What was changed:** Changed to ` ```text `.

### 2. "Alternative: Change the Webhook Port" section was misleading
- **What was wrong:** The section title said "Change the Webhook Port" but the Helm command (`--set dapr_sidecar_injector.webhookFailurePolicy=Ignore`) changes the webhook failure policy, not the port. The Dapr injector port (4000) is hardcoded in the deployment template and is not configurable via Helm values. Additionally, the claim "GKE allows ports 443, 8443, and 9443 from the control plane" is incorrect — GKE private clusters only allow ports 443 and 10250 by default.
- **What was changed:** Renamed the section to "Alternative: Adjust the Webhook Failure Policy". Corrected the description to accurately explain that this changes the failure policy (not the port), listed the correct default allowed ports (443 and 10250), and added a clear warning that this is a temporary workaround where pods will start without Dapr sidecars when the injector is unreachable.

### 3. Autopilot GKE section had incorrect command
- **What was wrong:** The section recommended using `--enable-master-authorized-networks` to fix webhook connectivity. This flag controls inbound access TO the Kubernetes API server (restricting which CIDRs can reach the API endpoint). It has no effect on outbound traffic from the control plane to nodes, which is the actual issue for webhook connectivity.
- **What was changed:** Removed the incorrect `gcloud container clusters update` command. Replaced with correct guidance: Autopilot manages node infrastructure and firewall rules automatically, but you can create VPC firewall rules targeting Autopilot node network tags using the same approach as standard private clusters.

## Review Notes
- The Dapr sidecar injector container port (4000) is hardcoded in the Helm chart deployment template and is not exposed as a configurable Helm value. There is no simple `--set` flag to change it. The primary fix (creating a firewall rule for port 4000) is the correct and recommended approach.
- The `gcloud container clusters describe` command using `nodeConfig.tags` to get node network tags works for the default node pool configuration, but may return empty if no custom tags were set. An alternative approach is to query GCE instances directly: `gcloud compute instances list --filter="name~'gke-CLUSTER_NAME'" --format="value(tags.items[0])"`.
- The `webhookFailurePolicy` in the Dapr Helm chart defaults to `Ignore`. If a user is seeing timeout errors on pod creation, they may have explicitly set it to `Fail`, or the behavior may vary by Dapr version.
- The `kubectl run --annotations` command was verified to work with kubectl 1.25+, which is the expected version range for GKE users.
