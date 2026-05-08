# Validation Summary: How to Tune Calico on AKS for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Azure Kubernetes Service (AKS)
- Kubernetes NetworkPolicy
- Calico FelixConfiguration
- kubectl
- calicoctl
- Azure Monitor managed Prometheus

## Sources Consulted
- Calico Open Source documentation: Microsoft Azure Kubernetes Service (AKS) - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Calico Open Source documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source v3.32 FelixConfiguration CRD schema - https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
- Microsoft Learn: Secure traffic between pods with network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Customize collection of Prometheus metrics from your Kubernetes cluster using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Microsoft Learn: Create custom Prometheus scrape job from your Kubernetes cluster using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configmap
- Azure prometheus-collector sample ama-metrics settings ConfigMap - https://raw.githubusercontent.com/Azure/prometheus-collector/main/otelcollector/configmaps/ama-metrics-settings-configmap.yaml

## Issues Found
- The Azure Monitor ConfigMap used `schema-version: v1` and `default-targets-metrics-keep-list` with a `felix` target. Current Azure Monitor managed Prometheus uses schema v2 for default target settings, and Felix is not a default target. I changed the example to use the supported `ama-metrics-prometheus-config` custom scrape ConfigMap with a `prometheus-config` key, Kubernetes pod discovery, and metric relabeling for the two Felix metrics named in the post.
- The high-scale FelixConfiguration example used `iptablesLockFilePath` and `iptablesLockTimeout`. These fields are not present in the current Calico v3.32 FelixConfiguration CRD schema, and Calico documentation describes the timeout behavior as deprecated in newer iptables environments. I removed those fields and added `ipsetsRefreshInterval`, which is a valid FelixConfiguration field for ipsets refresh tuning.
- The verification command used `calicoctl get felixconfiguration`. Calico documentation commonly uses the `felixconfig` resource alias for this command. I changed it to `calicoctl get felixconfig default -o yaml`.

## Review Notes
AKS still documents Calico as an available network policy engine, but Microsoft recommends Cilium for new AKS network policy deployments. The post remains technically relevant for existing AKS clusters using Calico, especially where Calico is used only for Azure CNI policy enforcement.
