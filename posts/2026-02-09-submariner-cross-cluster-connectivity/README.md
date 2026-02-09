# How to Set Up Submariner for Cross-Cluster Pod-to-Pod and Service Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Networking

Description: Learn how to install and configure Submariner to enable direct pod-to-pod communication and service discovery across multiple Kubernetes clusters.

---

Submariner connects multiple Kubernetes clusters with secure tunnels, enabling pods in one cluster to communicate directly with pods and services in other clusters. Unlike service mesh solutions that require sidecars, Submariner operates at the network layer, providing transparent connectivity without application changes.

## Understanding Submariner Components

Submariner consists of several components:

- **Gateway Engine**: Establishes secure tunnels between clusters
- **Route Agent**: Manages routing tables on worker nodes
- **Broker**: Coordinates connection information between clusters
- **Service Discovery**: Enables cross-cluster service discovery via CoreDNS
- **Globalnet**: Handles overlapping pod/service CIDRs (optional)

## Installing subctl CLI

Install the Submariner command-line tool:

```bash
# Download subctl
curl -Ls https://get.submariner.io | bash

# Add to PATH
export PATH=$PATH:~/.local/bin

# Verify installation
subctl version
```

## Deploying the Broker

The broker coordinates cluster connections. Deploy it in one cluster (typically a dedicated management cluster or one of your app clusters):

```bash
# Deploy broker in cluster-1
subctl deploy-broker \
  --kubeconfig ~/.kube/config \
  --context cluster-1
```

This creates the submariner-k8s-broker namespace and necessary resources.

Export broker information for other clusters:

```bash
subctl show versions
```

## Joining Clusters to the Broker

Join cluster-1 to its own broker:

```bash
subctl join broker-info.subm \
  --kubeconfig ~/.kube/config \
  --context cluster-1 \
  --clusterid cluster-1 \
  --cable-driver libreswan \
  --natt=false
```

Join cluster-2 to the broker:

```bash
# Get broker info from cluster-1
subctl show versions --context cluster-1

# Join cluster-2
subctl join broker-info.subm \
  --kubeconfig ~/.kube/config \
  --context cluster-2 \
  --clusterid cluster-2 \
  --cable-driver libreswan \
  --natt=false
```

Cable driver options:

- **libreswan**: IPsec-based, works in most environments
- **wireguard**: Faster, requires WireGuard kernel module
- **vxlan**: For clusters on the same network

## Verifying Connectivity

Check Submariner status:

```bash
subctl show all --context cluster-1
```

Output shows:

```
CLUSTER ID    ENDPOINT IP     CABLE DRIVER    TYPE
cluster-1     10.0.1.100      libreswan       local
cluster-2     10.0.2.100      libreswan       remote

GATEWAY             HA STATUS       SUMMARY
gateway-node-1      active          connected to 1 cluster

ROUTE AGENT         STATUS
route-agent-node-1  connected
route-agent-node-2  connected
```

Verify connection from cluster-2:

```bash
subctl show connections --context cluster-2
```

## Testing Pod-to-Pod Connectivity

Deploy test pods in both clusters:

```bash
# In cluster-1
kubectl create deployment nginx --image=nginx:alpine --context cluster-1
kubectl expose deployment nginx --port=80 --context cluster-1

# Get nginx pod IP in cluster-1
NGINX_IP=$(kubectl get pod -l app=nginx -o jsonpath='{.items[0].status.podIP}' --context cluster-1)
echo "Nginx IP in cluster-1: $NGINX_IP"

# In cluster-2, create a test pod
kubectl run test-pod --image=nicolaka/netshoot --context cluster-2 -- sleep 3600

# Test connectivity from cluster-2 to cluster-1 pod
kubectl exec test-pod --context cluster-2 -- curl -s http://$NGINX_IP
```

If configured correctly, the curl succeeds despite pods being in different clusters.

## Exporting Services for Cross-Cluster Access

Export a service from cluster-1 to make it available in cluster-2:

```yaml
# In cluster-1
apiVersion: v1
kind: Service
metadata:
  name: webapp
  namespace: production
  labels:
    app: webapp
  annotations:
    # Export this service to other clusters
    submariner.io/export: "true"
spec:
  selector:
    app: webapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

Apply the service:

```bash
kubectl apply -f webapp-service.yaml --context cluster-1
```

Submariner creates a ServiceExport:

```bash
kubectl get serviceexports -n production --context cluster-1
```

## Discovering Exported Services

In cluster-2, the exported service becomes available with a special DNS name:

```bash
# In cluster-2, create a test pod
kubectl run client --image=curlimages/curl --context cluster-2 -- sleep 3600

# Access the service from cluster-1 using cross-cluster DNS
kubectl exec client --context cluster-2 -- \
  curl http://webapp.production.svc.clusterset.local
