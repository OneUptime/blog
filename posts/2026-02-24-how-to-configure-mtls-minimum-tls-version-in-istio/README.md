# How to Configure mTLS Minimum TLS Version in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, TLS Version, Security, Compliance

Description: How to configure the minimum TLS version for mutual TLS connections in Istio to meet security compliance requirements like PCI DSS.

---

TLS 1.0 and 1.1 have known vulnerabilities and are deprecated by most security standards. PCI DSS requires TLS 1.2 or higher. NIST guidelines recommend TLS 1.3. If you are running Istio in a regulated environment, you need to enforce a minimum TLS version for all mTLS connections in the mesh.

By default, Istio supports TLS 1.2 and 1.3 for mTLS connections. TLS 1.0 and 1.1 are not enabled for mesh-internal mTLS traffic. But you can explicitly configure the minimum version to satisfy auditors and prevent accidental downgrades.

## Where TLS Version is Configured

Istio has several places where TLS version settings apply:

1. **Mesh-wide configuration** - The global default for all sidecars
2. **Gateway configuration** - For ingress and egress gateways
3. **DestinationRule** - For specific service-to-service connections

Each serves a different purpose, and you might need to configure all of them.

## Mesh-Wide Minimum TLS Version

To set the minimum TLS version for all mTLS traffic in the mesh, configure it in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_3
```

Valid values:
- `TLSV1_2` - TLS 1.2 minimum
- `TLSV1_3` - TLS 1.3 minimum

Apply:

```bash
istioctl install -f mesh-tls-config.yaml
```

Or update the existing mesh config:

```bash
kubectl edit configmap istio -n istio-system
```

Add under the `mesh` key:

```yaml
meshMTLS:
  minProtocolVersion: TLSV1_3
```

Then restart istiod:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

## Setting TLS Version on Gateways

Ingress gateways handle traffic from external clients, and you should set the minimum TLS version explicitly:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
      minProtocolVersion: TLSV1_2
      maxProtocolVersion: TLSV1_3
```

The Gateway resource supports both `minProtocolVersion` and `maxProtocolVersion` fields.

For mTLS gateways (like egress gateways with ISTIO_MUTUAL):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - "*.example.com"
    tls:
      mode: ISTIO_MUTUAL
      minProtocolVersion: TLSV1_3
```

## Setting TLS Version in DestinationRules

For specific service connections, set the TLS version in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: strict-tls-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

Note that the DestinationRule `tls` section does not directly support minProtocolVersion for ISTIO_MUTUAL mode. The TLS version for mesh-internal mTLS is controlled by the mesh-wide configuration. The DestinationRule's TLS version settings apply when using `SIMPLE` or `MUTUAL` modes for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-dr
  namespace: production
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: api.external.com
```

## TLS 1.2 vs TLS 1.3

### TLS 1.2

- Widely supported by all modern systems
- Required minimum for PCI DSS compliance
- Uses a two-round-trip handshake
- Supports a wide range of cipher suites (some weaker than others)

### TLS 1.3

- Faster handshake (one round trip, or zero with session resumption)
- Removes legacy cipher suites (no RC4, no DES, no SHA-1)
- Forward secrecy is mandatory
- Simplified protocol with fewer configuration options (harder to misconfigure)

For mesh-internal mTLS, TLS 1.3 is recommended. The performance improvement from the faster handshake matters when you have thousands of connections being established between services.

## Verifying the TLS Version in Use

### Check the Envoy Configuration

```bash
istioctl proxy-config listener <pod-name> -n <namespace> --port 8080 -o json | \
  jq '.[].filterChains[].transportSocket.typedConfig.commonTlsContext.tlsParams'
```

This shows the TLS parameters configured on the listener, including the minimum and maximum protocol versions.

### Check Actual Connection Stats

Envoy tracks which TLS versions are used:

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET /stats | grep "ssl.versions"
```

Example output:

```text
listener.0.0.0.0_8080.ssl.versions.TLSv1.2: 0
listener.0.0.0.0_8080.ssl.versions.TLSv1.3: 1523
```

This confirms that all connections are using TLS 1.3 and none are using TLS 1.2.

### Check via Access Logs

If you have customized access logs to include TLS information:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=50 | grep "TLSv"
```

## Cipher Suite Configuration

Along with the TLS version, you might need to control which cipher suites are used. Istio supports cipher suite configuration on Gateway resources:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: strict-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "secure.example.com"
    tls:
      mode: SIMPLE
      credentialName: secure-cert
      minProtocolVersion: TLSV1_2
      cipherSuites:
      - ECDHE-ECDSA-AES256-GCM-SHA384
      - ECDHE-RSA-AES256-GCM-SHA384
      - ECDHE-ECDSA-AES128-GCM-SHA256
      - ECDHE-RSA-AES128-GCM-SHA256
```

Note: cipher suite configuration for TLS 1.3 is fixed by the TLS 1.3 specification and cannot be customized.

For mesh-internal mTLS, you can configure cipher suites through Envoy's mesh-wide configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_2
```

## Compliance Validation

For audit purposes, you might need to prove that the minimum TLS version is enforced. Here is how to generate evidence:

### Export TLS Configuration

```bash
# Mesh-wide config
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' > mesh-config.yaml

# Gateway configs
kubectl get gateway --all-namespaces -o yaml > gateways.yaml

# DestinationRule TLS configs
kubectl get destinationrule --all-namespaces -o yaml > destinationrules.yaml
```

### Run Compliance Check Script

```bash
#!/bin/bash

echo "TLS Compliance Check"
echo "===================="

# Check mesh-wide config
MESH_TLS=$(kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | \
  grep -A 2 meshMTLS | grep minProtocolVersion)
echo "Mesh-wide minimum TLS: ${MESH_TLS:-not set (default TLS 1.2)}"

# Check gateways
echo ""
echo "Gateway TLS versions:"
kubectl get gateway --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): \(.spec.servers[].tls.minProtocolVersion // "not set")"'

# Check active TLS versions across pods
echo ""
echo "Active TLS versions (sampled):"
for pod in $(kubectl get pods -n production -o jsonpath='{.items[0..4].metadata.name}' 2>/dev/null); do
  versions=$(kubectl exec $pod -n production -c istio-proxy -- \
    pilot-agent request GET /stats 2>/dev/null | grep "ssl.versions" | grep -v ":0$")
  if [ -n "$versions" ]; then
    echo "  $pod:"
    echo "    $versions"
  fi
done
```

## Troubleshooting TLS Version Issues

### Connection Fails After Requiring TLS 1.3

If some pods cannot connect after setting `minProtocolVersion: TLSV1_3`, the issue might be:

1. Older sidecar versions that do not support TLS 1.3
2. Custom Envoy builds without TLS 1.3 support
3. External services that only support TLS 1.2

Check the Envoy version:

```bash
kubectl exec <pod-name> -c istio-proxy -- envoy --version
```

### Mixed TLS Versions in the Mesh

During an upgrade, some sidecars might be on different versions. Use the stats to check:

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET /stats | grep "ssl.versions"
```

If you see TLS 1.2 connections when you expect only TLS 1.3, check if all pods have been restarted to pick up the new configuration.

Setting a minimum TLS version is a straightforward change with significant compliance implications. For most production environments, requiring TLS 1.2 as a minimum is the safe choice. If your entire infrastructure supports it, TLS 1.3 gives you better security and performance.
