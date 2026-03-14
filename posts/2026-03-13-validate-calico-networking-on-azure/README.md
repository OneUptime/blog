# Validate Calico Networking on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Azure, Cloud, Validation

Description: How to validate Calico networking on Azure self-managed Kubernetes clusters, including IP forwarding verification, pod connectivity tests, and NSG rule validation.

---

## Introduction

Validating Calico networking on Azure has Azure-specific steps that go beyond standard Calico validation. Azure VNet constraints require explicit IP Forwarding settings on VM NICs, and NSG rules must allow VXLAN traffic between nodes. Without validating these Azure-level settings, pod communication failures may be incorrectly attributed to Calico misconfigurations when the root cause is Azure platform settings.

A complete validation covers: Azure VM NIC settings, NSG rules, Calico component health, IPAM allocation, and end-to-end pod connectivity across different subnets.

## Prerequisites

- Calico installed on Azure self-managed Kubernetes
- Azure CLI authenticated with VM and network read access
- `kubectl` and `calicoctl` with cluster admin access

## Step 1: Verify Azure IP Forwarding

```bash
# Check IP Forwarding status on all worker VM NICs
for vm in $(kubectl get nodes -o name | cut -d/ -f2); do
  NIC_ID=$(az vm show -g k8s-rg -n $vm \
    --query "networkProfile.networkInterfaces[0].id" -o tsv 2>/dev/null)

  if [ -n "$NIC_ID" ]; then
    IP_FWD=$(az network nic show --ids $NIC_ID \
      --query "enableIPForwarding" -o tsv)
    echo "$vm: IP Forwarding = $IP_FWD"
    # Should be: true
  fi
done
```

## Step 2: Verify NSG Rules Allow VXLAN

```bash
# Check for VXLAN rule in the worker NSG
az network nsg rule list \
  --resource-group k8s-rg \
  --nsg-name k8s-workers-nsg \
  --query "[?destinationPortRange=='4789' || contains(destinationPortRanges, '4789')]" \
  --output table
```

Expected output should show an Allow rule for UDP 4789.

## Step 3: Verify Calico Component Health

```bash
kubectl get pods -n calico-system
kubectl get pods -n tigera-operator

# Check for any CrashLoopBackOff
kubectl describe pods -n calico-system | grep -A5 "State:"
```

## Step 4: Verify IPAM Block Assignments

```bash
calicoctl ipam show --show-blocks
# Each node should have at least one /24 block assigned
```

## Step 5: Test Pod-to-Pod Connectivity

```bash
# Deploy test pods on different nodes
kubectl run test-pod-1 --image=busybox \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600 &
kubectl run test-pod-2 --image=busybox \
  --overrides='{"spec":{"nodeName":"worker-2"}}' -- sleep 3600 &

sleep 10

POD_2_IP=$(kubectl get pod test-pod-2 -o jsonpath='{.status.podIP}')

# Test connectivity
kubectl exec test-pod-1 -- ping -c 5 $POD_2_IP
```

```mermaid
graph LR
    A[test-pod-1<br/>Node: worker-1] -->|VXLAN| B[test-pod-2<br/>Node: worker-2]
    B --> C{Ping succeeds?}
    C -->|Yes| D[Networking OK]
    C -->|No| E[Check IP Forwarding / NSG]
```

## Step 6: Validate Service Connectivity

```bash
# Deploy a service and test access from a pod
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80

kubectl exec test-pod-1 -- wget -qO- nginx.default.svc.cluster.local
# Should return nginx HTML
```

## Step 7: Validate External Traffic (NAT)

```bash
# Test outbound internet access from a pod
kubectl exec test-pod-1 -- wget -qO- https://ifconfig.me
# Should return the external IP of the NAT gateway / load balancer
```

## Cleanup

```bash
kubectl delete pod test-pod-1 test-pod-2
kubectl delete deployment nginx
kubectl delete service nginx
```

## Conclusion

Validating Calico on Azure is a multi-layer process: verify Azure-level settings (IP Forwarding, NSG rules), confirm Calico components are healthy, check IPAM block assignments, and run end-to-end connectivity tests across nodes. Azure-specific validation is critical because IP Forwarding is disabled by default and VXLAN traffic is not allowed in default NSG configurations - both of which silently break Calico pod networking.
