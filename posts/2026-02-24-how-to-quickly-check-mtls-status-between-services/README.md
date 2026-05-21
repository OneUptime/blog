# How to Quickly Check mTLS Status Between Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Security, Kubernetes, Service Mesh, Troubleshooting

Description: Quick and practical methods to verify mutual TLS status and encryption between services in your Istio service mesh.

---

Mutual TLS (mTLS) is one of the biggest reasons people adopt Istio. It gives you encrypted service-to-service communication and cryptographic identity verification without touching your application code. But how do you know it is actually working? When something goes wrong with mTLS, the symptoms can be confusing: connection resets, 503 errors, or intermittent failures. Knowing how to quickly check mTLS status is an essential debugging skill.

Here are the fastest ways to verify mTLS is working correctly between your services.

## Check Mesh-Wide mTLS Policy

First, see what PeerAuthentication policies are in effect. The mesh-wide policy lives in Istio's root namespace, which is commonly `istio-system`:

```bash
kubectl get peerauthentication -n istio-system
```

If you see a policy named `default` with mode `STRICT`, workloads inherit strict mTLS unless a more specific namespace, workload, or port-level policy overrides it:

```bash
kubectl get peerauthentication default -n istio-system -o jsonpath='{.spec.mtls.mode}'
```

Output: `STRICT` or `PERMISSIVE`

Also check for namespace-level policies that might override the mesh-wide setting:

```bash
kubectl get peerauthentication -A
```

This shows all PeerAuthentication policies across all namespaces. A namespace-level policy overrides the mesh-wide one, and a workload-level policy overrides the namespace-level one.

## Use istioctl x describe

This is one of the most useful commands for checking mTLS status. It shows the Istio configuration affecting a pod and reports whether Pilot predicts mTLS conflicts:

```bash
POD=$(kubectl get pod -n default -l app=my-app -o jsonpath='{.items[0].metadata.name}')
istioctl x describe pod "$POD" -n default
```

The output shows:

```text
Pod: my-app-7d9c8f6c8b-x2abc
   Pod Ports: 8080 (my-app), 15090 (istio-proxy)
--------------------
Service: my-app
   Port: http 8080/HTTP
Pilot reports that pod enforces mTLS and clients speak mTLS
```

Key lines to look at:

- **Pilot reports that pod enforces mTLS**: The destination is requiring mTLS from PeerAuthentication.
- **clients speak mTLS**: The client-side configuration is expected to originate mTLS.
- **WARNING Pilot predicts TLS Conflict**: There is a mismatch between the client and server TLS settings.

## Check mTLS for a Specific Connection

If you want to check mTLS between two specific services, inspect the source proxy's outbound cluster for the destination:

```bash
istioctl proxy-config clusters deployment/frontend -n default \
  --fqdn api-server.backend.svc.cluster.local -o json | grep -i "transportSocket" -A8
```

This narrows the output to the destination cluster, which is easier to read when you are debugging a specific issue.

## Verify with Proxy Configuration

You can verify mTLS at the proxy level by checking the Envoy cluster configuration:

```bash
istioctl proxy-config clusters deployment/my-app -n default -o json | \
  python3 -c "
import sys, json
for cluster in json.load(sys.stdin):
    name = cluster.get('name', '')
    transport = cluster.get('transportSocket', {}).get('name', 'plaintext')
    if 'outbound' in name:
        print(f\"{name}: {transport}\")
" | head -20
```

If mTLS is active, you will see `envoy.transport_sockets.tls` as the transport socket. Plaintext connections will not have a transport socket configured.

A simpler check:

```bash
istioctl proxy-config clusters deployment/my-app -n default --fqdn api-server.backend.svc.cluster.local -o json | grep -i "transportSocket" -A5
```

## Check Certificates

Verify the actual certificates being used by the sidecar:

```bash
istioctl proxy-config secret deployment/my-app -n default
```

This shows the certificates loaded in the Envoy proxy:

```text
RESOURCE NAME          TYPE           STATUS   VALID CERT   SERIAL NUMBER   NOT AFTER           NOT BEFORE
default                Cert Chain     ACTIVE   true         abc123...       2024-03-15T00:00    2024-03-14T00:00
ROOTCA                 CA             ACTIVE   true         def456...       2034-03-12T00:00    2024-03-12T00:00
```

The `default` entry is the workload certificate used for mTLS. `ROOTCA` is the root certificate used to verify other services. Both should show `ACTIVE` status and `true` for valid cert.

