# How to Configure ArgoCD with External Certificate Managers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Cert-Manager

Description: A practical guide to integrating ArgoCD with external certificate managers like cert-manager, Venafi, and AWS ACM for automated TLS management.

---

Managing TLS certificates manually for ArgoCD is tedious and error-prone. External certificate managers automate the entire lifecycle - issuance, renewal, and rotation. This guide covers how to integrate ArgoCD with the most popular certificate management solutions.

## Why Use an External Certificate Manager

When you install ArgoCD, it generates self-signed certificates by default. These work for development but fall short in production for several reasons. Self-signed certificates trigger browser warnings. They do not automatically renew. And they do not integrate with your organization's PKI infrastructure.

External certificate managers solve all of these problems. They issue certificates from trusted CAs, handle renewal automatically, and integrate with enterprise PKI systems.

## cert-manager Integration

cert-manager is the most popular certificate management solution for Kubernetes. It works with multiple issuers including Let's Encrypt, Venafi, HashiCorp Vault, and self-signed CAs.

### Installing cert-manager

If you do not already have cert-manager installed:

```bash
# Install cert-manager using Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

### Setting Up a ClusterIssuer

For production, use Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

For internal services, a CA issuer is often more appropriate:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-keypair
```

### Creating the ArgoCD Certificate

Create a Certificate resource that tells cert-manager to issue a certificate for ArgoCD:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: argocd.example.com
  dnsNames:
    - argocd.example.com
  duration: 8760h    # 1 year
  renewBefore: 720h  # Renew 30 days before expiry
  privateKey:
    algorithm: RSA
    size: 4096
```

cert-manager will automatically create the `argocd-server-tls` secret with the certificate and private key. ArgoCD watches this secret and uses it for its HTTPS endpoint.

### Configuring ArgoCD Ingress with cert-manager

The most common approach is to use cert-manager annotations on the Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

With this annotation, cert-manager automatically creates and manages the certificate referenced in `spec.tls[].secretName`.

## Venafi Integration

Venafi is an enterprise certificate management platform. cert-manager has a Venafi issuer that integrates with both Venafi Trust Protection Platform and Venafi as a Service.

### Installing the Venafi Issuer

```bash
# The Venafi issuer is built into cert-manager
# Just configure it as an issuer
```

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: venafi-issuer
spec:
  venafi:
    zone: "DevOps\\ArgoCD"
    tpp:
      url: https://venafi.example.com/vedsdk
      credentialsRef:
        name: venafi-tpp-credentials
```

Create the credentials secret:

```bash
kubectl create secret generic venafi-tpp-credentials \
  --namespace cert-manager \
  --from-literal=username=admin \
  --from-literal=password='your-password'
```

Then create your ArgoCD certificate using this issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: venafi-issuer
    kind: ClusterIssuer
  commonName: argocd.example.com
  dnsNames:
    - argocd.example.com
  duration: 8760h
  renewBefore: 720h
```

## AWS Certificate Manager (ACM) Integration

AWS ACM does not directly provision certificates into Kubernetes secrets. Instead, you terminate TLS at the AWS Load Balancer level.

### Using ACM with AWS ALB Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/backend-protocol: HTTPS
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

Since TLS terminates at the ALB, you need to configure ArgoCD to run in insecure mode (HTTP behind the load balancer) or keep HTTPS with self-signed certs for the internal connection:

```yaml
# In argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"  # Disable TLS on the server since ALB handles it
```

## HashiCorp Vault PKI Integration

Vault's PKI secrets engine can act as a certificate authority. cert-manager integrates with it through the Vault issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.example.com
    path: pki/sign/argocd
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

This setup lets Vault manage the CA while cert-manager handles the certificate lifecycle within Kubernetes.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
  commonName: argocd.example.com
  dnsNames:
    - argocd.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
```

## Managing Internal Component Certificates

For internal ArgoCD component communication, you can also use cert-manager. Create certificates for the repo server:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-repo-server-tls
  namespace: argocd
spec:
  secretName: argocd-repo-server-tls
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  commonName: argocd-repo-server
  dnsNames:
    - argocd-repo-server
    - argocd-repo-server.argocd.svc
    - argocd-repo-server.argocd.svc.cluster.local
  duration: 8760h
  renewBefore: 720h
```

## Verifying the Integration

After setting up your certificate manager, verify everything works:

```bash
# Check the certificate status
kubectl get certificate -n argocd

# Check the certificate details
kubectl describe certificate argocd-server-tls -n argocd

# Verify the actual TLS certificate being served
echo | openssl s_client -connect argocd.example.com:443 \
  -servername argocd.example.com 2>/dev/null | \
  openssl x509 -noout -text | head -20
```

## Conclusion

Using an external certificate manager with ArgoCD eliminates the manual toil of certificate management. cert-manager is the most versatile option, supporting Let's Encrypt, Venafi, Vault, and many other issuers. For AWS-native environments, ACM with ALB termination is the simplest path. Whatever solution you choose, the key is automating the certificate lifecycle so you never have to worry about expired certificates breaking your GitOps pipeline.

For more on TLS configuration, see our guide on [rotating TLS certificates in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-rotate-tls-certificates/view).
