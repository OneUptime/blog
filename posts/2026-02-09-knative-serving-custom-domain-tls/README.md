# How to Configure Knative Serving with Custom Domain Mapping and TLS on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Knative, Serverless

Description: Configure Knative Serving with custom domain names and automatic TLS certificates for serverless applications on Kubernetes with domain mapping and Let's Encrypt integration.

---

Knative Serving enables serverless deployments on Kubernetes with automatic scaling to zero. Using custom domains makes your services accessible at user-friendly URLs instead of generated names. Adding TLS encryption secures traffic to your serverless functions. This guide shows you how to configure custom domains and TLS certificates for Knative services.

## Installing Knative Serving

Install Knative Serving components:

```bash
# Install Knative Serving CRDs
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.0/serving-crds.yaml

# Install Knative Serving core
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.12.0/serving-core.yaml

# Install networking layer (Kourier)
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.12.0/kourier.yaml

# Configure Knative to use Kourier
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Verify installation
kubectl get pods -n knative-serving
kubectl get pods -n kourier-system
```

## Installing cert-manager for TLS

Deploy cert-manager to automate certificate management:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

Create a ClusterIssuer for Let's Encrypt:

```yaml
# letsencrypt-issuer.yaml
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
          class: kourier
```

Apply the issuer:

```bash
kubectl apply -f letsencrypt-issuer.yaml
```

## Configuring Custom Domain

Configure Knative to use your custom domain:

```yaml
# custom-domain-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  # Replace example.com with your domain
  example.com: ""
```

Apply the configuration:

```bash
kubectl apply -f custom-domain-config.yaml
```

## Deploying a Knative Service

Create a simple Knative service:

```yaml
# hello-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Enable scale-to-zero
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "10"
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Knative"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Deploy the service:

```bash
kubectl apply -f hello-service.yaml

# Check service status
kubectl get ksvc hello

# Get the URL
kubectl get ksvc hello -o jsonpath='{.status.url}'
```

## Setting Up DNS

Point your domain to the Kourier LoadBalancer:

```bash
# Get Kourier external IP
kubectl get svc kourier -n kourier-system

# Create DNS A record
# hello.example.com -> <EXTERNAL-IP>
```

For AWS Route53:

```bash
# Get LoadBalancer hostname
KOURIER_LB=$(kubectl get svc kourier -n kourier-system -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create Route53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$KOURIER_LB'"}]
      }
    }]
  }'
```

## Configuring Automatic TLS

Enable auto-TLS in Knative:

```yaml
# auto-tls-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-network
  namespace: knative-serving
data:
  auto-tls: "Enabled"
  http-protocol: "Redirected"
  certificate.class: "cert-manager.certificate.networking.knative.dev"
```

Apply the configuration:

```bash
kubectl apply -f auto-tls-config.yaml
```

Configure cert-manager integration:

```yaml
# certmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-certmanager
  namespace: knative-serving
data:
  issuerRef: |
    kind: ClusterIssuer
    name: letsencrypt-prod
```

Apply the configuration:

```bash
kubectl apply -f certmanager-config.yaml
```

## Creating Domain Mappings

Map custom domains to services:

```yaml
# domain-mapping.yaml
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: api.example.com
  namespace: default
spec:
  ref:
    name: hello
    kind: Service
    apiVersion: serving.knative.dev/v1
---
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: hello.example.com
  namespace: default
spec:
  ref:
    name: hello
    kind: Service
    apiVersion: serving.knative.dev/v1
```

Apply domain mappings:

```bash
kubectl apply -f domain-mapping.yaml

# Check domain mapping status
kubectl get domainmapping

# Verify certificate was issued
kubectl get certificate -n default
```

## Testing the Service

Test your service with the custom domain:

```bash
# Test HTTP (should redirect to HTTPS)
curl -v http://hello.example.com

# Test HTTPS
curl https://hello.example.com

