# Validation Summary: How to Connect Portainer to a Google GKE Cluster - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Google Kubernetes Engine (GKE)
- Google Cloud CLI (`gcloud`)
- Kubernetes
- `kubectl`
- Kubernetes RBAC and ServiceAccounts
- Workload Identity Federation for GKE

## Sources Consulted
- Google Cloud SDK: `gcloud container clusters get-credentials`  
  https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Google Kubernetes Engine: Install `kubectl` and configure cluster access  
  https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl
- Google Kubernetes Engine: Authenticate to the Kubernetes API server  
  https://docs.cloud.google.com/kubernetes-engine/docs/how-to/api-server-authentication
- Google Kubernetes Engine: Private clusters / control plane access  
  https://docs.cloud.google.com/kubernetes-engine/docs/how-to/private-clusters
- Kubernetes: `kubectl create token` reference  
  https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes: Service Accounts  
  https://kubernetes.io/docs/concepts/security/service-accounts/
- Portainer: Add a Kubernetes environment  
  https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer: Import an existing Kubernetes environment  
  https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer: Install Portainer Agent on your Kubernetes environment  
  https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer: Add an environment via the Portainer API  
  https://docs.portainer.io/admin/environments/add/api
- Portainer API documentation  
  https://docs.portainer.io/api/docs
- Portainer published OpenAPI spec (BE 2.39.1)  
  https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer: Updating on Kubernetes  
  https://docs.portainer.io/start/upgrade/kubernetes
- Portainer Helm repository index  
  https://portainer.github.io/k8s/index.yaml
- Portainer published Kubernetes agent manifest (used to verify current Deployment-based agent shape)  
  https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml

## Issues Found
- The post used `gcloud container clusters get-credentials --kubeconfig ...`, but current Google Cloud documentation writes alternate kubeconfig files by setting the `KUBECONFIG` environment variable. I updated Step 1 to use `KUBECONFIG=gke-portainer.kubeconfig` and switched to the current `--location` flag.
- The prerequisites omitted `kubectl`, even though the article relies on it throughout. I added `kubectl` to the prerequisites list.
- The kubeconfig import section used an undocumented Portainer API workflow and did not mention Portainer's documented requirements for Kubernetes import. I replaced that section with the supported UI import flow and added the Business Edition and load balancer requirements from Portainer's docs.
- The post claimed an agent-only Helm chart at `portainer/portainer-agent`, but Portainer's published chart repository only exposes the `portainer` chart. I removed that unsupported Helm example and replaced it with Portainer's documented version-matched agent workflow from the UI.
- The Autopilot subsection used an unsupported Helm value path. I replaced it with a note that reflects Portainer's current Deployment-based Kubernetes agent manifest, which is a better fit for Autopilot than older DaemonSet-style examples.
- The private-cluster section overstated that private GKE clusters do not have a public API endpoint. Current GKE docs describe configurable control-plane endpoints and authorized networks. I updated the wording so it correctly distinguishes clusters with an enabled external endpoint from clusters where the external endpoint is disabled.
- The conclusion described the requirement as a "static service account token". Portainer's actual requirement is a self-contained kubeconfig for import, so I updated the wording to reflect that more accurately.
- The Workload Identity note was vague about how GKE identity is configured. I rewrote it to refer specifically to Workload Identity Federation for GKE and the binding between Kubernetes and IAM service accounts.

## Review Notes
- Portainer currently documents both kubeconfig import and the Kubernetes agent as legacy connection methods and recommends the Edge Agent for many scenarios.
- Portainer also documents that agent versions should match the Portainer Server version, which is why the hardcoded manifest example was removed in favor of the generated command flow.
- `kubectl create token` issues a time-limited token by default. That is acceptable for the documented import flow because Portainer uses the kubeconfig to connect and deploy/configure the agent, but long-lived credential handling should be reviewed separately if a different operational model is used.
