# How to Use cert-manager HTTP-01 Challenge with Ingress for Domain Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Networking

Description: Learn how to configure cert-manager HTTP-01 challenges with Kubernetes Ingress controllers for automated domain validation and TLS certificate issuance.

---

HTTP-01 challenges provide the simplest path to automated TLS certificates in Kubernetes. Unlike DNS-01 challenges that require DNS provider integration, HTTP-01 challenges work through your existing Ingress controller by responding to validation requests over HTTP. This makes them ideal for public-facing services with standard domain configurations.

The HTTP-01 challenge works by having cert-manager create a temporary Ingress resource that responds to Let's Encrypt validation requests at a specific path on your domain. Let's Encrypt makes an HTTP request to `http://yourdomain.com/.well-known/acme-challenge/token`, and cert-manager responds with the expected validation value. Once validated, Let's Encrypt issues your certificate.

## Understanding HTTP-01 Challenge Requirements

HTTP-01 challenges have specific requirements that affect their applicability:

The domain must be publicly accessible on port 80. Let's Encrypt validation servers must reach your domain via standard HTTP. This means your Ingress controller needs to handle port 80 traffic, and any firewalls must allow inbound HTTP.

Each domain requires separate validation. Unlike DNS-01 challenges that can validate wildcard domains, HTTP-01 validates one domain at a time. To secure api.example.com, app.example.com, and web.example.com, you need three separate validations.

The validation happens through your Ingress controller. cert-manager creates temporary Ingress resources for the validation path, and your Ingress controller routes Let's Encrypt requests to cert-manager's solver pods.

## Setting Up HTTP-01 with nginx Ingress

Let's start with the most common scenario: nginx Ingress controller. First, ensure you have nginx Ingress installed:

```bash
# Check nginx Ingress installation
kubectl get pods -n ingress-nginx

# Install nginx Ingress if needed
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

Create a ClusterIssuer configured for HTTP-01 challenges:

```yaml
# letsencrypt-http01-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-http01
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory

    # Email for certificate expiration notifications
    email: certificates@example.com

    # Secret for ACME account private key
    privateKeySecretRef:
      name: letsencrypt-http01-account-key

    # HTTP-01 solver configuration
    solvers:
    - http01:
        ingress:
          # Ingress class to use for challenge solving
          class: nginx
```

Apply the ClusterIssuer:

```bash
kubectl apply -f letsencrypt-http01-issuer.yaml

# Verify the ClusterIssuer is ready
kubectl get clusterissuer letsencrypt-http01
kubectl describe clusterissuer letsencrypt-http01
```

## Automatic Certificate Creation via Ingress Annotations

The easiest way to use HTTP-01 challenges is through Ingress annotations. cert-manager watches Ingresses with specific annotations and automatically creates corresponding Certificate resources:

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    # Tell cert-manager to manage this certificate
    cert-manager.io/cluster-issuer: "letsencrypt-http01"
    # Specify Ingress class
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    # cert-manager creates/updates this secret automatically
    secretName: app-example-com-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

When you apply this Ingress, cert-manager:
1. Detects the cert-manager.io/cluster-issuer annotation
2. Creates a Certificate resource for app.example.com
3. Initiates the HTTP-01 challenge
4. Creates a temporary Ingress for the validation path
5. Stores the issued certificate in app-example-com-tls secret

Monitor the process:

```bash
# Apply the Ingress
kubectl apply -f app-ingress.yaml

# Watch Certificate creation
kubectl get certificate -n production -w

# Check Certificate status
kubectl describe certificate app-example-com-tls -n production

# View challenge progress
kubectl get challenge -n production
```

The entire process typically completes in 1-2 minutes for publicly accessible domains.

## Manual Certificate Creation

For more control, create Certificate resources explicitly instead of relying on Ingress annotations:

```yaml
# app-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-example-com
  namespace: production
spec:
  # Secret where certificate will be stored
  secretName: app-example-com-tls

  # Certificate lifecycle
  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  # Issuer reference
  issuerRef:
    name: letsencrypt-http01
    kind: ClusterIssuer

  # Domain configuration
  commonName: app.example.com
  dnsNames:
  - app.example.com
```

Then reference the certificate secret in your Ingress:

```yaml
# app-ingress-manual.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - app.example.com
    # Reference the manually created certificate
    secretName: app-example-com-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

This approach separates certificate management from Ingress configuration, which is useful when multiple Ingresses share the same certificate.

## HTTP-01 with Traefik Ingress

Traefik requires slightly different configuration. First, configure the ClusterIssuer for Traefik:

```yaml
# letsencrypt-http01-traefik.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-traefik
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-traefik-account-key
    solvers:
    - http01:
        ingress:
          # Specify Traefik as the Ingress class
          class: traefik
```

Then create an Ingress with Traefik annotations:

