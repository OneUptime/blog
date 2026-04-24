# Validation Summary: How to View Kubernetes Cluster Details in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- kubeadm
- Helm
- Prometheus
- Grafana

## Sources Consulted
- Portainer Kubernetes Dashboard: https://docs.portainer.io/user/kubernetes/dashboard
- Portainer Kubernetes Cluster Details: https://docs.portainer.io/sts/user/kubernetes/cluster/details
- Portainer Inspect a Node: https://docs.portainer.io/sts/user/kubernetes/cluster/node
- Portainer Cluster Setup: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer Kubernetes Volumes: https://docs.portainer.io/2.33-lts/user/kubernetes/volumes
- Kubernetes kubectl command reference (`version`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl top / top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes Certificate Management with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes kubeadm certs reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs
- Helm install reference: https://helm.sh/docs/v3/helm/helm_install/

## Issues Found
- The Portainer dashboard summary in the post was inaccurate. Current Portainer docs show dashboard tiles for namespaces, applications, services, ingresses, ConfigMaps, secrets, volumes, and policies, so the example was updated to match the documented UI.
- The node navigation path was incorrect. The post said `Cluster → Nodes`, but current Portainer docs show node access under `Cluster → Details`, so that path was corrected.
- The node detail description said Portainer shows pods running on the node. Current Portainer node docs describe an applications/workloads view on the node details page, so this was updated to `Applications running on the node`.
- The resource usage example used `kubectl top nodes`. The current documented subcommand is `kubectl top node`, so the command was updated and annotated to note the Metrics Server requirement.
- The version-information section implied that generic Portainer cluster details show Kubernetes version, platform, and container runtime. Current Portainer docs only document kubelet version in node details for generic clusters, with cluster version management limited to Portainer-provisioned Omni or MicroK8s clusters. That section was rewritten to reflect the documented behavior.
- The event example used `kubectl get events --sort-by='.lastTimestamp'`, which relies on deprecated event timestamp fields. It was replaced with the current `kubectl events` command and the documented `--types=Warning` filter.
- The Portainer events guidance was too broad. Rather than claiming namespace-level event views for workloads, the post now points readers to the documented `Events` tabs on application or node detail pages.
- The storage-class navigation in Portainer was incorrect. Current docs place storage classes under `Volumes` on the `Storage` tab, so the UI guidance was corrected.
- The control-plane health section used deprecated checks: `kubectl get componentstatuses` and `/healthz`. These were replaced with the current `/readyz?verbose` and `/livez?verbose` endpoint checks.
- The certificate-expiry sample output used stale historical dates. The example dates were refreshed so the sample is no longer visibly outdated.

## Review Notes
- `kubectl top` and Portainer CPU or memory usage graphs depend on a working metrics pipeline. In practice this means Metrics Server for `kubectl top`, and Portainer's metrics API features enabled with Metrics Server or Prometheus available.
- `kubeadm certs check-expiration` only applies to kubeadm-managed control planes.
- The Helm install example for `prometheus-community/kube-prometheus-stack` is syntactically valid as written. Adding `helm repo update` is optional but not required for correctness immediately after `helm repo add`.
