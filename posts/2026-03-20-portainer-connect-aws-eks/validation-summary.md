# Validation Summary: How to Connect Portainer to an AWS EKS Cluster - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Amazon EKS
- Kubernetes
- AWS CLI
- `kubectl`
- Kubernetes RBAC
- Portainer API

## Sources Consulted
- Portainer Docs: Import an existing Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer Docs: Install Portainer Agent on your Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer Docs: Add an environment via the Portainer API — https://docs.portainer.io/admin/environments/add/api
- Portainer API docs (BE 2.39.1) — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer API docs (CE 2.39.1) — https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Amazon EKS User Guide: Connect `kubectl` to an EKS cluster by creating a kubeconfig file — https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- Amazon EKS User Guide: Grant Kubernetes workloads access to AWS using Kubernetes Service Accounts — https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html
- Amazon EKS User Guide: Cluster API server endpoint — https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Kubernetes Docs: `kubectl create token` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes Docs: `kubeconfig` (v1) — https://kubernetes.io/docs/reference/config-api/kubeconfig.v1

## Issues Found
- The post treated kubeconfig import as a normal alternative to the agent flow. I corrected it to match current Portainer docs: kubeconfig import is a legacy Portainer Business Edition workflow, it requires load balancer support, and Portainer uses the kubeconfig to deploy and configure the Portainer Agent.
- The UI instructions said to paste the kubeconfig into Portainer. I corrected this to upload the kubeconfig file through the documented import flow.
- The API example used an undocumented Kubernetes import endpoint. I replaced it with a note explaining that Portainer's current official API docs do not document a supported kubeconfig-based Kubernetes import workflow.
- The agent section used an agent-only Helm installation that is not how current Portainer docs document this workflow. I replaced it with the documented manifest-driven workflow from the Portainer UI and corrected the connection details to use port `9001` for load balancer or `30778` for NodePort, without a protocol prefix.
- The post requested a one-year service account token with `kubectl create token --duration=8760h`. I removed that guidance because EKS service account tokens are time-bound; the kubeconfig should be generated immediately before import.
- The IAM explanation described Portainer as needing a "static token". I corrected this to explain that Portainer import needs a self-contained kubeconfig with embedded credentials, while the standard EKS kubeconfig uses an `exec` authentication plugin.

## Review Notes
- Portainer's current docs recommend the Edge Agent for most new Kubernetes environment imports; this post remains focused on the kubeconfig import and agent workflows already covered by the author.
- The reviewed Portainer documentation was current around Portainer 2.39.x, and the AWS/Kubernetes references used were current as of 2026-04-24.
