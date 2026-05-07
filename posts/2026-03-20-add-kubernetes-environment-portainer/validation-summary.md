# Validation Summary: How to Add a Kubernetes Environment to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Portainer API
- kubeconfig
- `curl`
- `kubectl`
- Python 3

## Sources Consulted
- Portainer Documentation: Add a Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer Documentation: Install Portainer Agent on your Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer Documentation: Import an existing Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer Documentation: Add an environment via the Portainer API — https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation: API documentation — https://docs.portainer.io/api/docs
- Portainer source: `api/http/handler/endpoints/endpoint_create.go` — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: `app/react/portainer/environments/environment.service/create.ts` — https://raw.githubusercontent.com/portainer/portainer/develop/app/react/portainer/environments/environment.service/create.ts
- Portainer source: `app/react/portainer/environments/types.ts` — https://raw.githubusercontent.com/portainer/portainer/develop/app/react/portainer/environments/types.ts
- Kubernetes Documentation: Organizing Cluster Access Using kubeconfig Files — https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/

## Issues Found
- The original API example did not create a Kubernetes environment. It sent JSON to `POST /api/endpoints` with `EndpointCreationType: 1` and `unix:///var/run/docker.sock`, which is a local Docker environment. Portainer's documented create-environment API examples cover Docker environments, so the section was corrected to use the API only for authentication and verification after adding the Kubernetes environment through the UI.
- The original UI and prerequisites sections were too generic for a Kubernetes-specific post. They were updated to reflect Portainer's documented Kubernetes workflow: select **Kubernetes**, click **Start Wizard**, choose **Edge Agent**, **Agent**, or **Import**, and satisfy the documented kubeconfig import requirements.
- The environment type table was incorrect. It claimed Kubernetes was type `7` for both agent and kubeconfig flows. Portainer's current environment type definitions are `5` for local Kubernetes, `6` for Agent on Kubernetes, and `7` for Edge Agent on Kubernetes.
- The connection verification snippet treated every status other than `1` as offline. Portainer's status enum distinguishes `Up`, `Down`, `Provisioning`, and `Error`, so the snippet was updated accordingly.

## Review Notes
- Kubeconfig import is a legacy option and is only available in Portainer Business Edition.
- Portainer's Kubernetes documentation recommends the Edge Agent for most new deployments; the Agent and kubeconfig import paths remain available but are documented as legacy options.
- Portainer's published API examples for creating environments currently document Docker environment creation, not a full Kubernetes import workflow.
