# Validation Summary: How to Migrate from Kubernetes Dashboard to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Dashboard
- Kubernetes
- Portainer
- Portainer Business Edition
- Helm
- `kubectl`

## Sources Consulted
- Kubernetes documentation: Deploy and Access the Kubernetes Dashboard - https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Portainer documentation: Install Portainer CE on your Kubernetes environment - https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer documentation: Helm chart configuration options - https://docs.portainer.io/advanced/helm-chart-configuration-options
- Portainer documentation: Add a Kubernetes environment - https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer documentation: Import an existing Kubernetes environment - https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer documentation: Create an application from a Manifest - https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer documentation: Create an application from a Helm chart - https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer documentation: Kubernetes roles and bindings - https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer documentation: Roles - https://docs.portainer.io/sts/admin/user/roles
- Portainer documentation: Manage access to a namespace - https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer documentation: Services - https://docs.portainer.io/user/kubernetes/networking/services
- Portainer documentation: ConfigMaps & Secrets - https://docs.portainer.io/2.27/user/kubernetes/configurations
- Portainer documentation: Volumes - https://docs.portainer.io/sts/user/kubernetes/volumes
- Portainer documentation: Inspect a node - https://docs.portainer.io/user/kubernetes/cluster/details/node
- Portainer documentation: Inspect an application - https://docs.portainer.io/user/kubernetes/applications/inspect
- Helm documentation: `helm uninstall` - https://helm.sh/docs/helm/helm_uninstall/

## Issues Found
- The post described Kubernetes Dashboard as the default web UI. I corrected this to reflect current Kubernetes documentation: Dashboard is the official web UI, is not deployed by default, and is now deprecated and unmaintained.
- The limitations list included broad claims that were either outdated or not the clearest technically current framing. I replaced them with documented limitations such as deprecation status, Bearer Token-only login, lack of multi-cluster management, lack of built-in UI team management, and lack of Helm/Git-based deployment workflows.
- The Helm install examples used older `helm install` commands and an incorrect NodePort value key. I updated them to current Portainer Helm usage with `helm upgrade --install`, `service.httpsNodePort`, and `image.tag=lts`.
- The kubeconfig section used an unsupported or undocumented Portainer API example. I replaced it with the documented kubeconfig import workflow and the required `kubectl config view --flatten=true --minify=true` command.
- The kubeconfig import section did not mention current constraints. I added the documented caveats that kubeconfig import is a legacy feature, requires Portainer Business Edition, requires a load balancer, needs `current-context`, and needs cluster-admin credentials.
- Several Portainer UI path mappings were inaccurate or outdated. I corrected them to current menu names such as `Networking > Services`, `ConfigMaps & Secrets`, `Cluster > Details`, and the application YAML/logs/console views.
- The namespace access control section implied generic Portainer RBAC. I corrected this to Portainer Business Edition and aligned the navigation with the documented users, teams, and namespace access views.
- The RBAC migration section incorrectly implied Portainer can replace Kubernetes RBAC. I corrected this to state that Portainer layers its access model on top of Kubernetes RBAC and that Kubernetes RBAC must remain enabled.
- The Helm-in-Portainer workflow referenced outdated UI sections. I replaced it with the documented `Applications > Create from code > Helm chart` flow.
- The Dashboard removal section used an outdated manifest deletion example pinned to `v2.7.0`. I replaced it with the current Helm uninstall flow and clarified the namespace deletion verification behavior.
- The multi-cluster section listed overly broad cloud examples instead of the documented connection methods. I corrected it to Agent, Edge Agent, and kubeconfig import, with the appropriate legacy and edition caveats.

## Review Notes
- Kubernetes Dashboard is deprecated and unmaintained in the current official Kubernetes documentation, so this migration topic is still relevant but should be framed with that current status.
- Portainer advanced RBAC and kubeconfig import are Business Edition features; they are not generic to every Portainer installation.
- Portainer documents both Kubernetes Agent and kubeconfig import as legacy options for many cases, and recommends the Edge Agent for most new Kubernetes environment connections.
