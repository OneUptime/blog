# How to Document Istio Multi-Cluster Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Documentation, Architecture, Kubernetes

Description: Create thorough documentation for Istio multi-cluster deployments covering mesh topology, trust domains, network configuration, and cross-cluster routing.

---

Multi-cluster Istio is one of the most complex infrastructure setups you can have. There are multiple deployment models (primary-primary, primary-remote, single network, multi-network), trust configurations, cross-cluster service discovery, and gateway-based traffic routing. Without good documentation, nobody on the team will fully understand how the pieces fit together, and troubleshooting becomes extremely painful.

## Documenting the Deployment Model

The first thing to document is which multi-cluster model you're using. Istio supports several, and the choice affects everything else:

```markdown
# Istio Multi-Cluster Architecture

## Deployment Model

**Model:** Primary-Primary on Different Networks
**Istio Version:** 1.20.2
**Kubernetes Version:** 1.28.x

### Cluster Inventory

| Cluster | Region | Role | Network | Istio Control Plane | Mesh ID |
|---------|--------|------|---------|-------------------|---------|
| prod-us-east | us-east-1 | Primary | network-east | Yes (istiod) | production |
| prod-us-west | us-west-2 | Primary | network-west | Yes (istiod) | production |
| prod-eu | eu-west-1 | Primary | network-eu | Yes (istiod) | production |

### Architecture Diagram

```
    [prod-us-east]          [prod-us-west]         [prod-eu]
    ┌─────────────┐        ┌─────────────┐       ┌─────────────┐
    │ istiod      │        │ istiod      │       │ istiod      │
    │ east-west-gw│<------>│ east-west-gw│<----->│ east-west-gw│
    │ services    │        │ services    │       │ services    │
    └─────────────┘        └─────────────┘       └─────────────┘
          |                       |                      |
     network-east            network-west           network-eu
```
```

## Documenting Trust Configuration

Trust is the foundation of multi-cluster Istio. Document the root CA and how trust is shared:

```markdown
## Trust Configuration

### Root CA
- **Type:** Shared root CA (self-signed)
- **Storage:** HashiCorp Vault (production/pki/istio-root)
- **Key Size:** RSA 4096-bit
- **Validity:** 10 years (expires: 2035-01-15)
- **Rotation Plan:** Annual intermediate CA rotation

### Intermediate CAs
Each cluster has its own intermediate CA signed by the shared root:

| Cluster | Intermediate CA | Validity | Secret Name |
|---------|----------------|----------|-------------|
| prod-us-east | istio-ca-east | 1 year | cacerts |
| prod-us-west | istio-ca-west | 1 year | cacerts |
| prod-eu | istio-ca-eu | 1 year | cacerts |

### Trust Domain
- **Trust Domain:** cluster.local
- **SPIFFE Format:** spiffe://cluster.local/ns/{namespace}/sa/{serviceaccount}

### Certificate Verification
```

```bash
# Verify the root CA is consistent across clusters
for CTX in prod-us-east prod-us-west prod-eu; do
  echo "=== $CTX ==="
  kubectl --context=$CTX get secret cacerts -n istio-system -o json | \
    jq -r '.data["root-cert.pem"]' | base64 -d | \
    openssl x509 -noout -fingerprint -sha256
done
# All fingerprints should match
```

## Documenting Cross-Cluster Service Discovery

Explain how services in one cluster discover services in other clusters:

```markdown
## Cross-Cluster Service Discovery

### Remote Secrets
Each cluster has remote secrets that allow its istiod to read endpoints
from other clusters:

| In Cluster | Remote Secret For | Secret Name |
|------------|------------------|-------------|
| prod-us-east | prod-us-west | istio-remote-secret-prod-us-west |
| prod-us-east | prod-eu | istio-remote-secret-prod-eu |
| prod-us-west | prod-us-east | istio-remote-secret-prod-us-east |
| prod-us-west | prod-eu | istio-remote-secret-prod-eu |
| prod-eu | prod-us-east | istio-remote-secret-prod-us-east |
| prod-eu | prod-us-west | istio-remote-secret-prod-us-west |

### How Discovery Works
1. istiod in cluster-A watches the Kubernetes API of cluster-B (via remote secret)
2. When a new service/endpoint appears in cluster-B, istiod-A learns about it
3. istiod-A pushes updated endpoint lists to sidecars in cluster-A
4. Sidecars in cluster-A can now route to services in cluster-B
```

Verify discovery is working:

```bash
# Check if remote endpoints are visible
istioctl --context=prod-us-east proxy-config endpoints deploy/frontend -n default | \
  grep "payment-service"

# Should show endpoints from all clusters
# 10.0.1.5:8080    HEALTHY   outbound|8080||payment-service.production.svc.cluster.local  <-- east
# 10.1.2.3:8080    HEALTHY   outbound|8080||payment-service.production.svc.cluster.local  <-- west
```

