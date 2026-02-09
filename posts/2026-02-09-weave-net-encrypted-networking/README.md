# How to Use Weave Net for Encrypted Pod Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Weave Net, Encryption, Security, Networking

Description: Learn how to deploy Weave Net with network encryption for secure pod-to-pod communication, implementing transparent encryption with minimal performance impact for sensitive workloads.

---

Weave Net provides transparent network-level encryption for pod-to-pod communication, protecting data in transit without requiring application-level changes. Unlike most CNI plugins that send pod traffic in plaintext, Weave can encrypt all traffic between nodes using NaCl encryption, preventing network sniffing and man-in-the-middle attacks. This makes Weave Net an excellent choice for compliance requirements like PCI DSS, HIPAA, or handling sensitive data.

The encryption happens at the CNI level, making it completely transparent to applications. Pods communicate normally while Weave encrypts packets before transmission and decrypts them on the receiving node. This approach simplifies security by providing defense in depth without modifying application code or managing service mesh certificates. The trade-off is some performance overhead for encryption, though Weave's implementation minimizes this impact.

## Installing Weave Net with Encryption

Install Weave Net with encryption enabled:

```bash
# Generate a strong encryption password
WEAVE_PASSWORD=$(openssl rand -base64 32)
echo $WEAVE_PASSWORD > weave-password.txt

# Store password as Kubernetes secret
kubectl create secret generic weave-passwd \
  --from-literal=weave-passwd=$WEAVE_PASSWORD \
  --namespace=kube-system

# Install Weave Net with encryption
kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')&password-secret=weave-passwd"

# Verify Weave Net is running
kubectl get pods -n kube-system -l name=weave-net

# Check encryption is enabled
kubectl logs -n kube-system -l name=weave-net -c weave | grep -i encrypt
# Should see: "Encryption enabled"
```

## Understanding Weave Encryption

Weave uses NaCl (Networking and Cryptography library) for encryption:

- **Algorithm**: XSalsa20 stream cipher with Poly1305 MAC
- **Key derivation**: Password-based using PBKDF2
- **Performance**: Highly optimized, minimal CPU overhead
- **Perfect forward secrecy**: Ephemeral session keys
- **Transparent**: No application changes required

View encryption status:

```bash
# Check Weave status on a node
kubectl exec -n kube-system weave-net-xxxxx -c weave -- /home/weave/weave --local status

# Output shows:
#        Version: 2.8.1
#     Encryption: enabled
#  PeerDiscovery: enabled
#        Targets: 3
#    Connections: 2 (2 established)
```

## Configuring Encryption Parameters

Customize encryption settings:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: weave-passwd
  namespace: kube-system
type: Opaque
stringData:
  weave-passwd: "your-strong-password-here"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: weave-net
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: weave-net
  template:
    metadata:
      labels:
        name: weave-net
    spec:
      containers:
      - name: weave
        image: weaveworks/weave-kube:latest
        env:
        # Enable encryption
        - name: WEAVE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: weave-passwd
              key: weave-passwd
        # Configure MTU for encryption overhead
        - name: WEAVE_MTU
          value: "1376"  # 1450 - encryption overhead
        # Set IPALLOC_RANGE
        - name: IPALLOC_RANGE
          value: "10.244.0.0/16"
        # Enable fast datapath
        - name: WEAVE_NO_FASTDP
          value: "false"
        # Peer discovery timeout
        - name: CONN_LIMIT
          value: "100"
```

## Network Topology and Encryption

Weave creates an encrypted mesh network:

```bash
# View Weave network topology
kubectl exec -n kube-system weave-net-xxxxx -c weave -- /home/weave/weave --local status connections

# Output shows encrypted connections:
# <- 10.0.1.11:6783   established encrypted
# <- 10.0.1.12:6783   established encrypted
# <- 10.0.1.13:6783   established encrypted

# Each node maintains encrypted connections to all other nodes
```

Packet flow with encryption:

1. Pod sends packet to another pod
2. Weave intercepts packet on source node
3. Weave encrypts packet using NaCl
4. Encrypted packet sent to destination node
5. Weave decrypts packet on destination node
6. Packet delivered to destination pod

## Performance Impact of Encryption

Measure encryption overhead:

```bash
# Deploy test pods on different nodes
kubectl run iperf-server --image=networkstatic/iperf3 -- iperf3 -s
kubectl run iperf-client --image=networkstatic/iperf3 --overrides='
{
  "spec": {
    "nodeName": "node2"
  }
}' -- iperf3 -c iperf-server -t 30

# Typical results:
# Without encryption: 9.5 Gbits/sec
# With encryption: 8.5 Gbits/sec
# Overhead: ~10% throughput reduction
# CPU increase: ~15% on both nodes

# Encryption CPU usage is acceptable for most workloads
# Hardware AES acceleration helps if available
```

## Fast Datapath Mode

Enable fast datapath for better performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: weave-net
  namespace: kube-system
data:
  # Enable fast datapath (kernel-level forwarding)
  weave-net-config: |
    {
      "fastdp": true,
      "encryption": true,
      "password": "read from secret"
    }
```

Fast datapath benefits:

- Uses kernel's Open vSwitch datapath
- Reduces packet processing overhead
- Compatible with encryption
- ~20% performance improvement

Check if fast datapath is active:

```bash
kubectl logs -n kube-system weave-net-xxxxx -c weave | grep fastdp
# Should see: "Fastdp enabled"
```

## Rotating Encryption Keys

