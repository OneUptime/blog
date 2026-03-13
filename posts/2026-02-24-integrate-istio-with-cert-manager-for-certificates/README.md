# How to Integrate Istio with cert-manager for Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Cert-Manager, TLS, Kubernetes, Certificates, Security

Description: A practical guide to integrating Istio with cert-manager for automated TLS certificate management in your Kubernetes cluster.

---

Managing TLS certificates manually is one of those things that sounds simple until you actually have to do it at scale. Certificates expire, renewals get missed, and suddenly your production services start throwing TLS errors at 2 AM. That is exactly why cert-manager exists, and when you pair it with Istio, you get a pretty solid automated certificate management pipeline.

## Why Use cert-manager with Istio

Istio comes with its own internal CA called istiod that handles mTLS certificates for service-to-service communication. But when you need certificates for ingress gateways, external-facing services, or you want to use a specific CA like Let's Encrypt, cert-manager is the go-to solution.

cert-manager runs as a Kubernetes controller that watches for Certificate resources and automatically provisions, renews, and manages TLS certificates from various issuers.

## Prerequisites

You need a running Kubernetes cluster with Istio installed. If you do not have cert-manager yet, install it with Helm:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Verify cert-manager is running:

```bash
kubectl get pods -n cert-manager
```

You should see three pods running: the main controller, the webhook, and the cainjector.

## Setting Up a ClusterIssuer

Before you can issue any certificates, you need an issuer. For production workloads, Let's Encrypt is the most common choice. Here is a ClusterIssuer that uses the HTTP-01 challenge:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: istio
```

Apply it:

```bash
kubectl apply -f cluster-issuer.yaml
```

For testing, swap the server URL to the staging endpoint so you do not hit rate limits:

```yaml
server: https://acme-staging-v02.api.letsencrypt.org/directory
```

## Issuing Certificates for Istio Gateway

The most common use case is getting certificates for your Istio ingress gateway. Create a Certificate resource that tells cert-manager what you need:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-cert
  namespace: istio-system
spec:
  secretName: my-app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - myapp.example.com
  - www.myapp.example.com
```

Apply this and cert-manager will create a TLS secret called `my-app-tls` in the `istio-system` namespace:

```bash
kubectl apply -f certificate.yaml

# Check the certificate status
kubectl get certificate -n istio-system
kubectl describe certificate my-app-cert -n istio-system
```

## Configuring the Istio Gateway to Use the Certificate

Now wire up your Istio Gateway to use the certificate secret:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-app-gateway
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
      credentialName: my-app-tls
    hosts:
    - myapp.example.com
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - myapp.example.com
```

The `credentialName` field points to the Kubernetes secret that cert-manager created. Istio's ingress gateway will pick it up automatically.

## Using DNS-01 Challenge with Cloud Providers

HTTP-01 challenges require your cluster to be reachable from the internet. If you are working with internal services or want wildcard certificates, DNS-01 is the way to go. Here is an example using AWS Route53:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          hostedZoneID: Z1234567890
```

You will need to configure IAM permissions for cert-manager to modify Route53 records. Create an IAM policy and either use IRSA (IAM Roles for Service Accounts) or provide access keys through a secret.

Wildcard certificates become possible with DNS-01:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: istio-system
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  dnsNames:
  - "*.example.com"
  - example.com
```

## Integrating cert-manager as Istio's CA

Beyond gateway certificates, you can actually replace Istio's internal CA with cert-manager. This gives you a unified certificate management layer. Install the istio-csr component:

```bash
helm install istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.server.clusterID=Kubernetes"
```

Then install or reconfigure Istio to use istio-csr as its CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-system
  components:
    pilot:
      k8s:
        env:
        - name: ENABLE_CA_SERVER
          value: "false"
```

This setup means all mTLS certificates in the mesh go through cert-manager, which can then use whatever backend CA you configure.

## Monitoring Certificate Health

Certificates will expire if something goes wrong with the renewal process. Set up monitoring so you catch issues early:

```bash
# Check all certificates across namespaces
kubectl get certificates --all-namespaces

# Look for certificates that are not ready
kubectl get certificates --all-namespaces -o jsonpath='{range .items[?(@.status.conditions[0].status!="True")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

cert-manager exposes Prometheus metrics by default. You can create alerts for certificates nearing expiry:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
spec:
  groups:
  - name: cert-manager
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expires in less than 7 days"
```

## Troubleshooting Common Issues

If certificates are not being issued, start with the cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager
```

Check the Certificate, CertificateRequest, and Order resources:

```bash
kubectl describe certificate my-app-cert -n istio-system
kubectl get certificaterequests -n istio-system
kubectl get orders -n cert-manager
kubectl get challenges -n cert-manager
```

A common problem is the ingress gateway not picking up new certificates. Istio caches TLS secrets, but it should detect changes within a few seconds. If the gateway still serves the old certificate, check that the secret is in the right namespace and the `credentialName` matches exactly.

Another frequent issue is the HTTP-01 solver not being reachable. Make sure your Istio gateway allows traffic on port 80 and that the `.well-known/acme-challenge` path is not blocked by any AuthorizationPolicy or VirtualService routing rules.

## Wrapping Up

Combining Istio with cert-manager gives you automated certificate lifecycle management that actually works. The gateway certificates get renewed before they expire, and if you go the istio-csr route, your entire mesh uses the same certificate infrastructure. The key thing is to set up proper monitoring so you know when renewals fail before your users do.
