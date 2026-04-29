# Validation Summary: How to Migrate Away from Deprecated Portainer Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- HashiCorp Nomad
- Kubernetes
- Kompose
- IPMI / BMC / Redfish
- Amazon EKS / `eksctl` / AWS CLI
- Azure Kubernetes Service / Azure CLI
- Google Kubernetes Engine / Google Cloud CLI

## Sources Consulted
- Portainer deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer OpenAMT docs: https://docs.portainer.io/user/home/openamt
- Portainer KaaS provisioning docs: https://docs.portainer.io/admin/environments/add/kaas
- Portainer Nomad removal docs: https://docs.portainer.io/user/nomad and https://docs.portainer.io/2.33-lts/start/upgrade/nomad
- Portainer Kubernetes environment docs: https://docs.portainer.io/admin/environments/add/kubernetes and https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer Kubernetes manifest docs: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Nomad UI and CLI docs: https://developer.hashicorp.com/nomad/api-docs/ui, https://developer.hashicorp.com/nomad/commands/job/run, https://developer.hashicorp.com/nomad/docs/commands/alloc/logs, https://developer.hashicorp.com/nomad/commands/job/stop
- Kubernetes / Kompose docs: https://kubernetes.io/docs/tasks/configure-pod-container/translate-compose-kubernetes/ and https://kompose.io/user-guide/
- Redfish spec: https://redfish.dmtf.org/schemas/DSP0266_1.16.0.html and https://redfish.dmtf.org/schemas/v1/DSP0268_2025.3.html
- Amazon EKS / eksctl docs: https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html and https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- Azure AKS docs: https://learn.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-cli and https://learn.microsoft.com/en-us/cli/azure/aks
- GKE docs: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/creating-a-regional-cluster and https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials

## Issues Found
- The inventory table incorrectly treated OpenAMT and KaaS as removed features. I changed the section to distinguish deprecated vs removed states and corrected the version data to match current Portainer documentation.
- The OpenAMT migration section described `ipmitool ... sol activate` as a KVM console. That command starts a Serial-over-LAN session, so I corrected the wording and added the JSON content type header to the Redfish reset example.
- The Nomad section heading implied a migration away from Nomad itself rather than away from Portainer's removed Nomad support. I corrected the heading to reflect the actual migration path.
- The Kompose section used an inaccurate deployment path in Portainer and a Deployment snippet with the wrong field nesting. I updated the Portainer UI path to the documented manifest workflow and corrected the YAML excerpt to use `spec.template.spec.containers`.
- The post-upgrade connection instructions for Kubernetes were inaccurate. I replaced the incorrect kubeconfig paste flow and wrong Portainer UI path with the documented Kubernetes Agent workflow and corrected the provider CLI commands.
- The pre-upgrade checklist referred only to major-version upgrades, but the affected Portainer features were deprecated or removed in minor releases such as `2.17` and `2.20`. I updated the wording accordingly.
- The AWS example used `us-east-1`, which the eksctl docs call out as a region that can require extra AZ handling in simple examples. I changed the example to `us-west-2` for a safer default.

## Review Notes
- Portainer's kubeconfig import path is a legacy Business Edition feature; current Portainer docs recommend Agent or Edge Agent in many cases.
- OpenAMT and KaaS are still marked as deprecated with removal `TBD` in current Portainer docs, so this post should be revisited if future Portainer releases publish explicit removal versions.
- The Redfish `Systems/1` path is a standards-based example; actual system identifiers can vary by vendor implementation.
