# How to Debug Cross-Cluster Connectivity Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Multi-Cluster, Kubernetes, Troubleshooting

Description: A systematic guide to diagnosing and fixing cross-cluster connectivity problems in Istio multi-cluster deployments.

---

Cross-cluster connectivity in Istio can fail for dozens of reasons. Network policies blocking traffic, misconfigured east-west gateways, expired certificates, DNS resolution failures, firewall rules, and more. When a service in cluster A cannot talk to a service in cluster B, you need a systematic way to find the problem.

This guide gives you a step-by-step debugging process that covers the most common failure modes.

## Start with the Basics

Before going deep into Istio-specific debugging, verify the fundamentals.

**Check if the clusters can reach each other at the network level:**

```bash
# Get the east-west gateway IP in cluster B
EW_IP=$(kubectl get svc -n istio-system istio-eastwestgateway --context=cluster-b \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# From a pod in cluster A, try to reach it
kubectl exec deploy/sleep -c sleep --context=cluster-a -- \
  curl -v -k https://$EW_IP:15443 --connect-timeout 5
```

If this fails, the problem is at the network level, not Istio. Check security groups, firewall rules, and VPC peering.

**Verify the multi-cluster setup is recognized:**

```bash
istioctl remote-clusters --context=cluster-a
```

You should see cluster B listed with a status of `synced`. If it shows `not ready` or is missing entirely, there is a configuration problem with the remote secret.

## Check Remote Secrets

Istio uses Kubernetes secrets to authenticate with remote clusters. These secrets contain kubeconfig data that lets the control plane in one cluster access the API server of another.

```bash
# List remote secrets
kubectl get secrets -n istio-system -l istio/multiCluster=true --context=cluster-a

# Verify the secret contents are valid
kubectl get secret istio-remote-secret-cluster-b -n istio-system --context=cluster-a \
  -o jsonpath='{.data.cluster-b}' | base64 -d
```

If the secret is missing or contains outdated credentials, recreate it:

```bash
istioctl create-remote-secret --context=cluster-b --name=cluster-b | \
  kubectl apply -f - --context=cluster-a
```

## Inspect Endpoint Discovery

One of the most common issues is that the control plane in one cluster does not discover endpoints in the other cluster. Check what endpoints istiod knows about:

```bash
# From cluster A, check endpoints for a service
istioctl proxy-config endpoints deploy/sleep --context=cluster-a | \
  grep "payment.default"
```

You should see endpoints from both clusters. If you only see local endpoints, istiod is not picking up the remote ones.

Check istiod logs for remote cluster discovery:

```bash
kubectl logs -n istio-system deploy/istiod --context=cluster-a | \
  grep -i "cluster-b\|remote\|endpoint"
```

Common error messages to look for:

- `"failed to list services"` - The remote secret does not have sufficient permissions.
- `"connection refused"` - The API server of the remote cluster is not reachable.
- `"certificate expired"` - The kubeconfig in the remote secret has an expired certificate.

## Debug the East-West Gateway

The east-west gateway handles cross-cluster traffic. If it is not working, nothing works.

```bash
# Check the gateway is running
kubectl get pods -n istio-system -l istio=eastwestgateway --context=cluster-b

# Check it has an external IP
kubectl get svc -n istio-system istio-eastwestgateway --context=cluster-b

# Check the gateway configuration
istioctl proxy-config listeners \
  $(kubectl get pod -n istio-system -l istio=eastwestgateway --context=cluster-b \
    -o jsonpath='{.items[0].metadata.name}') \
  -n istio-system --context=cluster-b
```

The gateway should have a listener on port 15443 for AUTO_PASSTHROUGH TLS. If this listener is missing, check the Gateway resource:

```bash
kubectl get gateway -n istio-system --context=cluster-b
```

Make sure the cross-network gateway exists:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

## Check mTLS Between Clusters

Cross-cluster traffic requires mTLS, and both clusters need to trust each other's certificates. This means they must share a common root CA.

**Verify the root CA is the same in both clusters:**