```

The DNS format is: `<service>.<namespace>.svc.clusterset.local`

List imported services:

```bash
kubectl get serviceimports -n production --context cluster-2
```

## Configuring Globalnet for Overlapping CIDRs

If clusters have overlapping pod or service CIDRs, enable Globalnet:

```bash
# Deploy broker with Globalnet
subctl deploy-broker \
  --globalnet \
  --globalnet-cidr 242.0.0.0/8

# Join clusters with Globalnet
subctl join broker-info.subm \
  --context cluster-1 \
  --clusterid cluster-1 \
  --globalnet
```

Globalnet assigns each cluster a unique CIDR from the globalnet range and handles NAT for cross-cluster traffic.

Verify Globalnet configuration:

```bash
kubectl get clusters.submariner.io -n submariner-operator --context cluster-1 -o yaml
```

Look for the `global_cidr` field.

## Using Headless Services

Export headless services for StatefulSet discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: database
  annotations:
    submariner.io/export: "true"
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
  - port: 9042
    name: cql
```

Access individual pods across clusters:

```bash
# From cluster-2, access specific Cassandra pod in cluster-1
kubectl exec client --context cluster-2 -- \
  nc -zv cassandra-0.cassandra.database.svc.clusterset.local 9042
```

## Implementing Multi-Cluster Service Failover

Deploy the same service in multiple clusters for high availability:

```yaml
# In both cluster-1 and cluster-2
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  annotations:
    submariner.io/export: "true"
spec:
  selector:
    app: api
  ports:
  - port: 8080
```

Clients can use the clusterset DNS name. Submariner load-balances across all clusters offering the service:

```bash
curl http://api-service.production.svc.clusterset.local:8080
```

## Configuring Service Export Policies

Control which clusters receive exported services using labels:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: webapp
  namespace: production
  labels:
    # Only export to production clusters
    environment: production
```

On importing clusters, filter imports:

```bash
subctl join broker-info.subm \
  --context cluster-2 \
  --clusterid cluster-2 \
  --service-discovery \
  --label-selector environment=production
```

## Monitoring Submariner

Check gateway health:

```bash
subctl show gateways --context cluster-1
```

View connection details:

```bash
subctl show connections --context cluster-1
```

Monitor Submariner components:

```bash
kubectl get pods -n submariner-operator --context cluster-1
kubectl logs -n submariner-operator deployment/submariner-operator -f --context cluster-1
```

Verify route agents:

```bash
kubectl get daemonset -n submariner-operator --context cluster-1
```

## Troubleshooting Connectivity Issues

Diagnose connectivity problems:

```bash
# Run comprehensive diagnostics
subctl diagnose all --context cluster-1

# Check firewall rules
subctl diagnose firewall inter-cluster --context cluster-1

# Verify K8s API connectivity
subctl diagnose k8s-version --context cluster-1

# Test cross-cluster connections
subctl diagnose connections --context cluster-1
```

Common issues:

**Gateway pods not running**: Check if gateway nodes have the required network access. Gateways need specific ports open (IPsec: 500/UDP, 4500/UDP).

**Services not imported**: Verify ServiceExport exists and has correct labels. Check submariner-lighthouse logs:

```bash
kubectl logs -n submariner-operator deployment/submariner-lighthouse-agent --context cluster-1
```

**DNS not resolving clusterset.local**: Ensure CoreDNS has Submariner plugin:

```bash
kubectl get configmap coredns -n kube-system -o yaml --context cluster-2
```

Should contain:

```yaml
clusterset.local:53 {
    lighthouse
}
```

## Best Practices

**Use dedicated gateway nodes**: Tag specific nodes as gateways to avoid interrupting workload nodes:

```bash
kubectl label node gateway-node-1 submariner.io/gateway=true
```

**Monitor tunnel health**: Set up alerts for gateway connection failures:

```bash
# Check connection metrics
kubectl get endpoints.submariner.io -n submariner-operator
```

**Secure cable drivers**: Use IPsec (libreswan) for production. WireGuard is faster but may not be available in all environments.

**Plan CIDR ranges**: If possible, use non-overlapping CIDRs to avoid Globalnet overhead. Document all cluster CIDRs before deployment.

**Test failover**: Regularly test service failover by taking down services in one cluster and verifying traffic routes to another.

**Limit service exports**: Don't export all services. Only export those that genuinely need cross-cluster access to reduce complexity.

**Use network policies**: Implement network policies to control which pods can access cross-cluster services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-cross-cluster
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: webapp
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 8080
```

Submariner provides transparent, secure connectivity across Kubernetes clusters without requiring application changes or service mesh complexity. By operating at the network layer, it enables true multi-cluster architectures with seamless pod and service communication.
