# Monitor Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Learn how to monitor IP address allocation, pool utilization, and IPAM health in AKS clusters using Azure Delegated IPAM with Cilium for efficient IP management and observability.

---

## Introduction

Azure Delegated IPAM is an IP address management mode available with Azure CNI Powered by Cilium where the delegated IPAM plugin manages pod IP allocation from Azure pod subnets rather than the traditional Azure CNI per-node pre-allocation model. This significantly improves IP efficiency by allocating addresses in batches as nodes need them and returning them when pods are deleted.

Monitoring Azure Delegated IPAM with Cilium requires tracking IP allocation from delegated pod subnets, monitoring for IP exhaustion across node pools and zones, and ensuring that the delegated IPAM path is healthy and responding to pod lifecycle events. Failures in delegated IPAM can cause pod scheduling failures and network connectivity issues.

This guide covers monitoring tools and techniques for Azure Delegated IPAM with Cilium, including Cilium IPAM metrics, Azure subnet utilization, and alerting strategies for IP exhaustion.

## Prerequisites

- AKS cluster with Azure CNI Powered by Cilium and Delegated Subnet for Pods enabled
- `kubectl` configured for the cluster
- `cilium` CLI v0.15+ installed
- `az` CLI authenticated with network monitoring permissions
- Prometheus/Grafana for metrics visualization (optional)

## Step 1: Verify Delegated IPAM Configuration

Confirm that Cilium is operating in Azure delegated IPAM mode.

Check Cilium's IPAM mode and delegation configuration:

```bash
# Verify Cilium is using Azure delegated IPAM

cilium config view | grep -E "ipam|local-router-ipv4"

# Check the Cilium agent IPAM status
kubectl exec -n kube-system ds/cilium -- cilium-dbg status --all-addresses

# View the AKS NodeNetworkConfig resources that back delegated IP allocation
kubectl get nodenetworkconfigs -n kube-system -o wide
kubectl get nodenetworkconfigs -n kube-system -o yaml | grep -A20 "networkContainers:"
```

## Step 2: Monitor IP Pool Utilization

Track how many IPs from delegated subnets are in use versus available.

Query Cilium node IPAM allocation status across all nodes:

```bash
# List AKS NodeNetworkConfig allocation status
kubectl get nodenetworkconfigs -n kube-system -o wide

# Check Azure subnet prefixes and the number of attached IP configurations via Azure CLI
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name podSubnet \
  --query "{usedIpConfigurations: ipConfigurations | length(@), prefixes: addressPrefixes || [addressPrefix], delegations: delegations[].serviceName}" \
  --output table
```

Monitor IPAM allocation metrics using Prometheus queries:

```bash
# Port-forward to Prometheus for IPAM metric queries
kubectl port-forward svc/prometheus -n monitoring 9090:9090 &

# Key Cilium operator IPAM metrics to monitor when they are exposed:
# cilium_operator_ipam_available_ips - available IPs per target node
# cilium_operator_ipam_used_ips - used IPs per target node
# cilium_operator_ipam_needed_ips - IPs needed to satisfy node allocation
# cilium_operator_ipam_nodes{category="at-capacity"} - nodes unable to allocate more IPs
```

For AKS-managed delegated IPAM, also enable Azure CNI subnet usage monitoring with Container Insights by setting `azure_subnet_ip_usage.enabled` to `true` in the Container Insights agent configuration. Azure's Subnet IP Usage workbook is the authoritative view for pod subnet utilization.

## Step 3: Set Up IPAM Alerts

Configure alerts for IP exhaustion and IPAM failures.

Create Prometheus alerting rules for delegated IPAM health:

```yaml
# ipam-alert-rules.yaml - Prometheus alerts for Cilium delegated IPAM
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ipam-alerts
  namespace: monitoring
spec:
  groups:
  - name: cilium-ipam
    interval: 30s
    rules:
    - alert: CiliumIPAMNodeAtCapacity
      expr: |
        cilium_operator_ipam_nodes{category="at-capacity"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Cilium operator reports one or more IPAM nodes at capacity"
    - alert: CiliumIPAMNeedsIPs
      expr: cilium_operator_ipam_needed_ips > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Cilium IPAM needs additional IPs for {{ $labels.target_node }}"
```

Apply the alert rules:

```bash
kubectl apply -f ipam-alert-rules.yaml
```

These Prometheus rules require the Cilium operator IPAM metrics to be scraped. If those metrics are not present in your managed AKS environment, create the equivalent exhaustion alerts from Azure Monitor's Subnet IP Usage data instead.

## Step 4: Monitor Delegated Subnet Health in Azure

Track the delegated subnet's IP usage at the Azure network layer.

Use Azure CLI to monitor subnet delegation health and IP consumption:

```bash
# Check resources with IP configurations attached to the delegated pod subnet
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name podSubnet \
  --query "ipConfigurations[].id" \
  --output tsv

# Monitor pod subnet address space utilization
az network vnet subnet list \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --query "[].{name: name, prefixes: addressPrefixes || [addressPrefix], delegations: delegations[].serviceName, usedIpConfigurations: ipConfigurations | length(@)}" \
  --output table

# Check if the pod subnet delegation for AKS is correctly configured
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name podSubnet \
  --query "delegations[].serviceName" \
  --output tsv
```

## Step 5: Validate Pod Scheduling Under IP Pressure

Test that pods schedule correctly and IPAM handles allocation under load.

Scale up a deployment to test IPAM allocation responsiveness:

```bash
# Scale a deployment to exercise IPAM allocation
kubectl scale deployment test-app --replicas=20 -n default

# Watch pod creation and IP assignment speed
kubectl get pods -n default -w

# Check Cilium operator logs for IPAM activity
kubectl logs -n kube-system -l name=cilium-operator --tail=50 | grep -i ipam

# Verify all pods received IPs successfully
kubectl get pods -n default -o wide | grep -v "Running\|Completed"
```

## Best Practices

- Size delegated subnets with 2x the expected pod count to allow for rolling updates and bursting
- Use separate delegated subnets per node pool to isolate IP exhaustion blast radius
- Enable Azure CNI subnet usage monitoring in Container Insights and create dashboards for per-subnet utilization
- Set up OneUptime monitors on pod scheduling times as an indirect IPAM health indicator
- Regularly review Azure subnet utilization reports to plan CIDR expansion before exhaustion

## Conclusion

Monitoring Azure Delegated IPAM with Cilium requires visibility at both the Cilium IPAM layer and the Azure subnet layer. By combining exposed Cilium IPAM metrics, NodeNetworkConfig inspection, Azure subnet usage monitoring, and proactive alerts for IP exhaustion, you can ensure reliable pod scheduling and prevent IP availability outages. Integrate with OneUptime to monitor pod startup times as a business-level indicator of IPAM health in your AKS clusters.
