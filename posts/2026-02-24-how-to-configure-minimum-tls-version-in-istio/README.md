# How to Configure Minimum TLS Version in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Security, Compliance, Service Mesh

Description: How to enforce minimum TLS version requirements across your Istio service mesh for compliance and security hardening.

---

Running old TLS versions is a security risk. TLS 1.0 and 1.1 have known vulnerabilities, and most compliance frameworks (PCI DSS, HIPAA, SOC 2) require TLS 1.2 as a minimum. Istio gives you the ability to enforce minimum TLS versions at multiple levels - mesh-wide, per-gateway, and per-destination.

By default, Istio uses TLS 1.2 for sidecar-to-sidecar mTLS, which is good. But if you have gateways accepting external traffic or destination rules connecting to external services, you need to explicitly configure the minimum TLS version to prevent downgrade attacks.

## Checking Your Current TLS Version

Before changing anything, find out what TLS versions your mesh currently accepts. Check the Envoy configuration on a gateway pod:

```bash
istioctl proxy-config listener istio-ingressgateway-xxxx -n istio-system -o json | \
  jq '.[].filterChains[].transportSocket.typedConfig.commonTlsContext.tlsParams'
```

If this returns null or empty for `tlsMinimumProtocolVersion`, Envoy uses its default, which depends on the Envoy version but typically allows TLS 1.2 and above.

## Mesh-Wide Minimum TLS Version

To set a minimum TLS version across the entire mesh for sidecar-to-sidecar communication, configure it in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_3
```

Valid values are:
- `TLS_AUTO` - Let Envoy decide (default)
- `TLSV1_2` - Minimum TLS 1.2
- `TLSV1_3` - Minimum TLS 1.3

Apply the configuration:

```bash
istioctl install -f istio-tls-config.yaml -y
```

After applying, all sidecar-to-sidecar mTLS connections will require at least the specified TLS version. Connections from clients that only support older versions will be rejected.

## Gateway TLS Version Configuration

For ingress gateways, you configure the minimum TLS version on the Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: main-tls-cert
        minProtocolVersion: TLSV1_2
        maxProtocolVersion: TLSV1_3
      hosts:
        - "app.example.com"
```

This configuration ensures the gateway only accepts TLS 1.2 and 1.3 connections. You can also set `maxProtocolVersion` if you need to restrict the upper bound, though in practice there is rarely a reason to limit the maximum.

To enforce TLS 1.3 only:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tls13-only-gateway
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
        credentialName: tls-cert
        minProtocolVersion: TLSV1_3
      hosts:
        - "modern-app.example.com"
```

## DestinationRule TLS Version for Upstream Connections

When your mesh connects to external services, you can specify the TLS version in the DestinationRule. This is important when connecting to legacy systems that might try to negotiate an older TLS version:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: api.external.com
```

Note that DestinationRule does not directly support `minProtocolVersion` in the same way Gateway does. To control TLS versions for outbound connections, you use EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: min-tls-outbound
  namespace: istio-system
spec:
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: api.external.com
      patch:
        operation: MERGE
        value:
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
              common_tls_context:
                tls_params:
                  tls_minimum_protocol_version: TLSv1_2
                  tls_maximum_protocol_version: TLSv1_3
```

## Verifying TLS Version Enforcement

After configuring the minimum TLS version, verify it is working correctly.

Test the gateway from outside the cluster:

```bash
# This should fail if minimum is TLS 1.2
openssl s_client -connect gateway-ip:443 -tls1_1 -servername app.example.com

# This should succeed
openssl s_client -connect gateway-ip:443 -tls1_2 -servername app.example.com

# This should also succeed
openssl s_client -connect gateway-ip:443 -tls1_3 -servername app.example.com
```

For a failed connection (TLS 1.1 when minimum is 1.2), you will see an error like:

```text
SSL routines:ssl3_read_bytes:tlsv1 alert protocol version
```

Check the negotiated TLS version on a successful connection:

```bash
openssl s_client -connect gateway-ip:443 -servername app.example.com 2>/dev/null | \
  grep "Protocol"
```

Expected output:

```text
Protocol  : TLSv1.3
```

## Checking Internal Mesh TLS Version

To verify what TLS version is used for sidecar-to-sidecar connections, use `istioctl`:

```bash
istioctl proxy-config listener <pod-name> -o json | \
  jq '.[].filterChains[].transportSocket.typedConfig.commonTlsContext.tlsParams'
```

You can also look at the actual TLS handshake between services using Envoy stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl.versions
```

This shows counters for each TLS version used in connections.

## Monitoring TLS Version Usage

Set up Prometheus metrics to track TLS version usage across the mesh. Envoy exposes TLS version statistics that you can query:

```bash
# Check TLS version stats on a specific pod
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl.*version"
```

In Prometheus, you can query:

```text
envoy_listener_ssl_versions{envoy_ssl_version="TLSv1.2"}
envoy_listener_ssl_versions{envoy_ssl_version="TLSv1.3"}
```

If you see any connections using TLS 1.0 or 1.1, investigate the source and either update the client or block the connection.

## Gradual Rollout Strategy

Do not flip the switch to TLS 1.3-only across your entire mesh at once. Follow a gradual approach:

1. Start by monitoring current TLS version usage to understand your baseline
2. Set the minimum to TLS 1.2 mesh-wide (this is usually safe and should be your first step)
3. Test critical paths and verify no clients are broken
4. Identify services that need to support TLS 1.2 for legacy clients
5. Set mesh-wide minimum to TLS 1.3, with exceptions for specific services

For services that need to support older clients during a transition period, you can use workload-specific settings:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: legacy-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-legacy
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: legacy-cert
        minProtocolVersion: TLSV1_2
      hosts:
        - "legacy.example.com"
    - port:
        number: 8443
        name: https-modern
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: modern-cert
        minProtocolVersion: TLSV1_3
      hosts:
        - "modern.example.com"
```

This way, legacy clients can still connect on one hostname while modern clients get the stronger TLS 1.3 on another.

Setting minimum TLS versions is one of the easier security wins in Istio. Do it early, monitor the impact, and keep pushing toward TLS 1.3 as your clients and dependencies catch up.
