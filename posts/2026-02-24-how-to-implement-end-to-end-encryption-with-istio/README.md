# How to Implement End-to-End Encryption with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Encryption, MTLS, TLS, Security

Description: Complete guide to implementing end-to-end encryption in Istio from external clients through the ingress gateway to backend services.

---

End-to-end encryption means that data is encrypted at every point in transit - from the external client, through the ingress gateway, between services in the mesh, and to the final backend. Istio provides the building blocks for this, but achieving true end-to-end encryption requires configuring several components correctly. A gap at any point in the chain means data travels in plaintext somewhere.

## Understanding the Encryption Path

A typical request path has several segments:

```text
Client -> [Internet] -> Load Balancer -> [LB to Gateway] -> Istio Gateway ->
[Gateway to Service A] -> Service A -> [Service A to Service B] -> Service B
```

Each arrow is a network hop where encryption could be present or absent. For true end-to-end encryption, every segment must be encrypted.

## Segment 1: Client to Load Balancer

This is standard HTTPS. Configure your external load balancer with a TLS certificate from a public CA (like Let's Encrypt):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-cert
      hosts:
        - "app.example.com"
```

Create the TLS secret:

```bash
kubectl create secret tls my-tls-cert -n istio-system \
  --cert=fullchain.pem \
  --key=privkey.pem
```

Or use cert-manager to automate certificate management:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: istio-system
spec:
  secretName: my-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
```

## Segment 2: Load Balancer to Ingress Gateway

If your load balancer terminates TLS, the traffic between the load balancer and the Istio gateway might be plaintext. To fix this, either:

**Option A: TLS Passthrough** - The load balancer doesn't terminate TLS; it passes the encrypted connection directly to the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "app.example.com"
```

**Option B: Re-encryption** - The load balancer terminates TLS and re-encrypts traffic to the gateway. This requires the load balancer to trust the gateway's certificate (or skip verification).

## Segment 3: Gateway to Services (mTLS)

Traffic between the gateway and backend services is protected by Istio's automatic mTLS. Make sure mTLS is in STRICT mode:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This mesh-wide policy ensures all service-to-service communication uses mTLS. Verify it's working:

```bash
# Check mTLS status for a specific service
istioctl x describe pod my-app-pod

# Verify the connection is using mTLS
istioctl proxy-config cluster my-app-pod -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    name = c.get('name', '')
    if 'outbound' in name:
        ts = c.get('transportSocket', {})
        if ts:
            print(f'{name}: mTLS enabled')
" | head -10
```

## Segment 4: Service to Service (mTLS)

Between mesh services, mTLS is automatic. But you need to verify there are no gaps:

```bash
# Check for services without sidecars
kubectl get pods -A -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    containers = [c['name'] for c in pod['spec']['containers']]
    if 'istio-proxy' not in containers:
        ns = pod['metadata']['namespace']
        name = pod['metadata']['name']
        if ns not in ['kube-system', 'istio-system']:
            print(f'No sidecar: {ns}/{name}')
"
```

Any pod without a sidecar is a gap in your encryption chain.

## Segment 5: Sidecar to Application (Localhost)

There's one segment that's often overlooked: the connection between the Envoy sidecar and the application container. This runs over localhost (127.0.0.1) within the same pod. While localhost traffic doesn't traverse the network, it's technically unencrypted.

For most threat models, localhost within a pod is considered secure (an attacker would need root access on the node to intercept it). But for extremely sensitive workloads, you can add application-level encryption:

```yaml
# Application handles its own TLS
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: app-tls
spec:
  host: my-app.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE  # Disable Istio mTLS, app handles TLS itself
```

In most cases, you should rely on Istio's mTLS and not worry about the localhost segment.

## Enforcing Encryption Mesh-Wide

To ensure no plaintext traffic exists anywhere in the mesh:

### Step 1: Enable STRICT mTLS globally

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

### Step 2: Deny all plaintext traffic with authorization policies

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-plaintext
  namespace: istio-system
spec:
  action: DENY
  rules:
    - from:
        - source:
            notPrincipals: ["*"]
```

This denies traffic that doesn't have a valid mTLS identity (i.e., plaintext traffic).

### Step 3: Block non-mesh traffic at the gateway

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-policy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    - to:
        - operation:
            ports: ["8443"]
```

This restricts the gateway to only accept traffic on the HTTPS port.

## Verifying Encryption

Check that traffic between services is actually encrypted:

```bash
# Check if a specific connection uses mTLS
istioctl proxy-config cluster service-a-pod \
  --fqdn "outbound|8080||service-b.default.svc.cluster.local" -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    ts = c.get('transportSocket', {})
    if ts.get('name') == 'envoy.transport_sockets.tls':
        print('mTLS: ENABLED')
    else:
        print('mTLS: NOT CONFIGURED')
"
```

You can also use network analysis to confirm encryption:

```bash
# Capture traffic between two pods (on the node)
# If all you see is TLS records, encryption is working
tcpdump -i any -n host <pod-ip> -w /tmp/capture.pcap
```

## Handling External Services

External services called from the mesh also need encryption:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
spec:
  host: api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

The `tls.mode: SIMPLE` means Envoy establishes a TLS connection to the external service, verifying the server's certificate against public CAs.

For mutual TLS with external services:

```yaml
trafficPolicy:
  tls:
    mode: MUTUAL
    clientCertificate: /etc/certs/client.pem
    privateKey: /etc/certs/client-key.pem
    caCertificates: /etc/certs/ca.pem
```

## The Complete Picture

When everything is configured correctly:

1. External clients connect to your gateway over HTTPS
2. The gateway decrypts the external TLS and re-encrypts with Istio mTLS to backend services
3. All service-to-service traffic uses mTLS
4. External API calls use TLS
5. No plaintext traffic exists on the network

Monitor for gaps regularly using `istioctl analyze` and by checking for pods without sidecars. End-to-end encryption is only as strong as its weakest segment.
