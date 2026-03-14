# How to Configure Gateway API with TLS Termination via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Gateway API, TLS, HTTPS, Cert-Manager, HelmRelease

Description: Configure Kubernetes Gateway API with TLS termination using Flux CD, integrating cert-manager for automatic certificate provisioning and managing HTTPS routing for production workloads.

---

## Introduction

The Kubernetes Gateway API replaces the traditional Ingress resource with a richer, role-oriented model for managing cluster entry points. TLS configuration in Gateway API is explicit and expressive: Gateways define listeners with TLS modes, certificates are referenced from Secrets, and cert-manager integrates seamlessly to provide automatic certificate lifecycle management.

Managing Gateway API TLS configuration through Flux CD creates a complete GitOps lifecycle for your HTTPS infrastructure. Certificate references, listener configurations, and routing rules are all committed to Git, reviewed in pull requests, and automatically applied. When a certificate rotates, cert-manager updates the Secret and Envoy picks up the change without any manual intervention.

This guide configures complete TLS termination using the Kubernetes Gateway API, cert-manager for certificate provisioning, and Flux CD for lifecycle management - covering both single-domain and wildcard certificate scenarios.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A Gateway API implementation deployed (Envoy Gateway, Contour, or similar)
- cert-manager deployed and configured with a ClusterIssuer
- kubectl with cluster-admin access
- A domain name with DNS pointing to your Gateway's LoadBalancer IP

## Step 1: Ensure Gateway API CRDs Are Installed

Verify the Gateway API CRDs are available at the correct version.

```bash
# Check installed Gateway API CRDs
kubectl get crd | grep gateway.networking.k8s.io

# Expected output:
# gatewayclasses.gateway.networking.k8s.io
# gateways.gateway.networking.k8s.io
# httproutes.gateway.networking.k8s.io
# referencegrants.gateway.networking.k8s.io

# Check the installed CRD version
kubectl get crd gateways.gateway.networking.k8s.io \
  -o jsonpath='{.spec.versions[*].name}'
```

## Step 2: Configure cert-manager ClusterIssuer

Set up cert-manager with a Let's Encrypt ClusterIssuer managed by Flux.

```yaml
# infrastructure/cert-manager/clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      # HTTP-01 challenge using Gateway API
      - http01:
          gatewayHTTPRoute:
            parentRefs:
              - name: production-gateway
                namespace: envoy-gateway-system
                kind: Gateway
```

## Step 3: Create a Certificate Resource

Request a TLS certificate from Let's Encrypt for your domain.

```yaml
# infrastructure/tls/api-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-tls
  namespace: envoy-gateway-system
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # cert-manager will store the certificate in this Secret
  secretName: api-example-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
  # Auto-renew 30 days before expiration
  renewBefore: 720h  # 30 days
---
# Wildcard certificate for multiple subdomains
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-tls
  namespace: envoy-gateway-system
spec:
  secretName: wildcard-example-tls
  issuerRef:
    name: letsencrypt-prod-dns01  # Requires DNS-01 challenge for wildcards
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
  renewBefore: 720h
```

## Step 4: Configure Gateway Listeners with TLS

Define a Gateway with both HTTP (redirect) and HTTPS (terminate) listeners.

```yaml
# infrastructure/gateway/production-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: envoy-gateway-system
  annotations:
    # Reference the cert-manager Certificate resource
    cert-manager.io/cluster-issuer: letsencrypt-prod
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  gatewayClassName: envoy-gateway
  listeners:
    # HTTP listener for redirect only
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All

    # Primary HTTPS listener with TLS termination
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          # Reference the Secret created by cert-manager
          - name: api-example-tls
            namespace: envoy-gateway-system
            kind: Secret
      allowedRoutes:
        namespaces:
          from: All

    # Separate listener for wildcard domain
    - name: https-wildcard
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-example-tls
            namespace: envoy-gateway-system
      allowedRoutes:
        namespaces:
          from: All
```

## Step 5: Add HTTP-to-HTTPS Redirect Route

Create an HTTPRoute that redirects all HTTP traffic to HTTPS.

```yaml
# infrastructure/gateway/https-redirect.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: https-redirect
  namespace: envoy-gateway-system
spec:
  parentRefs:
    - name: production-gateway
      sectionName: http  # Attach to the HTTP listener only
  # Match all hostnames on the HTTP listener
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: https
            statusCode: 301
```

## Step 6: Grant Cross-Namespace Certificate Access

When HTTPRoutes in application namespaces need to reference certificates in the gateway namespace, use ReferenceGrant.

```yaml
# infrastructure/gateway/reference-grants.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-backend-to-gateway
  namespace: envoy-gateway-system
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: backend
  to:
    - group: ""
      kind: Secret
      name: api-example-tls
```

```yaml
# clusters/production/tls-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-tls
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/tls
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cert-manager
    - name: envoy-gateway
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: api-example-tls
      namespace: envoy-gateway-system
```

```bash
# Verify cert-manager issued the certificate
kubectl get certificate -n envoy-gateway-system
kubectl describe certificate api-example-tls -n envoy-gateway-system

# Check the Secret was created
kubectl get secret api-example-tls -n envoy-gateway-system

# Verify Gateway listener status
kubectl describe gateway production-gateway -n envoy-gateway-system

# Test HTTPS connectivity and certificate
curl -I https://api.example.com/health
echo | openssl s_client -servername api.example.com -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -issuer -dates

# Test HTTP redirect
curl -I http://api.example.com/health
```

## Best Practices

- Use `renewBefore: 720h` (30 days) on all Certificate resources to ensure cert-manager renews certificates well before expiration; Let's Encrypt certificates expire after 90 days.
- Never commit TLS certificate Private Keys to Git; cert-manager stores them in Kubernetes Secrets automatically - use Sealed Secrets or ESO to manage the `letsencrypt-prod-account-key` Secret.
- Use different Certificate resources for different domains rather than listing all domains in one Certificate; this limits the blast radius if a certificate renewal fails.
- Monitor certificate expiration with Prometheus alerts on the `certmanager_certificate_expiration_timestamp_seconds` metric; set alerts at 30 and 7 days to expiration.
- Test certificate renewal in staging before relying on it in production; cert-manager's staging Let's Encrypt issuer uses the same renewal logic without the rate limits.
- Use DNS-01 challenges for wildcard certificates since HTTP-01 cannot validate wildcard domains.

## Conclusion

Gateway API TLS termination with cert-manager, managed by Flux CD, provides a fully automated HTTPS infrastructure where certificates are requested, renewed, and rotated without human intervention. The Gateway API's explicit listener model makes TLS configuration easy to audit, and cert-manager's integration with Let's Encrypt eliminates certificate management toil entirely. The result is a secure, automated HTTPS layer that requires zero ongoing maintenance.