```bash
# Get the root cert from cluster A
kubectl get secret cacerts -n istio-system --context=cluster-a \
  -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | head -20

# Get the root cert from cluster B
kubectl get secret cacerts -n istio-system --context=cluster-b \
  -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | head -20
```

The issuer and subject should match. If they do not, you need to configure a shared root CA.

**Check if mTLS handshakes are succeeding:**

```bash
kubectl exec deploy/sleep -c istio-proxy --context=cluster-a -- \
  pilot-agent request GET stats | grep ssl
```

Look at `ssl.handshake` (successful handshakes) and `ssl.connection_error` (failed handshakes).

## Diagnose DNS Resolution

If DNS is not resolving cross-cluster services, traffic will never reach the remote cluster.

```bash
# Test DNS resolution from a pod
kubectl exec deploy/sleep -c sleep --context=cluster-a -- \
  nslookup payment.default.svc.cluster.local

# Check if Istio DNS proxy is working
istioctl proxy-config listeners deploy/sleep --context=cluster-a --port 15053
```

If you are using Istio DNS proxying, make sure it is enabled:

```bash
kubectl get cm istio -n istio-system --context=cluster-a -o yaml | grep DNS
```

## Network Label Debugging

For multi-network setups, pods and namespaces need proper network labels. Missing labels mean Istio does not know that traffic needs to go through the east-west gateway.

```bash
# Check namespace labels
kubectl get namespace default --show-labels --context=cluster-a
kubectl get namespace default --show-labels --context=cluster-b

# Verify the network label
kubectl get namespace istio-system --show-labels --context=cluster-a | grep network
```

If the `topology.istio.io/network` label is missing, add it:

```bash
kubectl label namespace istio-system topology.istio.io/network=network-a --context=cluster-a
```

## Using istioctl analyze

The `istioctl analyze` command can catch many configuration issues:

```bash
istioctl analyze --context=cluster-a
istioctl analyze --context=cluster-b
```

Pay attention to warnings about:
- Missing Gateway resources
- Misconfigured VirtualServices
- DestinationRule conflicts
- Missing endpoints

## Proxy-Level Debugging

When higher-level tools do not reveal the problem, you need to look at what the proxy itself sees.

**Enable debug logging on a specific proxy:**

```bash
istioctl proxy-config log deploy/sleep --level connection:debug,router:debug --context=cluster-a
```

**Check the proxy's cluster configuration:**

```bash
istioctl proxy-config clusters deploy/sleep --context=cluster-a | grep payment
```

**Look at routes:**

```bash
istioctl proxy-config routes deploy/sleep --context=cluster-a | grep payment
```

**Check listeners:**

```bash
istioctl proxy-config listeners deploy/sleep --context=cluster-a --port 8080
```

## Common Problems and Solutions

**Problem: Remote cluster shows "not ready" in `istioctl remote-clusters`**

Solution: Check the remote secret and ensure the API server is reachable. Recreate the secret if needed.

**Problem: Endpoints from the remote cluster are not showing up**

Solution: Verify the remote secret has correct RBAC permissions. The service account needs at least read access to services and endpoints.

**Problem: Traffic reaches the east-west gateway but gets dropped**

Solution: Check that AUTO_PASSTHROUGH is configured on the gateway. Also verify that the SNI header matches what the gateway expects.

```bash
# Check the gateway's active connections
istioctl proxy-config listeners \
  $(kubectl get pod -n istio-system -l istio=eastwestgateway --context=cluster-b \
    -o jsonpath='{.items[0].metadata.name}') \
  -n istio-system --context=cluster-b
```

**Problem: mTLS handshake failures**

Solution: Verify both clusters share the same root CA. Check certificate expiration dates:

```bash
istioctl proxy-config secret deploy/sleep --context=cluster-a -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'
```

Debugging cross-cluster Istio connectivity takes patience and a systematic approach. Start from the network layer, move to Istio configuration, then to proxy-level details. Most problems fall into a few categories: network unreachability, misconfigured secrets, missing labels, or certificate issues.
