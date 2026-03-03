# How to Debug External Connectivity Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, External Services, Egress, ServiceEntry

Description: Practical troubleshooting guide for diagnosing connectivity issues between Istio mesh services and external APIs, databases, and third-party services.

---

Your application inside the Istio mesh needs to call an external API, connect to a managed database, or reach a third-party SaaS service. It was working before you added Istio, and now it is not. This is a very common scenario because Istio's default behavior is to either block or passthrough external traffic depending on your configuration, and the details matter.

Here is how to methodically debug external connectivity issues.

## Understanding Outbound Traffic Modes

Istio has a mesh-wide setting called `outboundTrafficPolicy.mode` that controls what happens when a pod tries to reach an external service that is not registered in the mesh:

- **ALLOW_ANY** (default in most installations): External traffic is allowed to pass through. Envoy does not apply mesh policies but lets it go.
- **REGISTRY_ONLY**: External traffic is blocked unless you explicitly create a ServiceEntry for it.

Check your current setting:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 2 outboundTrafficPolicy
```

If it is `REGISTRY_ONLY` and you have not created a ServiceEntry for your external service, that is your problem.

## Step 1: Test From Inside the Pod

First, confirm the issue from within the pod:

```bash
kubectl exec -it my-app-xxxxx -c istio-proxy -- curl -v https://api.external.com/health
```

Common error messages and what they mean:

- `upstream connect error or disconnect/reset before headers` - Envoy blocked or failed to connect
- `503 Service Unavailable` - No upstream or route for this destination
- Connection timeout - Network issue or firewall

Also try from the app container directly:

```bash
kubectl exec -it my-app-xxxxx -c my-app -- curl -v https://api.external.com/health
```

## Step 2: Check if the Request Hits Envoy

When a pod makes an external request, the iptables rules redirect it through the Envoy sidecar. Check if Envoy is handling it:

```bash
kubectl logs my-app-xxxxx -c istio-proxy --tail=50
```

Look for the external host in the access logs. If there is no log entry at all, the request might be bypassing Envoy (rare but possible with certain iptables configurations).

If you see a log entry with a 502 or 503 response code, Envoy is handling the request but failing to connect upstream.

## Step 3: Create a ServiceEntry

If your mesh is in REGISTRY_ONLY mode, or you want Istio to properly manage external traffic, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Apply it and test again:

```bash
kubectl apply -f external-api-se.yaml
kubectl exec -it my-app-xxxxx -c istio-proxy -- curl -v https://api.external.com/health
```

A few things that commonly go wrong with ServiceEntries:

### Wrong Protocol

If your external service uses HTTPS but you set the protocol to HTTP, the connection will fail because Envoy will try to manage the TLS when it should just pass it through.

For HTTPS services where you want Envoy to pass through the TLS (not terminate it):

```yaml
  ports:
    - number: 443
      name: tls
      protocol: TLS
```

For HTTPS services where Envoy should originate TLS:

```yaml
  ports:
    - number: 443
      name: https
      protocol: HTTPS
```

### Wrong Resolution

If the external host is a DNS name, use `resolution: DNS`. If it is an IP address, use `resolution: STATIC` with explicit endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-db
spec:
  hosts:
    - my-external-db.example.com
  addresses:
    - 10.0.0.50
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
    - address: 10.0.0.50
```

## Step 4: Check Envoy Clusters and Routes

Verify that Envoy has the external service in its configuration:

```bash
istioctl proxy-config clusters my-app-xxxxx.default | grep "api.external.com"
```

You should see a cluster like:

```text
outbound|443||api.external.com    api.external.com    443    -    EDS
```

Check the endpoints:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default --cluster "outbound|443||api.external.com"
```

If the cluster exists but has no endpoints, DNS resolution might be failing. Check the Envoy DNS resolution:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/clusters | grep "api.external.com"
```

## Step 5: Check for DestinationRule Issues

If you have a DestinationRule for the external service, it might be misconfigured. A common issue is applying mTLS to an external service that does not support it:

```bash
kubectl get destinationrule -n default | grep external
```

For external HTTPS services, the DestinationRule should use SIMPLE TLS, not ISTIO_MUTUAL:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

If the external service requires client certificates:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/ca.pem
```

## Step 6: Check Network Policies and Firewalls

Even if Istio is configured correctly, Kubernetes NetworkPolicies or cloud firewalls can block egress traffic:

```bash
kubectl get networkpolicy -n default
```

Check if any NetworkPolicy restricts egress:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
          protocol: TCP
```

Also check cloud-level firewall rules. On GKE, AWS, or Azure, there might be firewall rules blocking egress from the cluster.

## Step 7: Check DNS Resolution

External connectivity often fails because of DNS issues. Test DNS from within the pod:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- nslookup api.external.com
```

If DNS fails, check if the pod's DNS configuration is correct:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- cat /etc/resolv.conf
```

Istio uses smart DNS proxying by default (Istio 1.8+). This can sometimes interfere with external DNS resolution. Check the istio-proxy DNS settings:

```bash
istioctl proxy-config bootstrap my-app-xxxxx.default -o json | grep -A 10 "dns"
```

## Step 8: Check for Egress Gateway Issues

If your organization requires egress traffic to go through an Istio egress gateway, there are additional components to check:

```bash
kubectl get pod -n istio-system -l istio=egressgateway
```

Make sure the egress gateway pod is running and healthy. Then check the VirtualService and Gateway that route traffic through it:

```bash
kubectl get virtualservice -A | grep egress
kubectl get gateway -n istio-system | grep egress
```

A properly configured egress gateway setup includes three resources: a Gateway, a VirtualService, and a ServiceEntry. If any of these are missing or misconfigured, external traffic will fail.

## Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 503 on all external calls | REGISTRY_ONLY mode, no ServiceEntry | Create ServiceEntry or switch to ALLOW_ANY |
| TLS handshake failure | Wrong protocol in ServiceEntry | Use TLS/HTTPS protocol |
| Connection timeout | Firewall/NetworkPolicy | Check egress rules |
| DNS resolution failure | DNS proxy issue | Check resolv.conf and DNS settings |
| 403 Forbidden | AuthorizationPolicy blocking | Check policies |

External connectivity debugging in Istio comes down to understanding the traffic flow: your app talks to Envoy, Envoy looks up the destination, and either routes it or blocks it. Check each step in that chain and you will find the issue.