To see the certificate details:

```bash
istioctl proxy-config secret deployment/my-app -n default -o json | \
  python3 -c "
import sys, json, base64, subprocess
data = json.load(sys.stdin)
for item in data.get('dynamicActiveSecrets', []):
    if item['name'] == 'default':
        cert = item['secret']['tlsCertificate']['certificateChain']['inlineBytes']
        decoded = base64.b64decode(cert)
        proc = subprocess.run(['openssl', 'x509', '-text', '-noout'], input=decoded, capture_output=True)
        print(proc.stdout.decode())
"
```

This shows you the SPIFFE identity in the certificate's SAN field, which should match the service account and namespace.

## Test mTLS from Inside a Pod

You can test whether the connection succeeds under the current mTLS policy by making a request from the application container:

```bash
kubectl exec deploy/my-app -n default -c my-app -- \
  curl -s -o /dev/null -w "%{http_code}" http://api-server.backend:8080/health
```

If mTLS is configured correctly and the application is healthy, this returns 200. If the server requires STRICT mTLS and the client is not sending it, you get a connection reset or 503. This test confirms end-to-end behavior; the application-level `curl` command itself will not show the sidecar-to-sidecar TLS handshake.

For more detail, check the proxy access logs or Envoy transport failure reason:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy | grep -i "TLS_error\|transport failure"
```

## Check Using Envoy Stats

Envoy tracks mTLS-related statistics that tell you what is happening at the connection level:

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl
```

Example stats to look for:

```text
cluster.outbound|8080||api-server.backend.svc.cluster.local.ssl.handshake: 42
cluster.outbound|8080||api-server.backend.svc.cluster.local.ssl.connection_error: 0
listener.0.0.0.0_8080.ssl.no_certificate: 0
listener.0.0.0.0_8080.ssl.fail_verify_cert_hash: 0
```

If `ssl.connection_error` or `ssl.fail_verify_cert_hash` increases while you reproduce the request, there are likely mTLS problems. Exact stat names can vary by Envoy and Istio configuration, and some stats may require proxy stats matcher settings.

## Check for Mixed-Mode Issues

A common problem is having some services in STRICT mode and others in PERMISSIVE mode, which can cause unexpected behavior. List all PeerAuthentication policies and their modes:

```bash
kubectl get peerauthentication -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
MODE:.spec.mtls.mode
```

Output:

```text
NAMESPACE      NAME      MODE
istio-system   default   STRICT
backend        special   PERMISSIVE
```

In this example, the mesh-wide policy is STRICT, but the `backend` namespace has a PERMISSIVE override. Services calling workloads in the `backend` namespace that match the `special` policy might behave differently.

## Check DestinationRule TLS Settings

DestinationRules can also affect mTLS behavior. Check if any DestinationRules are overriding the TLS mode:

```bash
kubectl get destinationrules -A -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for dr in data['items']:
    name = dr['metadata']['name']
    ns = dr['metadata']['namespace']
    tls = dr.get('spec', {}).get('trafficPolicy', {}).get('tls', {})
    if tls:
        print(f'{ns}/{name}: {tls}')
"
```

A DestinationRule with `trafficPolicy.tls.mode: DISABLE` will send plaintext traffic regardless of the PeerAuthentication policy, which breaks mTLS.

## Quick mTLS Verification Script

Here is a script to get a quick mTLS health check:

```bash
#!/bin/bash
echo "=== PeerAuthentication Policies ==="
kubectl get peerauthentication -A -o custom-columns=\
NAMESPACE:.metadata.namespace,NAME:.metadata.name,MODE:.spec.mtls.mode

echo ""
echo "=== DestinationRules with TLS Settings ==="
kubectl get dr -A -o json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for dr in data['items']:
    tls = dr.get('spec',{}).get('trafficPolicy',{}).get('tls',{})
    if tls:
        print(f\"  {dr['metadata']['namespace']}/{dr['metadata']['name']}: {tls.get('mode','unset')}\")
" 2>/dev/null || echo "  None found"

echo ""
echo "=== Proxy Certificate Status ==="
istioctl proxy-config secret deployment/${1:-my-app} -n ${2:-default} 2>/dev/null || echo "  Could not check (specify deployment and namespace)"
```

Run it with `./check-mtls.sh my-app default` for a comprehensive mTLS status check. This covers the policy layer, the destination rules, and the actual certificate state in the proxy, giving you a complete picture of your mTLS configuration.
