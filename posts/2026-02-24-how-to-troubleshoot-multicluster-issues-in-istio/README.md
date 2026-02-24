# How to Troubleshoot Multicluster Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multicluster, Troubleshooting, Kubernetes, Service Mesh

Description: A practical troubleshooting guide for common issues in Istio multicluster deployments including connectivity, DNS, and certificate problems.

---

Multicluster Istio is powerful but has a lot of moving parts. Two or more Kubernetes clusters sharing a service mesh means cross-cluster service discovery, certificate trust, and network connectivity all need to work perfectly. When something breaks, the debugging surface area is much larger than a single-cluster setup. Here's how to systematically find and fix multicluster issues.

## Multicluster Architecture Quick Review

Istio supports two main multicluster models:

**Primary-Remote** - One cluster runs Istiod (primary), and remote clusters connect their proxies to it. Simpler but creates a single point of failure.

**Multi-Primary** - Each cluster runs its own Istiod, and they share configuration. More resilient but more complex.

In both models, cross-cluster traffic flows through east-west gateways. Each cluster exposes a gateway that other clusters can route traffic through.

## Step 1: Verify Cluster Connectivity

The most basic check - can the clusters talk to each other?

Check east-west gateways in each cluster:

```bash
# Cluster 1
kubectl get svc -n istio-system istio-eastwestgateway --context cluster1
```

```
NAME                    TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)
istio-eastwestgateway   LoadBalancer   10.96.1.100   34.123.45.67    15021:31234/TCP,15443:31235/TCP,15012:31236/TCP,15017:31237/TCP
```

```bash
# Cluster 2
kubectl get svc -n istio-system istio-eastwestgateway --context cluster2
```

The gateway needs an external IP. If it's stuck on `<pending>`, the cloud provider load balancer isn't provisioning. Check cloud-specific load balancer configurations.

Test connectivity between gateways:

```bash
# From a pod in cluster1, try reaching cluster2's gateway
kubectl exec sleep-pod --context cluster1 -- curl -v https://34.123.45.68:15443 -k
```

## Step 2: Check Remote Secrets

In multi-primary and primary-remote setups, clusters authenticate to each other using Kubernetes secrets. Verify they exist:

```bash
kubectl get secrets -n istio-system --context cluster1 | grep istio-remote-secret
```

The secret should contain a kubeconfig for the remote cluster. If it's missing, create it:

```bash
istioctl create-remote-secret --context cluster2 --name cluster2 | \
  kubectl apply -f - --context cluster1
```

And vice versa for the other direction:

```bash
istioctl create-remote-secret --context cluster1 --name cluster1 | \
  kubectl apply -f - --context cluster2
```

Check that Istiod can actually use the remote secret by looking at its logs:

```bash
kubectl logs -n istio-system deployment/istiod --context cluster1 | grep "remote cluster"
```

You should see messages about successfully connecting to the remote cluster. If you see connection errors, the kubeconfig in the secret might be invalid or the API server might be unreachable.

## Step 3: Verify Cross-Cluster Service Discovery

Check that services from one cluster are visible in the other. Use Istiod's debug endpoints:

```bash
kubectl exec -n istio-system deployment/istiod --context cluster1 -- \
  curl -s localhost:15014/debug/endpointz | python3 -m json.tool | grep cluster2
```

You should see endpoints with the remote cluster name. If remote endpoints are missing, Istiod isn't syncing from the remote cluster.

Also check from the proxy perspective:

```bash
istioctl proxy-config endpoints sleep-pod.default --context cluster1 | grep cluster2
```

This shows whether the local proxies know about endpoints in the remote cluster.

## Step 4: Check Trust Domain and Certificates

Cross-cluster mTLS requires a shared root of trust. Both clusters must use the same root CA certificate. Verify:

```bash
# Cluster 1
kubectl get secret cacerts -n istio-system --context cluster1 -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | grep Issuer

# Cluster 2
kubectl get secret cacerts -n istio-system --context cluster2 -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | grep Issuer
```

The Issuer should be the same. If they're different, mTLS between clusters will fail because the proxies won't trust each other's certificates.

To set up a shared CA, create the `cacerts` secret in both clusters with the same root CA:

```bash
# Generate root CA (do this once)
mkdir -p certs
openssl req -newkey rsa:4096 -nodes -keyout certs/root-key.pem \
  -x509 -days 3650 -out certs/root-cert.pem \
  -subj "/O=Istio/CN=Root CA"

# Generate intermediate CA for each cluster
# Cluster 1
openssl req -newkey rsa:4096 -nodes -keyout certs/cluster1-ca-key.pem \
  -out certs/cluster1-ca-cert.csr \
  -subj "/O=Istio/CN=Intermediate CA cluster1"
openssl x509 -req -in certs/cluster1-ca-cert.csr \
  -CA certs/root-cert.pem -CAkey certs/root-key.pem \
  -CAcreateserial -out certs/cluster1-ca-cert.pem -days 730

# Create secret in cluster 1
kubectl create secret generic cacerts -n istio-system --context cluster1 \
  --from-file=ca-cert.pem=certs/cluster1-ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster1-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster1-ca-cert.pem
```

Repeat with cluster2's intermediate CA.

## Step 5: Network Configuration

Clusters need to know about each other's networks. Check the mesh networks configuration:

```bash
kubectl get configmap istio -n istio-system --context cluster1 -o yaml | grep -A 20 meshNetworks
```

The configuration should look something like:

```yaml
meshNetworks:
  network1:
    endpoints:
    - fromRegistry: cluster1
    gateways:
    - registryServiceName: istio-eastwestgateway.istio-system.svc.cluster.local
      port: 15443
  network2:
    endpoints:
    - fromRegistry: cluster2
    gateways:
    - registryServiceName: istio-eastwestgateway.istio-system.svc.cluster.local
      port: 15443
```

If networks aren't configured, cross-cluster traffic won't know to route through the east-west gateways.

Also verify cluster labels. Each cluster should have a network label:

```bash
kubectl get namespace istio-system --context cluster1 -o yaml | grep topology.istio.io/network
```

## Step 6: Debug Cross-Cluster Traffic Flow

When a service in cluster1 tries to reach a service in cluster2, the traffic flow is:

1. Source pod's sidecar - routes to the local east-west gateway
2. Local east-west gateway - forwards to remote east-west gateway on port 15443 (mTLS tunnel)
3. Remote east-west gateway - decrypts and routes to the target pod

If traffic fails, debug each hop.

Check if the source proxy knows about the remote endpoints:

```bash
istioctl proxy-config endpoints sleep-pod.default --context cluster1 \
  --cluster "outbound|8080||remote-service.default.svc.cluster.local"
```

Check the east-west gateway logs:

```bash
kubectl logs -n istio-system deployment/istio-eastwestgateway --context cluster1 --tail=50
kubectl logs -n istio-system deployment/istio-eastwestgateway --context cluster2 --tail=50
```

Enable access logging on the gateways if not already enabled:

```bash
istioctl proxy-config log istio-eastwestgateway-pod.istio-system --context cluster1 --level http:debug,router:debug
```

## Step 7: DNS and Service Naming

Services must use the same name and namespace in both clusters for transparent cross-cluster routing. If `reviews.default` exists in both clusters, Istio load-balances across all endpoints in both clusters.

If services have different names, you need ServiceEntries to bridge them. Verify with:

```bash
kubectl get services --context cluster1 -n default
kubectl get services --context cluster2 -n default
```

## Common Issues and Fixes

**Cross-cluster requests timeout.** Usually a firewall issue. Make sure port 15443 is open between cluster east-west gateways. Also check that the gateway's external IP is routable from the other cluster.

**Services not discovered across clusters.** Check remote secrets and Istiod logs. If Istiod can't connect to the remote cluster's API server, it can't discover services.

**mTLS handshake failures between clusters.** Root CA mismatch. Verify both clusters share the same root certificate.

**Uneven traffic distribution.** If one cluster has 3 pods and another has 1, Istio distributes evenly across all 4 endpoints by default. Use locality load balancing to prefer local endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

## Summary

Multicluster debugging is methodical. Start with connectivity (can clusters reach each other's gateways?), then check configuration (are remote secrets valid?), then verify discovery (does Istiod see remote endpoints?), and finally check certificates (is the trust domain shared?). Work through each layer and you'll narrow down the problem quickly.
