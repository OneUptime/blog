# How to Set Up Wildcard TLS Certificates on Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Wildcard Certificate, Gateway, Kubernetes

Description: How to configure wildcard TLS certificates on Istio ingress gateway to serve all subdomains under a single domain with one certificate and automatic renewal.

---

If you have multiple subdomains like `api.example.com`, `app.example.com`, and `admin.example.com`, managing individual TLS certificates for each one gets tedious fast. A wildcard certificate covers all subdomains under a domain with a single certificate. Instead of managing 10 certificates for 10 subdomains, you manage one certificate for `*.example.com`.

Setting this up with Istio is straightforward, and when you add cert-manager to the mix, the certificate renews itself automatically.

## Creating a Wildcard TLS Secret

If you already have a wildcard certificate from your CA, create the secret:

```bash
kubectl create secret tls wildcard-example-cert \
  --cert=wildcard.example.com.crt \
  --key=wildcard.example.com.key \
  -n istio-system
```

For testing, generate a self-signed wildcard certificate:

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout wildcard.example.com.key \
  -out wildcard.example.com.crt \
  -days 365 -nodes \
  -subj "/CN=*.example.com" \
  -addext "subjectAltName=DNS:*.example.com,DNS:example.com"
```

Note that we include both `*.example.com` and `example.com` in the SAN (Subject Alternative Name). The wildcard only covers subdomains, not the root domain itself.

## Configuring the Istio Gateway

Create a Gateway that uses the wildcard certificate:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: wildcard-gateway
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
        credentialName: wildcard-example-cert
      hosts:
        - "*.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "*.example.com"
```

The `hosts` field uses `*.example.com` to match any subdomain. The HTTP server redirects all HTTP traffic to HTTPS.

## Routing to Different Services

Now create VirtualService resources for each subdomain:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - wildcard-gateway
  http:
    - route:
        - destination:
            host: api-service.default.svc.cluster.local
            port:
              number: 80

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-vs
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - wildcard-gateway
  http:
    - route:
        - destination:
            host: app-service.default.svc.cluster.local
            port:
              number: 80

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: admin-vs
  namespace: default
spec:
  hosts:
    - "admin.example.com"
  gateways:
    - wildcard-gateway
  http:
    - route:
        - destination:
            host: admin-service.default.svc.cluster.local
            port:
              number: 80
```

Each VirtualService matches a specific subdomain and routes to the corresponding backend service. They all use the same gateway, which uses the same wildcard certificate.

## Adding the Root Domain

If you also want to serve the root domain `example.com` (without the subdomain), you need to include it in the gateway. A wildcard certificate for `*.example.com` does not cover the bare domain:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: wildcard-gateway
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
        credentialName: wildcard-example-cert
      hosts:
        - "*.example.com"
        - "example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "*.example.com"
        - "example.com"
```

This works because most CAs issue wildcard certificates with both `*.example.com` and `example.com` in the SAN field. Make sure your certificate includes the bare domain.

## Automatic Certificate Management with cert-manager

For production, use cert-manager with Let's Encrypt to get free, automatically renewed wildcard certificates. Wildcard certificates require DNS-01 validation (HTTP-01 does not work for wildcards).

First, install cert-manager:

```bash
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true
```

Create a ClusterIssuer with DNS-01 challenge. Here is an example using Cloudflare DNS:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          cloudflare:
            email: admin@example.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

Create the Cloudflare API token secret:

```bash
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token=<your-cloudflare-api-token> \
  -n cert-manager
```

For AWS Route53:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1234567890
```

Now create the Certificate resource:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-cert
  namespace: istio-system
spec:
  secretName: wildcard-example-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
```

cert-manager will:
1. Create a DNS TXT record for `_acme-challenge.example.com`
2. Validate with Let's Encrypt
3. Store the certificate in the `wildcard-example-cert` secret
4. Renew automatically before expiry

## Handling Multiple Wildcard Domains

If you have multiple domains, you can use separate wildcard certificates for each:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: multi-wildcard-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-example
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: wildcard-example-cert
      hosts:
        - "*.example.com"
    - port:
        number: 443
        name: https-anotherdomain
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: wildcard-anotherdomain-cert
      hosts:
        - "*.anotherdomain.com"
```

Istio uses SNI to determine which certificate to serve based on the requested hostname.

## Verifying the Setup

Test your wildcard certificate:

```bash
# Get the gateway IP
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test different subdomains
curl -v --resolve api.example.com:443:$GATEWAY_IP https://api.example.com/
curl -v --resolve app.example.com:443:$GATEWAY_IP https://app.example.com/

# Check the certificate details
openssl s_client -connect $GATEWAY_IP:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"

# Check certificate loaded in Envoy
INGRESS_POD=$(kubectl get pods -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config secrets $INGRESS_POD -n istio-system
```

## Troubleshooting

**Certificate not matching:** Make sure the SAN field in the certificate includes `*.example.com`. Some CAs issue certificates where the CN is the wildcard but the SAN only has the specific domain. Both need the wildcard.

**DNS-01 challenge failing:** Check that the DNS API credentials are correct and that cert-manager has permission to create TXT records. Check cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager -f
```

**New subdomains not working:** With wildcard certificates, adding a new subdomain only requires a new VirtualService and a DNS record pointing to the gateway IP. No certificate changes needed.

## Summary

Wildcard TLS certificates on Istio simplify certificate management when you have multiple subdomains. Instead of managing individual certificates, one wildcard covers everything. The Gateway resource uses `*.example.com` as the host pattern, and VirtualService resources route specific subdomains to their backends. For production use, combine with cert-manager using DNS-01 challenges for automatic issuance and renewal. Remember that wildcards only cover one level of subdomains and do not include the bare domain, so include the bare domain separately in your certificate SAN.
