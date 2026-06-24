# How to Configure External DNS with Kubernetes for IPv4 Services (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ExternalDNS, DNS, IPv4, Route53, Cloud, Automation

Description: Deploy ExternalDNS in Kubernetes to automatically create and manage DNS A records for LoadBalancer and Ingress Services based on IPv4 addresses.

## Introduction

ExternalDNS is a Kubernetes controller that watches Services and Ingresses and automatically creates DNS records in external DNS providers (Route 53, Cloudflare, Google Cloud DNS, etc.). Instead of manually creating DNS records when you deploy an app, ExternalDNS handles it automatically based on Service annotations, Ingress hostnames, and the resources' published external targets.

## How ExternalDNS Works

1. You define a hostname on a Service or Ingress
2. ExternalDNS sees the hostname and the resource's published external target (for example, a load balancer IP or hostname)
3. ExternalDNS creates the corresponding DNS record in your DNS provider

## Deploying ExternalDNS with Route 53

### IAM Policy for Route 53 Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets",
        "route53:ListTagsForResource"
      ],
      "Resource": "*"
    }
  ]
}
```

### ExternalDNS Deployment

```yaml
# external-dns.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
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
          image: registry.k8s.io/external-dns/external-dns:v0.14.2
          args:
            - --source=service             # Watch Services
            - --source=ingress             # Watch Ingresses
            - --domain-filter=example.com  # Only manage this domain
            - --provider=aws               # Use Route 53
            - --aws-zone-type=public       # Use public hosted zones
            - --registry=txt               # Use TXT records for ownership tracking
            - --txt-owner-id=my-cluster    # Unique cluster identifier
```

### RBAC for ExternalDNS

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/external-dns-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "pods"]
    verbs: ["get", "watch", "list"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "watch", "list"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-dns-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-dns
subjects:
  - kind: ServiceAccount
    name: external-dns
    namespace: kube-system
```

## Creating DNS Records via Service Annotations

Annotate a LoadBalancer Service to automatically create a DNS record in Route 53:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  annotations:
    # On Route 53, ExternalDNS will typically create an A ALIAS for web.example.com
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

## Creating DNS Records via Ingress Annotations

This requires an ingress controller to populate `status.loadBalancer.ingress`. If your cluster does not define a default `IngressClass`, also set `spec.ingressClassName` for your controller.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.example.com
spec:
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

## Verifying DNS Record Creation

```bash
# Check ExternalDNS logs
kubectl logs -n kube-system deployment/external-dns

# Verify the DNS record was created in Route 53
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --query "ResourceRecordSets[?Name == 'web.example.com.']|[?Type == 'A']"

# Test DNS resolution
nslookup web.example.com
```

## Cleanup

ExternalDNS manages record lifecycle - when you delete the Service or Ingress, ExternalDNS removes the DNS record automatically.

## Conclusion

ExternalDNS automates DNS management for Kubernetes workloads, eliminating manual DNS record updates after every deployment. Combined with cert-manager for SSL certificates, it enables fully automated HTTPS deployments with zero manual DNS work.
