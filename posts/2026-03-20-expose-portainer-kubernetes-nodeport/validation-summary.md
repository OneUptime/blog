# Validation Summary: How to Expose Portainer on Kubernetes via NodePort

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Kubernetes Services
- Kubernetes NodePort
- Helm
- kubectl
- iptables

## Sources Consulted
- Portainer Helm chart configuration options: https://docs.portainer.io/advanced/helm-chart-configuration-options
- Install Portainer on Kubernetes: https://docs.portainer.io/start/install-ce/server/kubernetes/baremetal
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer official chart values: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer official chart service template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/service.yaml
- Portainer official chart deployment template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/deployment.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Helm example used `service.nodePort`, which is not a current Portainer chart value. I changed it to `service.httpNodePort` and kept `service.httpsNodePort` to match the current chart.
- The Helm example assumed the Portainer Helm repository already existed. I added `helm repo add` and `helm repo update` so the command works as shown on a clean system.
- The inline manifest example was not self-contained for a supported Portainer-on-Kubernetes installation. It omitted the namespace, persistence, and RBAC resources Portainer's official manifest provides, used `portainer/portainer-ce:latest`, and exposed a non-standard Edge NodePort. I replaced it with Portainer's current official NodePort manifest download and apply flow.
- The NodePort range statement was too absolute. I changed it to the documented default range because Kubernetes can be configured with a different `--service-node-port-range`.
- The access and firewall examples did not reflect the current Portainer NodePort ports clearly enough. I updated the access example to show both HTTPS `30779` and HTTP `30777`, and updated the firewall example to cover the exposed Portainer NodePorts.

## Review Notes
- `ce-lts` tracks Portainer's current LTS manifest, so the exact Portainer version it installs can change over time.
- NodePort exposure can still be limited by cluster networking or kube-proxy `nodePortAddresses` settings even when the Service is configured correctly.