Rotate encryption password for security:

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update secret
kubectl create secret generic weave-passwd-new \
  --from-literal=weave-passwd=$NEW_PASSWORD \
  --namespace=kube-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Update Weave DaemonSet to use new secret
kubectl set env daemonset/weave-net -n kube-system \
  WEAVE_PASSWORD=valueFrom:secretKeyRef:name=weave-passwd-new:key=weave-passwd

# Restart Weave pods
kubectl rollout restart daemonset/weave-net -n kube-system

# Verify new password is active
kubectl logs -n kube-system -l name=weave-net -c weave | grep -i "password changed"
```

## Network Policies with Encryption

Combine Weave encryption with network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: encrypted-backend
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
```

With Weave encryption:
- Network policy controls which pods can communicate
- Encryption protects allowed traffic in transit
- Defense in depth: access control + encryption

## Monitoring Encrypted Traffic

Monitor Weave encryption:

```bash
# View Weave metrics
kubectl port-forward -n kube-system weave-net-xxxxx 6782:6782

# Query metrics
curl http://localhost:6782/metrics

# Key metrics:
# weave_connections: Number of encrypted connections
# weave_connection_terminations_total: Connection drops
# weave_flows: Active encrypted flows
# weave_ips: IP allocations

# Check for encryption errors
kubectl logs -n kube-system -l name=weave-net -c weave | grep -i "encryption error"
```

Create Grafana dashboard for Weave:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: weave-net-metrics
  namespace: kube-system
  labels:
    name: weave-net
spec:
  type: ClusterIP
  ports:
  - name: metrics
    port: 6782
    targetPort: 6782
  selector:
    name: weave-net
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: weave-net
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: weave-net
  endpoints:
  - port: metrics
    interval: 30s
```

## Troubleshooting Encrypted Connections

### Problem: Pods can't communicate

```bash
# Check Weave encryption status
kubectl exec -n kube-system weave-net-xxxxx -c weave -- \
  /home/weave/weave --local status

# Verify password secret exists
kubectl get secret weave-passwd -n kube-system

# Check if all nodes use same password
for pod in $(kubectl get pods -n kube-system -l name=weave-net -o name); do
  echo "=== $pod ==="
  kubectl exec -n kube-system $pod -c weave -- env | grep WEAVE_PASSWORD
done

# Test encrypted connection
kubectl exec -n kube-system weave-net-xxxxx -c weave -- \
  /home/weave/weave --local status connections
```

### Problem: Performance degradation

```bash
# Check CPU usage on nodes
kubectl top nodes

# View Weave CPU usage
kubectl top pods -n kube-system -l name=weave-net

# Check if fast datapath is enabled
kubectl logs -n kube-system weave-net-xxxxx -c weave | grep fastdp

# Verify MTU is correct
kubectl exec -n kube-system weave-net-xxxxx -c weave -- ip link show weave

# Test without encryption (for comparison)
# Remove WEAVE_PASSWORD env var temporarily
# Measure performance difference
```

### Problem: Connection failures

```bash
# Check Weave logs
kubectl logs -n kube-system -l name=weave-net -c weave --tail=100

# Look for certificate errors or password mismatches
kubectl logs -n kube-system -l name=weave-net -c weave | grep -i "password\|auth\|encrypt"

# Verify network connectivity between nodes
kubectl exec -n kube-system weave-net-xxxxx -c weave -- \
  nc -zv <other-node-ip> 6783

# Check firewall allows Weave port
iptables -L -n | grep 6783
```

## Security Best Practices

1. **Use strong passwords**: At least 32 random characters
2. **Store password securely**: Use Kubernetes secrets with RBAC
3. **Rotate regularly**: Change encryption password quarterly
4. **Enable fast datapath**: Reduces performance impact
5. **Monitor connections**: Watch for unexpected connection drops
6. **Combine with network policies**: Defense in depth
7. **Test disaster recovery**: Verify encryption survives node failures

## Compliance Considerations

Weave encryption helps with compliance:

- **PCI DSS Requirement 4**: Encrypt transmission of cardholder data
- **HIPAA**: Protect ePHI in transit
- **GDPR**: Encrypt personal data
- **SOC 2**: Data encryption in transit

Document encryption implementation:

```yaml
# ConfigMap documenting encryption setup
apiVersion: v1
kind: ConfigMap
metadata:
  name: weave-encryption-documentation
  namespace: kube-system
data:
  encryption-details.txt: |
    Encryption: NaCl (XSalsa20 + Poly1305)
    Key Length: 256 bits
    Password Rotation: Quarterly
    Compliance: PCI DSS 4.1, HIPAA 164.312(e)(1)
    Last Updated: 2026-02-09
```

## Alternative: Service Mesh Encryption

Compare Weave encryption with service mesh:

| Feature | Weave Net | Service Mesh (Istio/Linkerd) |
|---------|-----------|------------------------------|
| Scope | All pod traffic | Only HTTP/gRPC traffic |
| Overhead | ~10% | ~15-25% |
| Complexity | Low | High |
| Protocol support | All | Limited to HTTP/gRPC |
| Certificate management | Password-based | mTLS certificates |
| Identity | IP-based | Service identity |

Use Weave encryption when:
- Need to encrypt all protocols (not just HTTP)
- Want simplicity over fine-grained control
- Don't need service identity features
- Compliance requires network-level encryption

Weave Net with encryption provides straightforward, transparent network security for Kubernetes clusters. By encrypting all pod traffic without application changes, it simplifies security while meeting compliance requirements for data protection in transit.
