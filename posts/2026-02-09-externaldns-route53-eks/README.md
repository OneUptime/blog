# How to Set Up ExternalDNS with Route53 for EKS Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, DNS, EKS

Description: Configure ExternalDNS on EKS to automatically create and manage Route53 DNS records for Kubernetes services and ingress resources.

---

Managing DNS records manually for Kubernetes services becomes tedious as your cluster grows. ExternalDNS automates this by watching Kubernetes resources and synchronizing DNS records with AWS Route53, keeping your DNS configuration aligned with your cluster state.

This guide demonstrates how to set up ExternalDNS on Amazon EKS to manage Route53 records automatically.

## Understanding ExternalDNS

ExternalDNS monitors Kubernetes resources like Service and Ingress, extracting hostname information and creating corresponding DNS records in Route53. When services are created or deleted, DNS records update automatically.

Key features include:

**Automatic DNS management** for services, ingresses, and Istio gateways.

**Multiple hosted zone support** for organizing records.

**TXT record ownership** to prevent conflicts between multiple clusters.

**Policy modes** for controlling record creation and updates.

## Prerequisites

Create a Route53 hosted zone:

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name example.com \
  --query "HostedZones[0].Id" \
  --output text)

echo "Hosted Zone ID: $ZONE_ID"
```

## Creating IAM Policy for ExternalDNS

Create an IAM policy allowing ExternalDNS to manage Route53 records:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
```

Save to `externaldns-policy.json` and create:

```bash
aws iam create-policy \
  --policy-name ExternalDNSPolicy \
  --policy-document file://externaldns-policy.json
```

## Installing ExternalDNS with IRSA

Create IAM role using IRSA (IAM Roles for Service Accounts):

```bash
# Create service account with IAM role
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=external-dns \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/ExternalDNSPolicy \
  --approve
```

Install ExternalDNS using Helm:

```bash
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

helm install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set serviceAccount.create=false \
  --set serviceAccount.name=external-dns \
  --set provider=aws \
  --set policy=sync \
  --set txtOwnerId=my-cluster \
  --set domainFilters[0]=example.com
```

Or install with kubectl:

```yaml
# externaldns-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --provider=aws
        - --policy=sync
        - --txt-owner-id=my-cluster
        - --domain-filter=example.com
        - --registry=txt
        - --log-level=info
```

Apply the deployment:

```bash
kubectl apply -f externaldns-deployment.yaml
```

## Creating DNS Records for Services

Create a LoadBalancer service with hostname annotation:

```yaml
# web-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

ExternalDNS automatically creates a Route53 record pointing to the load balancer.

Verify DNS record:

```bash
# Wait for load balancer to provision
kubectl get svc web-service

# Check Route53 record
aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query "ResourceRecordSets[?Name=='web.example.com.']"

# Test DNS resolution
dig web.example.com
```

## Managing DNS for Ingress Resources

Create an ingress with hostname:

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
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

ExternalDNS creates a record automatically based on the host field.

Multiple hostnames:

```yaml
spec:
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
  - host: www.app.example.com
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

## Using Multiple Hosted Zones

Configure ExternalDNS for multiple zones:

```yaml
args:
- --source=service
- --source=ingress
- --provider=aws
- --domain-filter=example.com
- --domain-filter=example.net
- --zone-id-filter=Z1234567890ABC
- --zone-id-filter=Z0987654321XYZ
```

Or use separate ExternalDNS instances per zone:

```bash
# Install for example.com
helm install external-dns-com external-dns/external-dns \
  --namespace kube-system \
  --set provider=aws \
  --set domainFilters[0]=example.com \
  --set txtOwnerId=my-cluster-com

# Install for example.net
helm install external-dns-net external-dns/external-dns \
  --namespace kube-system \
  --set provider=aws \
  --set domainFilters[0]=example.net \
  --set txtOwnerId=my-cluster-net
```

## Configuring TTL Values

Set custom TTL for DNS records:

```yaml
metadata:
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/ttl: "60"
```

Default is 300 seconds. Lower values mean faster updates but more DNS queries.

## Policy Modes

ExternalDNS supports different policy modes:

**sync** - Create and delete records automatically (default).

```yaml
args:
- --policy=sync
```

**upsert-only** - Create and update records but never delete.

```yaml
args:
- --policy=upsert-only
```

**create-only** - Only create new records, never update or delete.

```yaml
args:
- --policy=create-only
```

For production, use sync mode with TXT ownership records to prevent conflicts.

## TXT Record Ownership

ExternalDNS uses TXT records to track ownership:

```yaml
args:
- --txt-owner-id=my-cluster
- --txt-prefix=externaldns-
```

This creates TXT records like:

```
externaldns-web.example.com TXT "heritage=external-dns,external-dns/owner=my-cluster"
```

Only ExternalDNS instances with matching owner ID modify these records.

## Monitoring ExternalDNS

Check logs:

```bash
kubectl logs -n kube-system deployment/external-dns

# Follow logs
kubectl logs -n kube-system deployment/external-dns -f
```

View metrics:

```bash
# Port forward to metrics endpoint
kubectl port-forward -n kube-system deployment/external-dns 7979:7979

# Query metrics
curl localhost:7979/metrics
```

Common metrics:
- `external_dns_registry_errors_total`
- `external_dns_source_errors_total`
- `external_dns_controller_verified_a_records`

## Filtering by Namespace

Limit ExternalDNS to specific namespaces:

```yaml
args:
- --source=service
- --source=ingress
- --provider=aws
- --namespace=production
- --namespace=staging
```

Or use label filtering:

```yaml
args:
- --label-filter=dns=external
```

Then add labels to resources:

```yaml
metadata:
  labels:
    dns: external
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.example.com
```

## Using Alias Records

For AWS load balancers, use alias records instead of CNAME:

```yaml
metadata:
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/alias: "true"
```

Alias records are free and don't count toward Route53 query limits.

## Troubleshooting

If records aren't created:

```bash
# Check ExternalDNS logs
kubectl logs -n kube-system deployment/external-dns

# Verify IAM permissions
kubectl describe sa -n kube-system external-dns

# Check service annotation
kubectl get svc web-service -o yaml | grep external-dns
```

If records persist after deletion:

```bash
# Check policy mode
kubectl get deployment -n kube-system external-dns -o yaml | grep policy

# Verify TXT records
aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query "ResourceRecordSets[?Type=='TXT']"
```

## Using with Private Hosted Zones

Configure for private zones:

```yaml
args:
- --source=service
- --source=ingress
- --provider=aws
- --aws-zone-type=private
- --domain-filter=internal.example.com
```

## Conclusion

ExternalDNS automates DNS record management for Kubernetes services on EKS, eliminating manual Route53 updates and keeping DNS synchronized with cluster state. Proper configuration with IRSA, ownership TXT records, and appropriate policies ensures reliable DNS automation for production environments.

The integration with Route53 provides a seamless experience for exposing services with custom domain names, making it easy to maintain DNS records as services scale up and down.
