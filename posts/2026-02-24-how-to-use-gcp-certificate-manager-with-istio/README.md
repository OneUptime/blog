# How to Use GCP Certificate Manager with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GCP, Certificate Manager, TLS, GKE, Security

Description: How to use Google Cloud Certificate Manager with Istio for automated TLS certificate provisioning and management on GKE.

---

Managing TLS certificates is one of those tasks that nobody enjoys but everybody needs to get right. Google Cloud Certificate Manager provides automated certificate provisioning, renewal, and deployment for GCP load balancers. Integrating it with Istio gives you a hands-off approach to TLS certificate management. There are multiple ways to do this depending on whether you want the load balancer or Istio to terminate TLS.

## GCP Certificate Manager Overview

Certificate Manager supports three types of certificates:

- **Google-managed certificates**: GCP provisions and renews certificates automatically via DNS or load balancer authorization
- **Self-managed certificates**: You upload your own certificate and key
- **Certificate Authority Service certificates**: Certificates issued by GCP's private CA

For Istio, the most interesting option is Google-managed certificates since they automate the entire lifecycle.

## Approach 1: Certificate Manager with HTTP(S) Load Balancer

The most straightforward approach is to terminate TLS at a GCP HTTP(S) load balancer using Certificate Manager, then forward plain HTTP to Istio.

Create a certificate map:

```bash
# Create a DNS authorization
gcloud certificate-manager dns-authorizations create app-dns-auth \
  --domain="app.example.com"

# Get the CNAME record to add to your DNS
gcloud certificate-manager dns-authorizations describe app-dns-auth \
  --format="value(dnsResourceRecord.name, dnsResourceRecord.type, dnsResourceRecord.data)"
```

Add the CNAME record to your DNS zone, then create the certificate:

```bash
gcloud certificate-manager certificates create app-cert \
  --domains="app.example.com,api.example.com" \
  --dns-authorizations=app-dns-auth
```

Create a certificate map and map entry:

```bash
# Create a certificate map
gcloud certificate-manager maps create app-cert-map

# Create a map entry for the primary domain
gcloud certificate-manager maps entries create app-cert-entry \
  --map=app-cert-map \
  --certificates=app-cert \
  --hostname="app.example.com"

# Create an entry for the API domain
gcloud certificate-manager maps entries create api-cert-entry \
  --map=app-cert-map \
  --certificates=app-cert \
  --hostname="api.example.com"
```

Now configure the Istio ingress gateway to use a ClusterIP service with NEGs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: ClusterIP
        serviceAnnotations:
          cloud.google.com/neg: '{"exposed_ports":{"8080":{"name":"istio-neg"}}}'
```

Create the load balancer with the certificate map:

```bash
# Health check
gcloud compute health-checks create http istio-hc \
  --port 15021 \
  --request-path /healthz/ready

# Backend service
gcloud compute backend-services create istio-be \
  --protocol HTTP \
  --health-checks istio-hc \
  --global

# Add NEG backend
gcloud compute backend-services add-backend istio-be \
  --network-endpoint-group istio-neg \
  --network-endpoint-group-zone us-central1-a \
  --balancing-mode RATE \
  --max-rate-per-endpoint 100 \
  --global

# URL map
gcloud compute url-maps create istio-urlmap \
  --default-service istio-be

# Create HTTPS proxy with certificate map
gcloud compute target-https-proxies create istio-https-proxy \
  --url-map istio-urlmap \
  --certificate-map app-cert-map

# Forwarding rule
gcloud compute forwarding-rules create istio-https-fw \
  --global \
  --target-https-proxy istio-https-proxy \
  --ports 443
```

Configure the Istio Gateway to accept HTTP (since TLS is terminated at the load balancer):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
    - "api.example.com"
```

## Approach 2: Certificate Manager with GKE Gateway API

If your GKE cluster supports the Gateway API, you can integrate Certificate Manager more directly:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-gateway
  namespace: istio-system
  annotations:
    networking.gke.io/certmap: app-cert-map
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
  addresses:
  - type: NamedAddress
    value: istio-gateway-ip
```

This creates a managed HTTP(S) load balancer that uses the certificate map. Traffic is forwarded to your Istio ingress gateway.

## Approach 3: Using GCP CA Service with Istio

For certificates that Istio terminates itself (not at the load balancer), use GCP Certificate Authority Service (CA Service) with cert-manager:

First, create a CA pool in GCP:

```bash
gcloud privateca pools create istio-ca-pool \
  --location us-central1 \
  --tier devops

gcloud privateca roots create istio-root-ca \
  --pool istio-ca-pool \
  --location us-central1 \
  --subject "CN=My Istio CA,O=MyCompany"
```

Install cert-manager with the Google CAS issuer:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true

# Install the Google CAS issuer
kubectl apply -f https://github.com/jetstack/google-cas-issuer/releases/latest/download/google-cas-issuer.yaml
```

Create the issuer:

```yaml
apiVersion: cas-issuer.jetstack.io/v1beta1
kind: GoogleCASClusterIssuer
metadata:
  name: gcp-cas-issuer
spec:
  project: my-project
  location: us-central1
  caPoolId: istio-ca-pool
```

Request a certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: istio-system
spec:
  secretName: app-tls-credential
  issuerRef:
    name: gcp-cas-issuer
    kind: GoogleCASClusterIssuer
    group: cas-issuer.jetstack.io
  dnsNames:
  - "app.example.com"
  - "api.example.com"
  duration: 720h
  renewBefore: 168h
```

Use the certificate in the Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-credential
    hosts:
    - "app.example.com"
    - "api.example.com"
```

## Wildcard Certificates

Certificate Manager supports wildcard certificates, which is handy if you have many subdomains:

```bash
gcloud certificate-manager certificates create wildcard-cert \
  --domains="*.example.com,example.com" \
  --dns-authorizations=example-dns-auth
```

Add it to the certificate map with a wildcard entry:

```bash
gcloud certificate-manager maps entries create wildcard-entry \
  --map=app-cert-map \
  --certificates=wildcard-cert \
  --hostname="*.example.com"
```

## Certificate Renewal and Monitoring

Google-managed certificates renew automatically - that is the whole point. But you should still monitor certificate status:

```bash
# Check certificate status
gcloud certificate-manager certificates describe app-cert

# List all certificates
gcloud certificate-manager certificates list
```

Set up alerts for certificate issues:

```bash
gcloud monitoring policies create --policy-from-file=cert-alert.json
```

Where `cert-alert.json` monitors the SSL certificate expiration metric.

## Handling Multiple Environments

For staging and production, use separate certificate maps:

```bash
gcloud certificate-manager maps create staging-cert-map
gcloud certificate-manager maps create prod-cert-map
```

Each environment gets its own load balancer with its own certificate map, pointing to the respective Istio ingress gateway.

GCP Certificate Manager takes the pain out of TLS certificate management for Istio deployments. Whether you terminate TLS at the load balancer with Google-managed certificates or use CA Service for Istio-terminated TLS, the automation and integration with GKE make certificate management something you can set up once and largely forget about.
