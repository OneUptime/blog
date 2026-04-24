# Validation Summary: How to Debug Kubernetes Service Connectivity Issues in Portainer - K8s

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Services
- EndpointSlices
- CoreDNS
- kube-proxy
- NetworkPolicy
- `kubectl`

## Sources Consulted
- Portainer Services documentation: https://docs.portainer.io/2.27/user/kubernetes/networking/services
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer CE API spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Debug Services: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes DNS debugging: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Using CoreDNS for Service Discovery: https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Portainer navigation path was imprecise. I changed `Kubernetes > Services` to `Networking > Services` to match Portainer's documented UI.
- The selector-fix example advised patching Deployment labels. That can be incorrect because Deployment selectors are immutable after creation and pod-template labels must stay aligned with the selector. I replaced it with a Service selector patch example that matches the described mismatch.
- The post used the legacy `Endpoints` resource as the primary backing-endpoint check. Kubernetes now recommends `EndpointSlice`, and the `Endpoints` API is deprecated. I updated the commands to use `endpointslices` with the service-name label.
- The debug-pod example omitted `--command`, which can cause `bash` to be passed as container arguments instead of the command. I changed it to `--command -- bash`.
- The ClusterIP connectivity example was presented like a fixed value. I clarified that readers must substitute the actual ClusterIP assigned to their Service.
- The NodePort firewall note implied a fixed universal workflow. I clarified that `30000-32767` is the default NodePort range and that the `iptables` command is specifically for iptables-based nodes.
- The Portainer API example used a Kubernetes API proxy path that was not backed by Portainer's documented Kubernetes endpoints. I replaced it with Portainer's documented `/api/kubernetes/{id}/namespaces/{namespace}/services` endpoint and updated the parsing logic to match Portainer's `K8sServiceInfo` schema.
- Two wording claims were too strong for the documentation cited: Portainer "services and their endpoints" and debug pods "deployed via Portainer". I narrowed both statements to what the docs and the post content support.

## Review Notes
- The post assumes the common cluster DNS suffix `cluster.local`; Kubernetes allows different cluster domains, so readers may need to substitute their cluster's actual suffix.
- `kube-proxy` checks are cluster-dependent. Kubernetes documents kube-proxy as the default service proxy, but some environments replace it with an alternative dataplane.
- The CoreDNS label selector `k8s-app=kube-dns` remains valid per Kubernetes DNS debugging documentation, even when the DNS pods are CoreDNS pods.
