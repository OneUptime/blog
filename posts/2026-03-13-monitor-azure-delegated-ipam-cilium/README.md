# Monitor Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Azure, IPAM, AKS, Networking, Monitoring, IP Management

Description: Learn how to monitor IP address allocation, pool utilization, and IPAM health in AKS clusters using Azure Delegated IPAM with Cilium for efficient IP management and observability.

---

## Introduction

Azure Delegated IPAM is an IP address management mode available with Azure CNI Powered by Cilium where Cilium manages pod IP allocation directly from delegated subnets rather than the traditional Azure CNI per-node pre-allocation model. This significantly improves IP efficiency by allocating addresses on demand and returning them when pods are deleted.

Monitoring Azure Delegated IPAM with Cilium requires tracking IP allocation from delegated subnets, monitoring for IP exhaustion across availability zones, and ensuring that Cilium's IPAM controller is healthy and responding to pod lifecycle events. Failures in delegated IPAM can cause pod scheduling failures and network connectivity issues.

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
cilium config view | grep -E "ipam|azure-subnet-id"

# Check the Cilium IPAM status
kubectl exec -n kube-system -it $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium ipam list

# View current IP allocation from delegated subnets
kubectl get ciliumnodes -o yaml | grep -A10 "ipam:"
```

## Step 2: Monitor IP Pool Utilization

Track how many IPs from delegated subnets are in use versus available.

Query Cilium node IPAM allocation status across all nodes:

```bash
# List all CiliumNodes and their IP allocation status
kubectl get ciliumnodes -o custom-columns=\
NAME:.metadata.name,\
USED:.spec.ipam.podCIDRs,\
AVAILABLE:.status.ipam.available

# Check Azure subnet remaining IPs via Azure CLI
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name podSubnet \
  --query "{available: ipConfigurations | length(@), total: addressPrefix}" \
  --output table
```

Monitor IPAM allocation metrics using Prometheus queries:

```bash
# Port-forward to Prometheus for IPAM metric queries
kubectl port-forward svc/prometheus -n monitoring 9090:9090 &

# Key IPAM metrics to monitor:
# cilium_ipam_ips_total{type="available"} - available IPs per node
# cilium_ipam_ips_total{type="used"} - used IPs per node
# cilium_ipam_allocation_failures_total - IPAM allocation failures
```

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
    - alert: CiliumIPAMPoolNearExhaustion
      expr: |
        (cilium_ipam_ips_total{type="available"} / 
         (cilium_ipam_ips_total{type="available"} + cilium_ipam_ips_total{type="used"})) < 0.15
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Cilium IPAM pool on {{ $labels.node }} is below 15% available IPs"
    - alert: CiliumIPAMAllocationFailures
      expr: rate(cilium_ipam_allocation_failures_total[5m]) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Cilium IPAM allocation failures detected on {{ $labels.node }}"
```

Apply the alert rules:

```bash
kubectl apply -f ipam-alert-rules.yaml
```

## Step 4: Monitor Delegated Subnet Health in Azure

Track the delegated subnet's IP usage at the Azure network layer.

Use Azure CLI to monitor subnet delegation health and IP consumption:

```bash
# Check current IP allocations in the delegated pod subnet
az network nic list \
  --resource-group myNodeResourceGroup \
  --query "[].ipConfigurations[].{ip: privateIpAddress, subnet: subnet.id}" \
  --output table

# Monitor pod subnet address space utilization
az network vnet subnet list \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --query "[].{name: name, prefix: addressPrefix, delegations: delegations[].serviceName}" \
  --output table

# Check if the subnet delegation to Cilium is correctly configured
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
- Enable Azure IPAM metrics in Cilium and create dashboards for per-subnet utilization
- Set up OneUptime monitors on pod scheduling times as an indirect IPAM health indicator
- Regularly review Azure subnet utilization reports to plan CIDR expansion before exhaustion

## Conclusion

Monitoring Azure Delegated IPAM with Cilium requires visibility at both the Cilium IPAM layer and the Azure subnet layer. By combining Cilium's built-in IPAM metrics with Azure network monitoring and proactive alerts for IP exhaustion, you can ensure reliable pod scheduling and prevent IP availability outages. Integrate with OneUptime to monitor pod startup times as a business-level indicator of IPAM health in your AKS clusters.
