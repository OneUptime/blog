# How to Understand Istio's Secure Naming

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Secure Naming, SPIFFE, Identity, Security

Description: Understanding Istio's secure naming mechanism that maps service identities to service names to prevent identity spoofing attacks.

---

Secure naming is an Istio security feature that prevents a compromised workload from impersonating another service. It works by mapping service identities (SPIFFE IDs) to service names, ensuring that the certificate presented during mTLS actually belongs to the service the client intended to reach. Without secure naming, a compromised pod could intercept DNS and redirect traffic to itself while presenting a valid mesh certificate.

## The Spoofing Problem

Consider this attack scenario without secure naming:

1. Service A wants to call Service B at `service-b.default.svc.cluster.local`
2. An attacker compromises Service C and modifies DNS to point `service-b` to Service C's pod
3. Service A connects to what it thinks is Service B
4. Service C presents its valid Istio certificate (it's a legitimate mesh member)
5. The mTLS handshake succeeds because Service C has a valid certificate
6. Service A unknowingly sends sensitive data to Service C

The mTLS handshake succeeds because Service C's certificate is legitimately signed by the mesh CA. Without secure naming, mTLS only proves that the remote end is a member of the mesh, not that it's the specific service you intended to reach.

## How Secure Naming Works

Secure naming adds an extra validation step after the mTLS handshake:

1. Service A resolves `service-b.default.svc.cluster.local` and connects
2. The mTLS handshake happens, and Service A gets the peer's SPIFFE identity from the certificate SAN
3. Service A checks: "Is this SPIFFE identity authorized to serve `service-b`?"
4. If the identity matches what's expected (e.g., `spiffe://cluster.local/ns/default/sa/service-b`), the connection proceeds
5. If the identity doesn't match, the connection is rejected

The mapping between service names and authorized identities comes from Istio's service registry, which Istiod distributes to all Envoy proxies.

## The SPIFFE Identity

Every workload in Istio gets a SPIFFE identity based on its Kubernetes service account:

```
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

When Istiod configures Envoy, it tells Envoy which SPIFFE identities are allowed for each service. You can see this in the cluster configuration:

```bash
istioctl proxy-config cluster my-pod \
  --fqdn "outbound|8080||service-b.default.svc.cluster.local" -o json
```

In the output, look for the `transportSocketMatches` or `transportSocket` section, which contains the expected Subject Alternative Names:

```json
{
  "transportSocket": {
    "name": "envoy.transport_sockets.tls",
    "typedConfig": {
      "commonTlsContext": {
        "combinedValidationContext": {
          "defaultValidationContext": {
            "matchSubjectAltNames": [
              {
                "exact": "spiffe://cluster.local/ns/default/sa/service-b"
              }
            ]
          }
        }
      }
    }
  }
}
```

The `matchSubjectAltNames` field is the secure naming check. Envoy verifies that the peer certificate's SAN matches one of the expected values.

## Service Account to Service Mapping

The mapping between services and service accounts is derived from Kubernetes:

1. A Kubernetes Service selects pods via label selectors
2. The selected pods run with a specific service account
3. Istiod observes this relationship and builds the mapping
4. The mapping is pushed to Envoy as part of the cluster configuration

If `service-b` pods all run with the `service-b` service account, then the secure naming mapping is:

```
service-b.default.svc.cluster.local → spiffe://cluster.local/ns/default/sa/service-b
```

You can verify which service account a service's pods use:

```bash
kubectl get pods -l app=service-b -o jsonpath='{.items[0].spec.serviceAccountName}'
```

## Multiple Service Accounts per Service

A service might have pods running with different service accounts (e.g., during a migration). Istio handles this by allowing multiple identities per service:

```json
{
  "matchSubjectAltNames": [
    {
      "exact": "spiffe://cluster.local/ns/default/sa/service-b"
    },
    {
      "exact": "spiffe://cluster.local/ns/default/sa/service-b-v2"
    }
  ]
}
```

Envoy accepts certificates from either service account. This happens automatically when Istiod detects pods with different service accounts backing the same Kubernetes Service.

## Secure Naming and Authorization Policies

Secure naming and AuthorizationPolicy work together but at different levels:

- **Secure naming** validates that the server is who the client expects (server identity)
- **AuthorizationPolicy** controls what operations a client can perform (client permissions)

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: service-b-policy
spec:
  selector:
    matchLabels:
      app: service-b
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/service-a"
      to:
        - operation:
            methods: ["GET"]
```

In this example:
1. Secure naming ensures Service A is actually talking to Service B (not an impersonator)
2. The authorization policy ensures only Service A (and only GET requests) can access Service B
3. Both checks use the SPIFFE identity from the certificate

## Testing Secure Naming

You can verify secure naming is working by checking what SANs Envoy expects for a given service:

```bash
# Check the expected SANs for outbound connections to service-b
istioctl proxy-config cluster service-a-pod \
  --fqdn "outbound|8080||service-b.default.svc.cluster.local" -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for cluster in data:
    ts = cluster.get('transportSocket', {})
    tc = ts.get('typedConfig', {})
    ctx = tc.get('commonTlsContext', {})
    cv = ctx.get('combinedValidationContext', {})
    dv = cv.get('defaultValidationContext', {})
    sans = dv.get('matchSubjectAltNames', [])
    for san in sans:
        print(f\"Expected SAN: {san.get('exact', san.get('prefix', ''))}\")
"
```

To test that secure naming actually blocks connections, you'd need to:

1. Create a rogue service with a different service account
2. Try to redirect traffic to it (e.g., by modifying endpoints)
3. Verify the connection is rejected

In practice, you can check the Envoy logs for TLS validation failures:

```bash
istioctl proxy-config log service-a-pod --level tls:debug
kubectl logs service-a-pod -c istio-proxy | grep "SAN\|subject\|verify"
```

## Secure Naming in Multi-Cluster

In multi-cluster setups, secure naming extends across clusters. When cluster A calls a service in cluster B, the expected SANs might include identities from both clusters:

```json
{
  "matchSubjectAltNames": [
    {
      "exact": "spiffe://cluster.local/ns/default/sa/service-b"
    },
    {
      "exact": "spiffe://cluster-b.example.com/ns/default/sa/service-b"
    }
  ]
}
```

This works when trust domain aliases are configured:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster-a.example.com
    trustDomainAliases:
      - cluster-b.example.com
```

## ServiceEntry and Secure Naming

For external services defined through ServiceEntry, you can specify the expected SAN:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-service-tls
spec:
  host: external-service.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      subjectAltNames:
        - "spiffe://external.example.com/ns/prod/sa/api-server"
```

The `subjectAltNames` field in the DestinationRule acts as a secure naming check for external services. The connection is rejected if the server's certificate doesn't contain one of the listed SANs.

## Common Issues

**Connection refused with SAN mismatch:** This happens when the service account doesn't match what's expected. Check the service account of the target pods and compare with the expected SANs in the client's cluster configuration.

**Stale naming information:** If you change a service's service account, Istiod needs time to propagate the update. During this window, connections might fail. Check `istioctl proxy-status` for sync state.

Secure naming is one of those features that works silently in the background but provides a critical security guarantee. It turns mTLS from "proving you're in the mesh" to "proving you're the specific service the client wants to talk to."
