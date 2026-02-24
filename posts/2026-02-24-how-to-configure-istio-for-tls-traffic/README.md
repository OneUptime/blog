# How to Configure Istio for TLS Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, mTLS, Service Mesh, Kubernetes, Security

Description: A complete guide to configuring Istio for TLS traffic including TLS origination, passthrough, termination, and mutual TLS settings for secure service communication.

---

TLS in Istio can mean a few different things depending on where you are in the traffic flow. There is the automatic mTLS between sidecars, TLS termination at the gateway, TLS origination to external services, and TLS passthrough for services that handle their own encryption. Each scenario has its own configuration, and mixing them up is a common source of confusion.

## Understanding TLS Modes in Istio

Before getting into configuration, it helps to understand the four TLS modes that Istio supports at the Gateway level:

- **SIMPLE**: Standard TLS termination. The gateway decrypts traffic and forwards it as plain text (or re-encrypts with mTLS) to the backend.
- **MUTUAL**: The gateway requires the client to present a certificate. Both sides authenticate each other.
- **PASSTHROUGH**: The gateway does not terminate TLS. It forwards the encrypted traffic as-is to the backend, which handles decryption.
- **AUTO_PASSTHROUGH**: Similar to PASSTHROUGH but uses the SNI header to route traffic without requiring a VirtualService.

## TLS Termination at the Gateway

The most common setup is terminating TLS at the ingress gateway. You need a TLS certificate stored as a Kubernetes secret:

```bash
kubectl create secret tls my-app-cert \
  --cert=server.crt \
  --key=server.key \
  -n istio-system
```

Then configure the Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: tls-gateway
  namespace: default
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
        credentialName: my-app-cert
      hosts:
        - app.example.com
```

The `credentialName` must match the name of the Kubernetes secret. The secret must be in the same namespace as the ingress gateway (usually `istio-system`), unless you are using a custom ingress gateway deployment.

## Mutual TLS at the Gateway

For services that need client certificate authentication, use MUTUAL mode:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: mtls-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-mtls
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: my-app-cert
      hosts:
        - secure.example.com
```

For MUTUAL mode, the secret needs to include the CA certificate used to verify client certificates. Create the secret like this:

```bash
kubectl create secret generic my-app-cert \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key \
  --from-file=ca.crt=ca.crt \
  -n istio-system
```

Note that this uses a generic secret instead of a TLS secret because we need the extra `ca.crt` field.

## TLS Passthrough

When your backend application handles TLS itself and you do not want the gateway to decrypt traffic, use PASSTHROUGH mode:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: passthrough-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls-passthrough
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - backend.example.com
```

With passthrough, routing is based on the SNI (Server Name Indication) header because the gateway cannot inspect the encrypted payload. Your VirtualService must use TLS matching:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-passthrough
  namespace: default
spec:
  hosts:
    - backend.example.com
  gateways:
    - passthrough-gateway
  tls:
    - match:
        - port: 443
          sniHosts:
            - backend.example.com
      route:
        - destination:
            host: backend.default.svc.cluster.local
            port:
              number: 8443
```

Notice that the VirtualService uses the `tls` section, not the `http` section. This is because the traffic is encrypted and cannot be routed using HTTP-level attributes.

## Mesh-Wide mTLS with PeerAuthentication

Within the mesh, Istio can automatically encrypt all traffic between sidecars using mutual TLS. This is controlled by PeerAuthentication:

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

Applying this in the `istio-system` namespace makes it mesh-wide. Every service must communicate over mTLS. If you have services without sidecars that need to communicate with meshed services, use PERMISSIVE mode instead:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode accepts both plain text and mTLS traffic. This is the default in recent Istio versions and is useful during migration.

## Per-Service mTLS

You can override the mesh-wide mTLS policy for individual services:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-service
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-app
  mtls:
    mode: DISABLE
```

You can also configure different modes per port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mixed-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  portLevelMtls:
    8080:
      mode: STRICT
    9090:
      mode: PERMISSIVE
```

## TLS Origination to External Services

When your mesh service needs to talk to an external HTTPS endpoint, you can configure TLS origination so that your application sends plain HTTP and the sidecar handles the TLS handshake:

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
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-route
  namespace: default
spec:
  hosts:
    - api.external.com
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: api.external.com
            port:
              number: 443
```

With this setup, your application sends HTTP requests to `api.external.com:80`, and the sidecar transparently upgrades them to HTTPS when connecting to the external service on port 443.

## Verifying TLS Configuration

Check which TLS mode is active for a specific service:

```bash
istioctl authn tls-check deploy/my-app -n default
```

This shows you whether each destination is using mTLS, plain text, or permissive mode. You can also check the certificate details:

```bash
istioctl proxy-config secret deploy/my-app -n default
```

To see the actual TLS handshake happening, enable debug logging on the sidecar:

```bash
istioctl proxy-config log deploy/my-app --level connection:debug,tls:debug
```

Then watch the logs for TLS handshake details:

```bash
kubectl logs deploy/my-app -c istio-proxy -f | grep -i tls
```

## Common TLS Pitfalls

A few things that regularly trip people up:

1. **Secret namespace**: The TLS secret must be in the same namespace as the ingress gateway pod, not the namespace of your application.

2. **Certificate chain**: If your certificate has intermediate CAs, the `tls.crt` file must contain the full chain (server cert + intermediates).

3. **SNI routing**: When using PASSTHROUGH mode, routing only works based on SNI. If your client does not send an SNI header, routing will fail.

4. **Double encryption**: If your application already uses TLS and you have mTLS enabled, traffic between the sidecar and your application might be double-encrypted. This is usually fine from a security standpoint but wastes CPU. Consider disabling application-level TLS if mTLS provides sufficient security.

5. **Certificate rotation**: Istio automatically rotates the certificates used for mTLS between sidecars. For gateway certificates, you need to handle rotation yourself by updating the Kubernetes secret.

## Summary

TLS configuration in Istio covers multiple scenarios: termination at the gateway, mutual TLS for client authentication, passthrough for end-to-end encryption, and TLS origination for external services. Understanding which mode to use and where to apply it is the key to getting TLS right. For mesh-internal traffic, rely on Istio's automatic mTLS. For gateway traffic, choose between SIMPLE, MUTUAL, and PASSTHROUGH based on your security requirements.
