# Monitor Mixed Linux and Windows Networking with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Windows, Linux, Mixed OS, Kubernetes, Networking, Monitoring

Description: Learn how to monitor Calico networking in hybrid Linux/Windows Kubernetes clusters, including cross-OS pod connectivity, Windows-specific Calico metrics, and network policy enforcement across OS...

---

## Introduction

Kubernetes supports running Windows Server workloads alongside Linux workloads in the same cluster, and Calico provides CNI support for both platforms. However, Windows and Linux nodes use different networking stacks - Windows uses the Host Network Service (HNS) instead of Linux's netfilter/iptables - which means monitoring and troubleshooting Calico in a mixed-OS cluster requires understanding both networking models.

Calico on Windows operates through the calico-node Windows service, which uses HNS for network policy enforcement and Overlay (VXLAN) for pod-to-pod connectivity. Cross-OS connectivity between Windows and Linux pods is supported but requires careful network policy configuration, as some Calico features (such as eBPF mode) are Linux-only.

This guide covers monitoring Calico in a mixed Linux/Windows cluster, validating cross-OS pod connectivity, and identifying Windows-specific networking issues.

## Prerequisites

- Kubernetes cluster with both Linux and Windows Server 2019+ nodes
- Calico v3.23+ with Windows support installed
- `kubectl` with cluster-admin access
- `calicoctl` v3.27+ for Linux nodes
- Calico Windows node agent installed on Windows nodes
- Access to Windows nodes via PowerShell remoting or kubectl exec

## Step 1: Verify Calico is Running on Both OS Types

Confirm that Calico components are healthy on both Linux and Windows nodes.

Check Calico pod and service status across all nodes:

```bash
# List all nodes by OS type
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
OS:.status.nodeInfo.operatingSystem,\
ARCH:.status.nodeInfo.architecture

# Check calico-node pods running on Linux nodes
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o wide | grep -v Windows

# Check calico-node-windows pods on Windows nodes
kubectl get pods -n calico-system -l k8s-app=calico-node-windows \
  -o wide

# Verify all nodes have a calico-node pod running
kubectl get nodes -o name | while read node; do
  node_os=$(kubectl get $node \
    -o jsonpath='{.status.nodeInfo.operatingSystem}')
  echo "Node: $node | OS: $node_os"
done
```

## Step 2: Validate Cross-OS Pod Connectivity

Test connectivity between Linux and Windows pods to ensure the mixed-OS network is working.

Deploy test pods on both OS types and test cross-OS connectivity:

```bash
# Deploy a Linux test pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: linux-test
spec:
  nodeSelector:
    kubernetes.io/os: linux
  containers:
  - name: test
    image: curlimages/curl
    command: ["sleep", "3600"]
EOF

# Deploy a Windows test pod (requires Windows-compatible image)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: windows-test
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: test
    image: mcr.microsoft.com/windows/servercore:ltsc2019
    command: ["powershell", "-command", "Start-Sleep -Seconds 3600"]
EOF

# Get pod IPs
LINUX_IP=$(kubectl get pod linux-test -o jsonpath='{.status.podIP}')
WINDOWS_IP=$(kubectl get pod windows-test -o jsonpath='{.status.podIP}')

echo "Linux pod IP: $LINUX_IP"
echo "Windows pod IP: $WINDOWS_IP"

# Test Linux -> Windows connectivity
kubectl exec linux-test -- curl --connect-timeout 5 http://$WINDOWS_IP/

# Test Windows -> Linux connectivity (via PowerShell)
kubectl exec windows-test -- powershell -command \
  "Test-NetConnection -ComputerName $LINUX_IP -Port 80"
```

## Step 3: Monitor Windows-Specific Calico Metrics

Check Windows node Calico metrics which are collected differently from Linux.

Inspect Windows calico-node logs and metrics:

```bash
# View calico-node-windows pod logs for errors
kubectl logs -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node-windows \
    -o name | head -1) \
  --tail=50

# Check Windows HNS network configuration
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node-windows \
    -o name | head -1) \
  -- powershell -command "Get-HNSNetwork | Select Name, Type, Subnets"

# Check Windows pod endpoint configuration
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node-windows \
    -o name | head -1) \
  -- powershell -command "Get-HNSEndpoint | Select IPAddress, MacAddress, State"
```

## Step 4: Apply Cross-OS Network Policies

Create network policies that correctly target both Linux and Windows pods.

Define a network policy that works across both OS types:

```yaml
# cross-os-policy.yaml - network policy targeting both Linux and Windows pods
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-cross-os-communication
spec:
  # Target pods regardless of OS
  selector: "app == 'microservice'"
  order: 200
  types:
  - Ingress
  - Egress
  ingress:
  - action: Allow
    source:
      selector: "app == 'microservice'"  # Allows both Linux and Windows pods
  egress:
  - action: Allow
    destination:
      selector: "app == 'database'"
      ports:
      - 1433    # SQL Server (typically Windows)
      - 5432    # PostgreSQL (typically Linux)
```

Apply and verify the cross-OS policy:

```bash
calicoctl apply -f cross-os-policy.yaml
calicoctl get globalnetworkpolicies -o wide
```

## Step 5: Set Up Cross-OS Connectivity Monitoring

Create monitoring checks specifically for cross-OS service paths.

Configure monitoring for Windows-Linux service connectivity:

```yaml
# cross-os-monitor-cronjob.yaml - periodic cross-OS connectivity test
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cross-os-connectivity-test
  namespace: monitoring
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            kubernetes.io/os: linux   # Run test from Linux node
          containers:
          - name: test
            image: curlimages/curl
            command:
            - /bin/sh
            - -c
            - |
              # Test connectivity to Windows service
              if curl -sf --connect-timeout 5 http://windows-service.default:80/health; then
                echo "Cross-OS connectivity: OK"
              else
                echo "Cross-OS connectivity: FAILED" >&2
                exit 1
              fi
          restartPolicy: Never
```

Apply the cross-OS monitoring CronJob:

```bash
kubectl apply -f cross-os-monitor-cronjob.yaml
```

## Best Practices

- Use OS-specific node selectors in Calico IP pools if Windows and Linux pods need different CIDR ranges
- Test network policies on both Linux and Windows pods explicitly since enforcement mechanisms differ
- Monitor calico-node-windows pods separately as they use different metrics endpoints than Linux calico-node
- Keep Calico versions consistent between Linux and Windows nodes within the same cluster
- Configure OneUptime monitors for cross-OS service paths to catch connectivity regressions on either side

## Conclusion

Monitoring Calico in mixed Linux/Windows Kubernetes clusters requires understanding the different networking mechanisms on each OS and explicitly testing cross-OS connectivity. By validating Calico health on both Linux and Windows nodes, testing cross-OS pod connectivity, and applying policies that work across OS boundaries, you can maintain reliable mixed-OS cluster networking. Use OneUptime to monitor critical cross-OS service paths and alert quickly when Windows or Linux node issues affect application availability.
