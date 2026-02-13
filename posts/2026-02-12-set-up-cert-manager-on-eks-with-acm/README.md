# How to Set Up cert-manager on EKS with ACM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, TLS, Security

Description: Learn how to set up cert-manager on Amazon EKS and integrate with AWS Certificate Manager for automated TLS certificate management for your Kubernetes workloads.

---

TLS certificates are table stakes for any production service, but managing them manually is painful. Certificates expire, renewal is easy to forget, and distributing them across a Kubernetes cluster adds another layer of complexity. cert-manager automates the entire lifecycle - requesting, issuing, renewing, and rotating certificates - so you never have to think about it again.

On EKS, you have two main approaches to TLS: terminate SSL at the ALB using ACM certificates (the simpler option), or use cert-manager to provision certificates for your pods directly. This guide covers both approaches, since each has its place.

## Option 1: ACM Certificates at the ALB (Simple Approach)

If you're using an ALB Ingress, the simplest way to get TLS is through AWS Certificate Manager. ACM certificates are free, auto-renewing, and managed entirely by AWS. You just reference the certificate ARN in your Ingress annotations.

Request a certificate in ACM:

```bash
# Request a public certificate in ACM
aws acm request-certificate \
  --domain-name "*.example.com" \
  --validation-method DNS \
  --subject-alternative-names "example.com" \
  --region us-west-2
```

Complete the DNS validation (ACM will tell you what CNAME record to add to your domain), then reference it in your Ingress:

```yaml
# ingress-with-acm.yaml - ALB Ingress using ACM certificate
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-west-2:123456789012:certificate/abc-def-123
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

This terminates TLS at the ALB. Traffic between the ALB and your pods is unencrypted (within the VPC), which is fine for most use cases. For more on ALB Ingress, see our [ALB setup guide](https://oneuptime.com/blog/post/2026-02-12-set-up-ingress-with-alb-on-eks/view).

## Option 2: cert-manager for Pod-Level TLS

When you need end-to-end encryption, mTLS, or you're using an ingress controller other than ALB (like NGINX), cert-manager is the way to go.

## Installing cert-manager

Install cert-manager using Helm:

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::123456789012:role/cert-manager-role"
```

Verify the installation:

```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# Verify the webhook is working
kubectl get apiservice v1.cert-manager.io
```

## Setting Up a Let's Encrypt Issuer

The most common cert-manager setup uses Let's Encrypt. Create a ClusterIssuer with DNS01 validation through Route 53:

First, create the IAM policy for Route 53 access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
    },
    {
      "Effect": "Allow",
      "Action": "route53:ListHostedZonesByName",
      "Resource": "*"
    }
  ]
}
```

Create the IRSA service account:

```bash
# Create IRSA for cert-manager
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace cert-manager \
  --name cert-manager \
  --attach-policy-arn arn:aws:iam::123456789012:policy/CertManagerRoute53Policy \
  --approve \
  --override-existing-serviceaccounts
```

Now create the ClusterIssuer:

```yaml
# cluster-issuer.yaml - Let's Encrypt with Route 53 DNS validation
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - dns01:
          route53:
            region: us-west-2
            hostedZoneID: Z1234567890ABC
```

For testing, use the staging server first to avoid rate limits:

```yaml
# cluster-issuer-staging.yaml - Let's Encrypt staging for testing
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      - dns01:
          route53:
            region: us-west-2
            hostedZoneID: Z1234567890ABC
```

```bash
# Apply the issuers
kubectl apply -f cluster-issuer.yaml
kubectl apply -f cluster-issuer-staging.yaml
```

## Requesting Certificates

Create a Certificate resource to request a TLS certificate:

```yaml
# certificate.yaml - Request a certificate from Let's Encrypt
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: default
spec:
  secretName: app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - api.example.com
```

```bash
# Apply and monitor the certificate request
kubectl apply -f certificate.yaml
kubectl get certificate app-tls -w
```

The certificate goes through several stages: Pending, then Ready once cert-manager completes the DNS challenge and receives the certificate from Let's Encrypt.

Check the status:

```bash
# Detailed certificate status
kubectl describe certificate app-tls

# Check the certificate request
kubectl get certificaterequest

# Verify the secret was created
kubectl get secret app-tls-secret
```

## Using Certificates with NGINX Ingress

If you're using NGINX ingress controller instead of ALB, cert-manager can provision certificates automatically via annotations:

```yaml
# nginx-ingress-with-cert.yaml - Automatic TLS with cert-manager
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-auto
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

cert-manager sees the annotation, creates a Certificate resource automatically, completes the challenge, and stores the resulting certificate in the `app-tls-auto` secret.

## Certificate Renewal

cert-manager automatically renews certificates before they expire (by default, 30 days before expiration). You don't need to do anything - it just works. You can verify the renewal schedule:

```bash
# Check when a certificate will be renewed
kubectl get certificate app-tls -o jsonpath='{.status.renewalTime}'
```

## Troubleshooting

If a certificate is stuck in a pending state, trace the issue through the cert-manager resources:

```bash
# Check the Certificate
kubectl describe certificate app-tls

# Check the CertificateRequest
kubectl describe certificaterequest -l cert-manager.io/certificate-name=app-tls

# Check the Challenge (for ACME issuers)
kubectl describe challenge -l cert-manager.io/certificate-name=app-tls

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=100
```

Common issues include Route 53 permission errors, DNS propagation delays, and rate limits on the Let's Encrypt production server.

Whether you go with ACM at the ALB layer or cert-manager for pod-level TLS, automating certificate management removes one of the most annoying operational tasks from your plate. Combined with [ExternalDNS](https://oneuptime.com/blog/post/2026-02-12-set-up-external-dns-on-eks-with-route-53/view), you get a fully automated workflow from deployment to working HTTPS endpoint.
