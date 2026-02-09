# How to Implement cert-manager DNS-01 Challenge with Route53 for Wildcard Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, AWS

Description: Learn how to configure cert-manager with AWS Route53 DNS-01 challenges to issue wildcard TLS certificates for Kubernetes applications with automated domain validation.

---

Wildcard certificates secure all subdomains under a domain with a single certificate. Instead of managing separate certificates for api.example.com, app.example.com, and dashboard.example.com, you issue one certificate for *.example.com that covers all subdomains. This simplifies certificate management significantly in microservices architectures.

However, wildcard certificates require DNS-01 challenge validation. Unlike HTTP-01 challenges that verify domain ownership through HTTP endpoints, DNS-01 challenges verify ownership by creating specific DNS TXT records. This guide shows how to configure cert-manager with AWS Route53 to automate DNS-01 challenges for wildcard certificate issuance.

## Understanding DNS-01 Challenges

The DNS-01 challenge works by having cert-manager create a TXT record in your DNS zone with a specific value provided by the ACME server. Let's Encrypt queries this record to verify you control the domain's DNS. Once verified, it issues the certificate.

This approach enables wildcard certificates because it proves control over the entire domain, not just specific subdomains. It also works for domains not publicly accessible via HTTP, making it suitable for internal services.

The challenge requires cert-manager to have DNS provider credentials with permission to create and delete TXT records in your hosted zone. For AWS Route53, this means IAM permissions to modify DNS records.

## Prerequisites

You need:
- A Kubernetes cluster with cert-manager installed
- A domain with DNS managed by AWS Route53
- AWS credentials with Route53 permissions (covered below)
- IAM role for service accounts (IRSA) configured (recommended for EKS)

## Configuring IAM Permissions

Create an IAM policy granting Route53 permissions for cert-manager:

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
      "Resource": "arn:aws:route53:::hostedzone/*"
    },
    {
      "Effect": "Allow",
      "Action": "route53:ListHostedZonesByName",
      "Resource": "*"
    }
  ]
}
```

Save this as `cert-manager-route53-policy.json` and create the policy:

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name CertManagerRoute53Policy \
  --policy-document file://cert-manager-route53-policy.json

# Note the policy ARN from output
```

For EKS clusters, create an IAM role with this policy and configure IRSA:

```bash
# Create IAM role for service accounts
eksctl create iamserviceaccount \
  --name cert-manager \
  --namespace cert-manager \
  --cluster your-cluster-name \
  --attach-policy-arn arn:aws:iam::YOUR-ACCOUNT-ID:policy/CertManagerRoute53Policy \
  --approve \
  --override-existing-serviceaccounts
```

This creates an IAM role and annotates the cert-manager service account to use it. cert-manager pods automatically receive AWS credentials through the projected service account token.

## Creating a ClusterIssuer with Route53

Now configure a ClusterIssuer that uses Route53 for DNS-01 challenges:

```yaml
# letsencrypt-dns01-route53.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns01
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-dns01-account-key
    solvers:
    - dns01:
        route53:
          # AWS region where your Route53 hosted zone resides
          region: us-east-1

          # Optionally specify hosted zone ID for faster lookups
          # hostedZoneID: Z1234567890ABC

          # When using IRSA, no need to specify credentials
          # cert-manager uses the service account's IAM role
```

Apply the ClusterIssuer:

```bash
kubectl apply -f letsencrypt-dns01-route53.yaml

# Verify the ClusterIssuer is ready
kubectl get clusterissuer letsencrypt-dns01
kubectl describe clusterissuer letsencrypt-dns01
```

The ClusterIssuer should show a Ready status. If not, check the cert-manager logs:

```bash
kubectl logs -n cert-manager deployment/cert-manager
```

## Requesting a Wildcard Certificate

With the ClusterIssuer configured, request a wildcard certificate:

```yaml
# wildcard-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: default
spec:
  # Secret where certificate will be stored
  secretName: wildcard-example-com-tls

  # Certificate duration and renewal
  duration: 2160h # 90 days
  renewBefore: 720h # 30 days

  issuerRef:
    name: letsencrypt-dns01
    kind: ClusterIssuer

  # Common name
  commonName: "*.example.com"

  # DNS names covered by the certificate
  dnsNames:
  - "*.example.com"
  - "example.com"  # Include apex domain if needed
```

Apply the certificate request:

```bash
kubectl apply -f wildcard-certificate.yaml

# Watch certificate issuance progress
kubectl get certificate wildcard-example-com -w

# Check detailed status
kubectl describe certificate wildcard-example-com
```

cert-manager creates a DNS TXT record in your Route53 hosted zone, waits for DNS propagation, and completes the ACME challenge. This typically takes 1-3 minutes.

## Monitoring DNS Challenge Progress

Track the DNS-01 challenge process through cert-manager resources:

