# Validation Summary: How to Migrate from Kubernetes Dashboard to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes Dashboard
- Portainer Community Edition
- Helm
- kubectl

## Sources Consulted
- Kubernetes documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Helm CLI documentation: https://helm.sh/docs/helm/helm_uninstall/
- Portainer CE install on Kubernetes: https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer Kubernetes agent installation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer add Kubernetes environment: https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer add local environment: https://docs.portainer.io/admin/environments/add/local
- Portainer create an application from a Manifest: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer create an application from a Helm chart: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer Kubernetes roles and bindings: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings

## Issues Found
- The opening description understated Kubernetes Dashboard capabilities and did not reflect its current status. I updated it to note that Kubernetes Dashboard is deprecated and unmaintained, while avoiding the incorrect claim that it offers little control.
- The feature table mixed Kubernetes-specific behavior with Portainer-wide features and incorrectly implied that Helm support was Business Edition-only. I replaced the inaccurate rows with current, documented capabilities and clarified the CE versus BE access-control split.
- The Dashboard removal step used an outdated manifest-based uninstall path tied to `v2.7.0`. Current Dashboard releases are Helm-installed, so I changed the command to `helm uninstall kubernetes-dashboard -n kubernetes-dashboard`.
- The Portainer manifest URLs used the old `ce2-21` path. I updated them to the current `ce-lts` download URLs used in Portainer's documentation.
- The Portainer agent step was written as a mandatory part of the flow even though it is only needed when the Portainer server runs elsewhere. I made Step 2 conditional and clarified that Step 3 is the in-cluster alternative.
- The Portainer server step unnecessarily created the `portainer` namespace even though the official manifest already defines it. I removed the extra namespace-creation command and added the documented default-StorageClass prerequisite.
- The cluster connection step retrieved only a load balancer IP, omitted the required port, and used outdated UI navigation. I changed it to inspect the `portainer-agent` service, then updated the UI steps to the current Kubernetes environment wizard and the documented `Environment URL` format without a protocol prefix.
- The workload recreation step incorrectly described Kubernetes manifests as Portainer "Stacks" and pointed readers to `Stacks > Add Stack`. I corrected this to Portainer's current Kubernetes flow: `Applications > Create from code` with a Manifest deployment.
- The access-control section implied CE provided Business Edition roles such as `Operator` and `Helpdesk`. I corrected it to reflect that CE provides `Admin` and `User` roles on Kubernetes, while the more granular roles are BE-only.
- The summary repeated the incorrect "stack deployments" claim. I updated it to describe manifest and Helm-based application deployment instead.

## Review Notes
- Portainer's documentation currently describes the classic Kubernetes agent as a supported option, but also notes it is a legacy choice and recommends the Edge Agent for most new deployments.
- The Portainer Kubernetes server install requires persistent storage via a default `StorageClass`; clusters without one may fail the server deployment even with the corrected commands.
- The statement that the local environment is available after an in-cluster Portainer server install is an inference from Portainer's documented local-environment behavior and installation flow.
