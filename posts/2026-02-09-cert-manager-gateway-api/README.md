# How to Use cert-manager Gateway API Integration for Certificate Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, Gateway API, TLS

Description: Learn how to automatically provision TLS certificates for Kubernetes Gateway API resources using cert-manager, including HTTPRoute and TLSRoute configuration.

---

The Kubernetes Gateway API is the next-generation routing API designed to replace Ingress. It provides more expressive and extensible traffic routing capabilities with role-oriented design. cert-manager integrates seamlessly with Gateway API to automatically provision and manage TLS certificates for Gateway listeners.

In this guide, you'll learn how to configure cert-manager with Gateway API resources, automate certificate provisioning for HTTPRoute and TLSRoute, and implement advanced certificate management patterns for modern Kubernetes networking.

## Understanding Gateway API and TLS

Gateway API introduces several resources that work together:

1. **GatewayClass** - Defines the controller implementation
2. **Gateway** - Configures infrastructure and listeners
3. **HTTPRoute/TLSRoute/TCPRoute** - Defines routing rules
4. **ReferenceGrant** - Grants cross-namespace access

Unlike Ingress, Gateway API separates infrastructure concerns (Gateway) from application routing (Routes), enabling better multi-tenancy and clearer ownership boundaries.

For TLS, Gateway API supports:
- TLS termination at the Gateway
- TLS passthrough to backend services
- Multiple certificates per Gateway listener
- SNI-based routing

## Installing Gateway API and cert-manager

First, install the Gateway API CRDs:

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Verify installation
kubectl get crd gateways.gateway.networking.k8s.io
```

Install a Gateway controller (using Envoy Gateway as example):

```bash
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.0.0 \
  --namespace envoy-gateway-system \
  --create-namespace
```

Ensure cert-manager is installed with Gateway API support:

```bash
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set "extraArgs={--enable-gateway-api}"
```

The `--enable-gateway-api` flag enables cert-manager's Gateway API integration.

## Configuring Automatic Certificate Provisioning

Create a ClusterIssuer for issuing certificates:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-gateway
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-gateway-key
    solvers:
    - http01:
        gatewayHTTPRoute:
          parentRefs:
          - name: external-gateway
            namespace: envoy-gateway-system
            kind: Gateway
```

Notice the `gatewayHTTPRoute` solver, which creates temporary HTTPRoute resources for ACME HTTP-01 challenges.

## Creating a Gateway with TLS Listeners

Define a Gateway with TLS-enabled listeners:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-gateway
  namespace: envoy-gateway-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-gateway
spec:
  gatewayClassName: eg
  listeners:
  # HTTPS listener for general traffic
  - name: https
    protocol: HTTPS
    port: 443
    hostname: "*.example.com"
    allowedRoutes:
      namespaces:
        from: All
    tls:
      mode: Terminate
      certificateRefs:
      - name: example-com-tls
        namespace: envoy-gateway-system
  # HTTP listener for redirect and ACME challenges
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

cert-manager will automatically create a Certificate resource based on the Gateway annotation.

## Defining Certificates for Gateway Listeners

Explicitly define certificates for Gateway listeners:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: envoy-gateway-system
spec:
  secretName: example-com-tls
  duration: 2160h
  renewBefore: 720h
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  usages:
    - server auth
  dnsNames:
    - example.com
    - "*.example.com"
    - api.example.com
  issuerRef:
    name: letsencrypt-gateway
    kind: ClusterIssuer
    group: cert-manager.io
```

The Gateway references this certificate in its `certificateRefs`.

## Creating HTTPRoute with Automatic TLS

Configure HTTPRoute resources that inherit TLS from the Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-app-route
  namespace: production
spec:
  parentRefs:
  - name: external-gateway
    namespace: envoy-gateway-system
  hostnames:
  - "web.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: web-app-service
      port: 80
```

Since the Gateway has a wildcard certificate for `*.example.com`, this HTTPRoute automatically gets TLS protection.

## Configuring Per-Route Certificates

For more granular control, request certificates per route using annotations:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-gateway
spec:
  parentRefs:
  - name: external-gateway
    namespace: envoy-gateway-system
    sectionName: https
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1
    backendRefs:
    - name: api-service
      port: 8080
```

cert-manager will create a Certificate for `api.example.com` and update the Gateway listener to reference it.

## Implementing TLS Passthrough with TLSRoute

For services that handle TLS termination themselves, use TLS passthrough:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: secure-service-route
  namespace: production
spec:
  parentRefs:
  - name: external-gateway
    namespace: envoy-gateway-system
    sectionName: tls-passthrough
  hostnames:
  - "secure.example.com"
  rules:
  - backendRefs:
    - name: secure-service
      port: 443
```

Add a TLS passthrough listener to the Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-gateway
  namespace: envoy-gateway-system
spec:
  gatewayClassName: eg
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    hostname: "secure.example.com"
    tls:
      mode: Passthrough
    allowedRoutes:
      namespaces:
        from: All
      kinds:
      - kind: TLSRoute