```bash
# View the CertificateRequest
kubectl get certificaterequest

# View the ACME Order
kubectl get order

# View the Challenge (shows DNS validation details)
kubectl get challenge

# Describe the challenge for detailed information
kubectl describe challenge <challenge-name>
```

The Challenge resource shows the DNS record name and value that cert-manager created. You can verify it in Route53:

```bash
# Check the TXT record in Route53
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR-ZONE-ID \
  --query "ResourceRecordSets[?Type=='TXT']"
```

You should see a TXT record like `_acme-challenge.example.com` with the challenge value.

## Using the Wildcard Certificate

Once issued, use the wildcard certificate with any service under your domain:

```yaml
# example-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: wildcard-example-com-tls  # Reference wildcard certificate
  rules:
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

Multiple Ingresses can reference the same wildcard certificate secret:

```yaml
# dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: default
spec:
  tls:
  - hosts:
    - dashboard.example.com
    secretName: wildcard-example-com-tls  # Same certificate
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

## Multi-Zone Configuration

If you manage multiple domains across different Route53 hosted zones, configure multiple solvers with selectors:

```yaml
# multi-zone-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-multi-zone
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-multi-zone-account-key
    solvers:
    # Solver for example.com domain
    - dns01:
        route53:
          region: us-east-1
          hostedZoneID: Z1234567890ABC
      selector:
        dnsZones:
        - example.com

    # Solver for another-domain.com
    - dns01:
        route53:
          region: us-west-2
          hostedZoneID: Z0987654321XYZ
      selector:
        dnsZones:
        - another-domain.com
```

cert-manager automatically selects the appropriate solver based on the certificate's DNS names.

## Using AWS Access Keys (Alternative to IRSA)

If you're not using EKS or prefer access keys, create a secret with AWS credentials:

```bash
# Create secret with AWS access keys
kubectl create secret generic route53-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n cert-manager
```

Reference this secret in the ClusterIssuer:

```yaml
# clusterissuer-with-access-keys.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns01-keys
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-dns01-keys-account-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          # Reference to the secret containing AWS credentials
          accessKeyID: AKIAIOSFODNN7EXAMPLE
          secretAccessKeySecretRef:
            name: route53-credentials
            key: secret-access-key
```

However, IRSA is the recommended approach for EKS as it provides temporary credentials and better security.

## Troubleshooting DNS-01 Challenges

If certificate issuance fails, check these common issues:

### DNS Propagation Delays

DNS changes take time to propagate. cert-manager waits for propagation before presenting the challenge to Let's Encrypt. Check if the TXT record exists:

```bash
# Query the DNS record directly
dig _acme-challenge.example.com TXT

# Or use nslookup
nslookup -type=TXT _acme-challenge.example.com
```

If the record doesn't appear, check Route53 permissions and cert-manager logs.

### IAM Permission Issues

Verify cert-manager has the correct IAM permissions:

```bash
# Check cert-manager pod service account
kubectl get pod -n cert-manager -o yaml | grep serviceAccountName

# Verify the service account has IRSA annotation
kubectl get serviceaccount cert-manager -n cert-manager -o yaml
```

Test AWS API access from a cert-manager pod:

```bash
# Exec into cert-manager pod
kubectl exec -it -n cert-manager deployment/cert-manager -- /bin/sh

# Try listing hosted zones
aws route53 list-hosted-zones
```

### Wrong Hosted Zone

cert-manager must create records in the correct hosted zone. Specify the hostedZoneID explicitly if you have multiple zones:

```yaml
dns01:
  route53:
    region: us-east-1
    hostedZoneID: Z1234567890ABC  # Explicitly specify zone ID
```

## Cost Optimization

DNS-01 challenges incur minimal AWS costs:
- Route53 queries: $0.40 per million queries
- Hosted zone: $0.50 per zone per month

For wildcard certificates, this is far more economical than individual certificates for each subdomain. One wildcard certificate replaces dozens of individual certificates.

## Best Practices

Use wildcard certificates for dynamic subdomain environments where you frequently add new subdomains. This avoids requesting new certificates for each subdomain.

Combine apex and wildcard domains in certificate requests (`example.com` and `*.example.com`) if you serve content at both.

Monitor certificate expiration separately from DNS health. While cert-manager handles renewal, DNS provider issues can block renewal.

Use IRSA instead of long-lived access keys when running on EKS. Temporary credentials reduce security risk.

Set appropriate DNS TTLs for your zones. Lower TTLs (60 seconds) speed up DNS-01 validation but increase query costs. Higher TTLs reduce costs but slow validation.

## Conclusion

DNS-01 challenges with Route53 enable automated wildcard certificate management in Kubernetes. cert-manager handles the complexity of DNS record creation, validation, and cleanup, providing wildcard certificates that secure entire domains with minimal operational overhead.

This approach scales well for microservices architectures where subdomain proliferation is common. Combined with cert-manager's automatic renewal, it provides a robust solution for TLS certificate management across dynamic Kubernetes environments.