```yaml
# traefik-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-traefik"
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - app.example.com
    secretName: app-example-com-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Handling Multiple Domains

For applications serving multiple domains, include all domains in the certificate:

```yaml
# multi-domain-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: multi-domain-cert
  namespace: production
spec:
  secretName: multi-domain-tls
  issuerRef:
    name: letsencrypt-http01
    kind: ClusterIssuer
  # Multiple domains in single certificate
  dnsNames:
  - app.example.com
  - api.example.com
  - dashboard.example.com
```

cert-manager performs HTTP-01 validation for each domain separately. All domains must be publicly accessible and point to your Ingress controller.

Use the multi-domain certificate in your Ingress:

```yaml
# multi-domain-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-domain-ingress
  namespace: production
spec:
  tls:
  - hosts:
    - app.example.com
    - api.example.com
    - dashboard.example.com
    secretName: multi-domain-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

## Custom Solver Configuration

Sometimes you need more control over the solver Ingress. Configure custom Ingress annotations or settings:

```yaml
# custom-solver-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-custom-solver
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-custom-solver-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
          # Pod template for the solver pods
          podTemplate:
            metadata:
              labels:
                app: cert-manager-solver
            spec:
              # Run solver pods with specific node selector
              nodeSelector:
                kubernetes.io/role: ingress
              # Set resource limits for solver pods
              containers:
              - name: acmesolver
                resources:
                  limits:
                    cpu: 100m
                    memory: 64Mi
                  requests:
                    cpu: 10m
                    memory: 16Mi
          # Service type for solver service
          serviceType: ClusterIP
          # Annotations to add to solver Ingress
          ingressTemplate:
            metadata:
              annotations:
                nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

This configuration customizes solver pod scheduling, resources, and the generated Ingress annotations.

## Troubleshooting HTTP-01 Challenges

### Challenge Timeout Issues

If challenges time out, check if Let's Encrypt can reach your domain:

```bash
# Test from outside your cluster
curl http://yourdomain.com/.well-known/acme-challenge/test

# Check solver pod logs
kubectl logs -n cert-manager -l acme.cert-manager.io/http01-solver=true

# Verify solver Ingress was created
kubectl get ingress --all-namespaces -l acme.cert-manager.io/http01-solver=true
```

Common issues include:
- Firewall blocking port 80
- DNS not pointing to Ingress controller
- Ingress controller not routing challenge paths correctly

### Certificate Pending State

If certificates stay in Pending state:

```bash
# Check Certificate status
kubectl describe certificate <cert-name> -n <namespace>

# View CertificateRequest
kubectl get certificaterequest -n <namespace>

# Check Challenge resources
kubectl describe challenge <challenge-name> -n <namespace>
```

Look for error messages in the Certificate events and Challenge status.

### Port 80 Redirect Issues

Some Ingress configurations redirect all HTTP to HTTPS, which breaks HTTP-01 challenges. Ensure the solver Ingress allows HTTP:

```yaml
solvers:
- http01:
    ingress:
      class: nginx
      ingressTemplate:
        metadata:
          annotations:
            # Disable SSL redirect for challenge paths
            nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

## Load Balancer Considerations

When using cloud load balancers with Ingress:

Ensure the load balancer listens on port 80. Let's Encrypt validation requires HTTP access.

Configure health checks to allow challenge paths. Some load balancers have health check paths that might interfere with challenge validation.

Set appropriate timeouts. Challenge validation should complete quickly, but ensure load balancer timeouts don't interfere.

## Best Practices

Use staging environment for testing. Let's Encrypt staging server has higher rate limits and prevents hitting production limits during troubleshooting:

```yaml
# Use staging server for testing
server: https://acme-staging-v02.api.letsencrypt.org/directory
```

Enable HTTP on your Ingress controllers. HTTP-01 requires port 80 access, so ensure your security policies allow inbound HTTP while redirecting regular traffic to HTTPS after validation.

Monitor certificate expiration separately from renewal automation. While cert-manager handles renewal, external monitoring provides defense in depth.

Use ClusterIssuers for shared configuration across namespaces. This reduces duplication and ensures consistent certificate policies.

Set appropriate renewal windows. The default 30-day renewal window provides sufficient buffer for retry attempts if renewal initially fails.

## Conclusion

HTTP-01 challenges provide straightforward automated certificate management for publicly accessible Kubernetes services. Integration with Ingress controllers makes it nearly transparent - add an annotation, and cert-manager handles the rest. While limited to non-wildcard certificates and requiring public HTTP access, these constraints are acceptable for most standard web applications.

Combined with automatic renewal, HTTP-01 challenges eliminate manual certificate management and the risk of expired certificates causing outages. This automation is essential for modern cloud-native applications where certificate lifecycle management needs to be fully automated.
