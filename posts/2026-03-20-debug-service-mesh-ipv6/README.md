# How to Debug IPv6 Issues in Service Meshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, IPv6, Debugging, Istio, Linkerd, Envoy, Troubleshooting

Description: A guide to debugging IPv6 connectivity and configuration issues in service meshes, covering iptables inspection, proxy logs, traffic capture, and common failure modes.

IPv6 issues in service meshes often present as mysterious connection failures - traffic works on IPv4 but fails on IPv6, or services appear healthy but receive no IPv6 traffic. This guide provides systematic debugging approaches.

## Common IPv6 Service Mesh Failure Modes

1. **ip6tables rules missing** - Sidecar doesn't intercept IPv6 traffic
2. **Proxy binds only to IPv4** - Listener configured as `0.0.0.0`, not `::`
3. **DNS returns IPv4 only** - Pod DNS config missing AAAA record lookup
4. **Certificate SAN mismatch** - IPv6 address not in certificate
5. **Upstream cluster DNS resolution** - `dns_lookup_family` set to V4_ONLY

## Step 1: Verify Pod Has IPv6 Address

```bash
# Check the pod's IP addresses

kubectl get pod <pod-name> -o jsonpath='{.status.podIPs}'
# Should show: [{"ip":"10.0.0.5"},{"ip":"fd00::5"}]

# If only IPv4, the cluster may not be dual-stack
kubectl get node -o jsonpath='{.items[0].spec.podCIDRs}'

# Check the container's network interface
kubectl exec <pod-name> -c app -- ip -6 addr show
kubectl exec <pod-name> -c app -- ip -6 route show
```

## Step 2: Check Sidecar ip6tables Rules

```bash
# Istio - check ip6tables PREROUTING/OUTPUT rules
kubectl exec <pod-name> -c istio-proxy -- \
  ip6tables -t nat -L -n -v

# Expected output includes:
# Chain PREROUTING (policy ACCEPT)
# target     prot opt  source    destination
# ISTIO_INBOUND tcp   ::/0      ::/0

# If ip6tables is empty, check if ISTIO_DUAL_STACK is set
kubectl exec <pod-name> -c istio-proxy -- \
  env | grep -E "ISTIO_DUAL_STACK|INBOUND_INTERCEPTION"

# Force check: create a test IPv6 connection and trace
kubectl exec <pod-name> -c istio-proxy -- \
  ip6tables -t nat -L OUTPUT -n --line-numbers
```

## Step 3: Check Proxy Listener Bindings

```bash
# Istio/Envoy - check what Envoy is listening on
kubectl exec <pod-name> -c istio-proxy -- \
  ss -6 -tlnp

# Or via admin API
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET /listeners | python3 -m json.tool | \
  grep '"address"' | grep -v "0.0.0.0"

# Check for :: listener (IPv6 any)
kubectl exec <pod-name> -c istio-proxy -- \
  netstat -tlnp | grep :::

# Linkerd - check proxy listeners
kubectl exec <pod-name> -c linkerd-proxy -- \
  ss -6 -tlnp | grep LISTEN
```

## Step 4: Trace Traffic with Envoy Access Log

```bash
# Enable Envoy access logging for a pod (Istio)
kubectl annotate pod <pod-name> \
  "sidecar.istio.io/logLevel"="debug"

# Check access log (shows IPv6 source/destination)
kubectl logs <pod-name> -c istio-proxy | \
  grep -E "(\[|fd00|2001:)" | tail -20

# Increase Istio proxy log level temporarily
istioctl proxy-config log <pod-name> --level debug

# Get Envoy access log with IPv6 client address
kubectl logs <pod-name> -c istio-proxy 2>&1 | \
  grep "request\|response" | grep "::" | tail -10
```

## Step 5: Packet Capture for IPv6 Traffic

```bash
# Capture IPv6 traffic on a pod's network namespace
POD_NS=$(kubectl get pod <pod-name> -o jsonpath='{.metadata.namespace}')
NODE=$(kubectl get pod <pod-name> -o jsonpath='{.spec.nodeName}')

# Get container PID on the node
kubectl debug node/$NODE -it --profile=sysadmin --image=nicolaka/netshoot -- \
  chroot /host bash -c \
  "CONTAINER_ID=\$(crictl pods --name <pod-name> -q); \
   PID=\$(crictl inspectp \$CONTAINER_ID | python3 -m json.tool | grep '\"pid\"' | head -1 | awk '{print \$2}' | tr -d ','); \
   nsenter -n -t \$PID -- tcpdump -i any ip6 -n -c 50"

# Or use kubectl debug ephemeral container
kubectl debug -it <pod-name> --image=nicolaka/netshoot --target=app -- \
  tcpdump -i any ip6 -n
```

## Step 6: DNS Resolution Debugging

```bash
# Check if DNS returns AAAA records inside the pod
kubectl exec <pod-name> -c app -- \
  nslookup -type=AAAA my-service.default.svc.cluster.local

# Check /etc/resolv.conf in the pod
kubectl exec <pod-name> -c app -- cat /etc/resolv.conf

# Test direct DNS query to kube-dns/CoreDNS over IPv6
kubectl exec <pod-name> -c app -- \
  dig AAAA my-service.default.svc.cluster.local \
  @fd00::a   # CoreDNS service IPv6

# Check CoreDNS is listening on IPv6
kubectl get svc -n kube-system kube-dns \
  -o jsonpath='{.spec.clusterIPs}'
```

## Step 7: Test Direct IPv6 Connectivity

```bash
# Bypass the service mesh and test direct IPv6
kubectl exec <pod-name> -c app -- \
  curl -6 -v http://[fd00::backend-ip]:8080/

# If direct works but through mesh fails, the issue is in the sidecar/proxy

# Test connectivity to specific IPv6 endpoint
kubectl exec <pod-name> -c app -- \
  ping -6 -c 3 fd00::10

# Test service IPv6 ClusterIP directly
SVC_IPV6=$(kubectl get svc my-service -o jsonpath='{.spec.clusterIPs[1]}')
kubectl exec <pod-name> -c app -- curl -6 http://[$SVC_IPV6]/
```

## Common Fixes

```bash
# Fix 1: Enable ISTIO_DUAL_STACK in Istio
kubectl patch configmap istio -n istio-system --type=merge -p \
  '{"data":{"mesh":"defaultConfig:\n  proxyMetadata:\n    ISTIO_DUAL_STACK: \"true\""}}'

# Fix 2: Restart pods to pick up new proxy config
kubectl rollout restart deployment my-app

# Fix 3: Fix Envoy cluster dns_lookup_family
# Update ServiceEntry or DestinationRule to use V6_ONLY or ALL

# Fix 4: Ensure ICMPv6 is not blocked by network policies
kubectl get networkpolicy -A
# NetworkPolicy may need to allow ICMPv6 type 135/136 (NDP)

# Fix 5: Check node-level ip6tables
kubectl debug node/<node-name> -it --profile=sysadmin --image=nicolaka/netshoot -- \
  chroot /host ip6tables -L FORWARD -n
```

Debugging IPv6 in service meshes requires checking multiple layers: the pod's IP assignment, the sidecar's ip6tables rules, the proxy's listener bindings, and DNS resolution. Systematically working through each layer quickly isolates whether the issue is in the cluster networking, the service mesh control plane, or the application itself.