```

The backend service manages its own certificates, potentially issued by cert-manager directly.

## Multi-Tenant Certificate Management

Use ReferenceGrant to allow cross-namespace certificate references:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-cert-ref
  namespace: team-a
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: envoy-gateway-system
  to:
  - group: ""
    kind: Secret
    name: team-a-tls
```

This allows a Gateway in `envoy-gateway-system` to reference certificates in the `team-a` namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: envoy-gateway-system
spec:
  gatewayClassName: eg
  listeners:
  - name: team-a-https
    protocol: HTTPS
    port: 443
    hostname: "team-a.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: team-a-tls
        namespace: team-a
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            team: team-a
```

Teams manage their own certificates while sharing infrastructure.

## Automating Certificate Rotation

cert-manager automatically renews certificates before expiration. Monitor renewal status:

```bash
# Check certificate status
kubectl get certificate -A

# Watch certificate renewal events
kubectl get events --all-namespaces --field-selector reason=Renewed

# Force immediate renewal
kubectl annotate certificate example-com-tls \
  -n envoy-gateway-system \
  cert-manager.io/issue-temporary-certificate="true"
```

Gateway controllers automatically reload certificates when secrets are updated.

## Using DNS-01 Challenges with Gateway API

For wildcard certificates, use DNS-01 validation:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          accessKeyID: AKIAIOSFODNN7EXAMPLE
          secretAccessKeySecretRef:
            name: route53-credentials
            key: secret-access-key
      selector:
        dnsNames:
        - "*.example.com"
        - "*.apps.example.com"
```

Create wildcard certificates for Gateway listeners:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: envoy-gateway-system
spec:
  secretName: wildcard-example-com-tls
  dnsNames:
    - "*.example.com"
    - example.com
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
```

## Monitoring Gateway Certificate Health

Create Prometheus alerts for Gateway certificate issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-certificate-alerts
  namespace: monitoring
spec:
  groups:
  - name: gateway-certs
    rules:
    - alert: GatewayCertificateExpiring
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds{namespace="envoy-gateway-system"} - time()) / 86400 < 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Gateway certificate expiring soon"
        description: "Certificate {{ $labels.name }} expires in less than 7 days"

    - alert: GatewayCertificateNotReady
      expr: |
        certmanager_certificate_ready_status{condition="True",namespace="envoy-gateway-system"} == 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Gateway certificate not ready"
```

## Advanced Gateway Configurations

Implement HTTP to HTTPS redirect:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-redirect
  namespace: envoy-gateway-system
spec:
  parentRefs:
  - name: external-gateway
    sectionName: http
  hostnames:
  - "*.example.com"
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
```

Configure multiple TLS profiles for different security requirements:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-profile-gateway
  namespace: envoy-gateway-system
spec:
  gatewayClassName: eg
  listeners:
  # Modern TLS for external APIs
  - name: modern-tls
    protocol: HTTPS
    port: 443
    hostname: "api.example.com"
    tls:
      mode: Terminate
      options:
        gateway.envoyproxy.io/tls-min-version: "1.3"
        gateway.envoyproxy.io/tls-max-version: "1.3"
      certificateRefs:
      - name: api-tls
  # Compatible TLS for legacy clients
  - name: compatible-tls
    protocol: HTTPS
    port: 8443
    hostname: "legacy.example.com"
    tls:
      mode: Terminate
      options:
        gateway.envoyproxy.io/tls-min-version: "1.2"
      certificateRefs:
      - name: legacy-tls
```

## Troubleshooting Gateway API Certificate Issues

Common issues and solutions:

```bash
# Check Gateway status
kubectl describe gateway external-gateway -n envoy-gateway-system

# Verify certificate provisioning
kubectl get certificate -n envoy-gateway-system
kubectl describe certificate example-com-tls -n envoy-gateway-system

# Check HTTPRoute attachment
kubectl describe httproute web-app-route -n production

# View Gateway controller logs
kubectl logs -n envoy-gateway-system deployment/envoy-gateway -f

# Test TLS handshake
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -text
```

## Best Practices

Follow these practices for Gateway API certificate management:

1. **Use wildcard certificates** - Reduce certificate count with wildcard DNS names
2. **Separate Gateway and Routes** - Different teams manage infrastructure vs. applications
3. **Implement ReferenceGrants** - Carefully control cross-namespace access
4. **Monitor certificate expiry** - Alert before certificates expire
5. **Use DNS-01 for wildcards** - HTTP-01 doesn't support wildcard certificates
6. **Test certificate rotation** - Verify Gateway reloads certificates properly
7. **Document hostname ownership** - Maintain clear ownership of DNS names

## Conclusion

cert-manager's integration with Gateway API provides seamless, automated TLS certificate provisioning for modern Kubernetes networking. By leveraging Gateway API's expressive routing capabilities and cert-manager's robust certificate lifecycle management, you can build secure, scalable ingress infrastructure.

The combination of role-oriented design, multi-tenancy support, and automated certificate management makes Gateway API with cert-manager an excellent choice for organizations moving beyond traditional Ingress. Understanding how to configure certificates, manage cross-namespace references, and monitor certificate health ensures your gateway infrastructure remains secure and reliable.