# Check certificate details
openssl s_client -connect hello.example.com:443 -servername hello.example.com < /dev/null | openssl x509 -text
```

## Deploying Multiple Services with Subdomains

Create multiple services with different subdomains:

```yaml
# api-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/api:latest
        ports:
        - containerPort: 8080
---
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: api.example.com
spec:
  ref:
    name: api
    kind: Service
---
# web-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: web
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/web:latest
        ports:
        - containerPort: 8080
---
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: www.example.com
spec:
  ref:
    name: web
    kind: Service
```

## Configuring Traffic Splitting

Split traffic between service revisions:

```yaml
# traffic-split.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  traffic:
  - revisionName: hello-v1
    percent: 80
    tag: current
  - revisionName: hello-v2
    percent: 20
    tag: canary
  - latestRevision: true
    percent: 0
    tag: latest
```

Create domain mappings for tags:

```yaml
# tag-domain-mapping.yaml
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: current.hello.example.com
spec:
  ref:
    name: hello
    kind: Service
    apiVersion: serving.knative.dev/v1
---
apiVersion: serving.knative.dev/v1beta1
kind: DomainMapping
metadata:
  name: canary.hello.example.com
spec:
  ref:
    name: hello
    kind: Service
```

## Monitoring Certificate Renewal

Monitor certificate status:

```bash
# Check certificate details
kubectl describe certificate hello-example-com -n default

# Check certificate expiration
kubectl get certificate hello-example-com -n default -o jsonpath='{.status.notAfter}'

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f
```

Create alerts for certificate expiration:

```yaml
# certificate-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-alerts
  namespace: default
spec:
  groups:
  - name: certificates
    interval: 1h
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
      for: 1h
      annotations:
        summary: "Certificate expiring in less than 7 days"
        description: "Certificate {{ $labels.name }} expires in {{ $value }} seconds"

    - alert: CertificateRenewalFailed
      expr: certmanager_certificate_ready_status{condition="False"} == 1
      for: 15m
      annotations:
        summary: "Certificate renewal failed"
        description: "Certificate {{ $labels.name }} failed to renew"
```

## Implementing Custom TLS Certificates

Use your own certificates instead of Let's Encrypt:

```yaml
# custom-tls-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: custom-tls-cert
  namespace: default
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAK...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvQIBADANBgkqhkiG9w0...
    -----END PRIVATE KEY-----
---
# service-with-custom-cert.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: custom-cert-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        serving.knative.dev/tls-secret: custom-tls-cert
    spec:
      containers:
      - image: your-registry/app:latest
```

## Troubleshooting

Common issues and solutions:

```bash
# Check Knative service status
kubectl describe ksvc hello

# View Knative controller logs
kubectl logs -n knative-serving deployment/controller -f

# Check certificate issuance
kubectl describe certificate -n default

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check DNS resolution
nslookup hello.example.com

# Verify LoadBalancer connectivity
kubectl get svc kourier -n kourier-system

# Test without certificate validation
curl -k https://hello.example.com
```

## Best Practices

Follow these guidelines:

1. **Use wildcard certificates** - Simpler for multiple subdomains
2. **Configure DNS before creating services** - Avoid rate limits
3. **Monitor certificate expiration** - Set up alerts
4. **Use staging issuer for testing** - Avoid Let's Encrypt rate limits
5. **Implement rate limiting** - Protect serverless endpoints
6. **Configure appropriate timeouts** - Match function execution time
7. **Use DomainMappings** - Better than annotations for domain management
8. **Test certificate renewal** - Verify automation works

## Conclusion

Knative Serving with custom domains and automatic TLS provides a professional serverless platform on Kubernetes. By configuring domain mappings, integrating cert-manager for automatic certificate management, and properly setting up DNS, you create user-friendly, secure endpoints for your serverless applications. Monitor certificate health, test renewal processes, and use traffic splitting for safe deployments. This combination delivers enterprise-grade serverless capabilities with minimal operational overhead.