## Documenting East-West Gateway Configuration

In multi-network setups, east-west gateways handle cross-cluster traffic:

```markdown
## East-West Gateways

### Gateway Configuration
```

```yaml
# East-west gateway in each cluster
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
  annotations:
    docs/purpose: "Handles cross-cluster east-west traffic"
    docs/network: "network-east"
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    hosts:
    - "*.local"
    tls:
      mode: AUTO_PASSTHROUGH
```

```markdown
### East-West Gateway Endpoints

| Cluster | Gateway Service | External IP | Port |
|---------|----------------|-------------|------|
| prod-us-east | istio-eastwestgateway | 34.102.136.180 | 15443 |
| prod-us-west | istio-eastwestgateway | 35.203.120.45 | 15443 |
| prod-eu | istio-eastwestgateway | 35.240.60.22 | 15443 |
```

```bash
# Verify east-west gateway is running
for CTX in prod-us-east prod-us-west prod-eu; do
  echo "=== $CTX ==="
  kubectl --context=$CTX get svc -n istio-system istio-eastwestgateway
done
```

## Documenting Locality-Aware Routing

Document how traffic is distributed across clusters:

```markdown
## Locality-Aware Routing

### Configuration
Locality-aware routing is enabled mesh-wide. Traffic prefers local
endpoints, then same-region endpoints, then cross-region endpoints.

### Failover Configuration
```

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-locality
  namespace: production
  annotations:
    docs/description: |
      Payment service locality configuration.
      Traffic stays in-region unless health drops below 70%.
      Failover priority: same-zone > same-region > cross-region.
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
        - from: eu-west-1
          to: us-east-1
      simple: ROUND_ROBIN
```

```markdown
### Expected Traffic Flow

| Client Region | Primary | Failover 1 | Failover 2 |
|--------------|---------|------------|------------|
| us-east-1 | prod-us-east | prod-us-west | prod-eu |
| us-west-2 | prod-us-west | prod-us-east | prod-eu |
| eu-west-1 | prod-eu | prod-us-east | prod-us-west |
```

## Documenting Multi-Cluster Operations

Include operational procedures specific to multi-cluster:

```markdown
## Operational Procedures

### Adding a New Cluster

1. Install Istio with the shared root CA:
   ```bash
   istioctl install --context=new-cluster -f istio-config.yaml
   ```

2. Create remote secrets in all existing clusters:
   ```bash
   istioctl create-remote-secret --context=new-cluster --name=new-cluster | \
     kubectl apply --context=prod-us-east -f -
   ```

3. Create remote secrets for existing clusters in the new cluster:
   ```bash
   istioctl create-remote-secret --context=prod-us-east --name=prod-us-east | \
     kubectl apply --context=new-cluster -f -
   ```

4. Deploy the east-west gateway in the new cluster

5. Verify cross-cluster connectivity:
   ```bash
   istioctl --context=new-cluster proxy-config endpoints deploy/sleep -n default | \
     grep prod-us-east
   ```

### Removing a Cluster

1. Shift traffic away from the cluster using locality settings
2. Remove remote secrets from other clusters
3. Remove the cluster's remote secrets
4. Uninstall Istio from the cluster

### Rotating Intermediate CAs

1. Generate new intermediate CA from root
2. Create new cacerts secret in the target cluster
3. Restart istiod: `kubectl rollout restart deploy/istiod -n istio-system`
4. Perform rolling restart of all workloads
5. Verify mTLS is working with the new cert
```

## Documenting Network Configuration

```markdown
## Network Configuration

### Network Topology

| Network | CIDR | Clusters | Gateway |
|---------|------|----------|---------|
| network-east | 10.0.0.0/16 | prod-us-east | 34.102.136.180:15443 |
| network-west | 10.1.0.0/16 | prod-us-west | 35.203.120.45:15443 |
| network-eu | 10.2.0.0/16 | prod-eu | 35.240.60.22:15443 |

### DNS Configuration
Cross-cluster DNS is handled by Istio's service discovery, not by
external DNS. Services use the same hostname regardless of which
cluster they're in (e.g., payment-service.production.svc.cluster.local).

### Firewall Rules
The following firewall rules must be in place for cross-cluster communication:

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| Any cluster | East-west GW IPs | 15443 | TCP | Cross-cluster mTLS |
| Any cluster | istiod IPs | 15012 | TCP | Control plane communication |
```

Multi-cluster Istio documentation requires more effort than single-cluster, but the payoff is proportional. When something breaks at 3 AM and the on-call engineer needs to figure out why traffic isn't flowing between clusters, having clear documentation about the architecture, trust configuration, and operational procedures is the difference between a 10-minute fix and a 2-hour investigation.
