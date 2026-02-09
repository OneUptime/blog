# How to Set Up ExternalDNS with Multiple Providers Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ExternalDNS, DNS, Multi-Cloud, Automation

Description: Configure ExternalDNS to manage DNS records across multiple providers simultaneously, enabling multi-cloud deployments and automated DNS management for complex infrastructure setups.

---

ExternalDNS automates DNS record management in Kubernetes by watching services and ingresses, then creating or updating DNS records in external DNS providers. While most setups use a single provider, multi-cloud and hybrid environments often need records in multiple providers simultaneously. This guide shows you how to run multiple ExternalDNS instances, each managing different DNS zones or providers.

## Understanding Multi-Provider Architecture

The key insight is that ExternalDNS instances are independent. You can run multiple deployments, each configured for a different provider or zone. They coexist peacefully as long as they manage non-overlapping DNS zones.

Common multi-provider scenarios:

- AWS Route53 for public records, internal DNS for private records
- Different cloud providers for different geographic regions
- Multiple Route53 hosted zones for different domains
- CloudFlare for CDN, Route53 for internal services
- Split-horizon DNS with different providers for internal/external views

## Setting Up Multiple ExternalDNS Instances

Start with separate deployments for each provider. Here's an example with AWS Route53 and Google Cloud DNS running simultaneously.

### Route53 Configuration

Create a deployment for Route53:

```yaml
# externaldns-route53.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns-route53
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns-route53
rules:
- apiGroups: [""]
  resources: ["services","endpoints","pods"]
  verbs: ["get","watch","list"]
- apiGroups: ["extensions","networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get","watch","list"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-dns-route53-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-dns-route53
subjects:
- kind: ServiceAccount
  name: external-dns-route53
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-route53
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns-route53
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: external-dns-route53
    spec:
      serviceAccountName: external-dns-route53
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=example.com
        - --provider=aws
        - --policy=sync
        - --aws-zone-type=public
        - --registry=txt
        - --txt-owner-id=k8s-cluster-1
        - --txt-prefix=externaldns-
        env:
        - name: AWS_DEFAULT_REGION
          value: us-east-1
```

For production, use IAM roles for service accounts (IRSA) on EKS:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns-route53
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ExternalDNSRoute53
```

### Google Cloud DNS Configuration

Create a second deployment for Cloud DNS:

```yaml
# externaldns-clouddns.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns-clouddns
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns-clouddns
rules:
- apiGroups: [""]
  resources: ["services","endpoints","pods"]
  verbs: ["get","watch","list"]
- apiGroups: ["extensions","networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get","watch","list"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-dns-clouddns-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-dns-clouddns
subjects:
- kind: ServiceAccount
  name: external-dns-clouddns
  namespace: kube-system
---
apiVersion: v1
kind: Secret
metadata:
  name: external-dns-clouddns-credentials
  namespace: kube-system
type: Opaque
stringData:
  credentials.json: |
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "...",
      "private_key": "...",
      "client_email": "externaldns@your-project.iam.gserviceaccount.com",
      "client_id": "...",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-clouddns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns-clouddns
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: external-dns-clouddns
    spec:
      serviceAccountName: external-dns-clouddns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=example.org
        - --provider=google
        - --google-project=your-project-id
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=k8s-cluster-1
        - --txt-prefix=externaldns-
        volumeMounts:
        - name: google-credentials
          mountPath: /etc/secrets/service-account
          readOnly: true
        env:
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /etc/secrets/service-account/credentials.json
      volumes:
      - name: google-credentials
        secret:
          secretName: external-dns-clouddns-credentials
```

Deploy both:

```bash
kubectl apply -f externaldns-route53.yaml
kubectl apply -f externaldns-clouddns.yaml
```

Now you have two ExternalDNS instances managing different domains.

## Using Annotations to Route to Specific Providers

Control which provider handles each service with annotations:

```yaml
# Service using Route53 (example.com)
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
---
# Service using Cloud DNS (example.org)
apiVersion: v1
kind: Service
metadata:
  name: api-app
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.example.org
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: api
```

ExternalDNS instances only process resources matching their domain-filter configuration.

## Managing Multiple Zones in the Same Provider

You can run multiple ExternalDNS instances for the same provider but different zones:

```yaml
# Route53 for public zone
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-route53-public
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=example.com
        - --provider=aws
        - --aws-zone-type=public
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=k8s-public
---
# Route53 for private zone
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-route53-private
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=internal.example.com
        - --provider=aws
        - --aws-zone-type=private
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=k8s-private
```

Use different hostname annotations to route to the correct zone:

```yaml
# Public service
apiVersion: v1
kind: Service
metadata:
  name: public-api
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.example.com
spec:
  type: LoadBalancer
---
# Internal service
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.internal.example.com
spec:
  type: ClusterIP
  externalIPs:
  - 10.0.50.100
```

## CloudFlare and Route53 Together

A common pattern uses CloudFlare for CDN-enabled public records and Route53 for everything else:

```yaml
# CloudFlare for CDN
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-cloudflare
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=ingress
        - --domain-filter=cdn.example.com
        - --provider=cloudflare
        - --cloudflare-proxied
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=k8s-cf
        env:
        - name: CF_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: cloudflare-api-token
              key: token
---
# Route53 for non-CDN records
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-route53
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=api.example.com
        - --domain-filter=internal.example.com
        - --provider=aws
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=k8s-r53
```

Tag ingresses appropriately:

```yaml
# CDN-enabled ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-cdn
  annotations:
    external-dns.alpha.kubernetes.io/hostname: www.cdn.example.com
spec:
  rules:
  - host: www.cdn.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
---
# Direct API ingress (no CDN)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-direct
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.api.example.com
spec:
  rules:
  - host: api.api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 443
```

## Filtering by Source

You can have different ExternalDNS instances watch different resource types:

```yaml
# Instance watching only services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-services
spec:
  template:
    spec:
      containers:
      - name: external-dns
        args:
        - --source=service
        - --domain-filter=services.example.com
        - --provider=aws
---
# Instance watching only ingresses
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-ingresses
spec:
  template:
    spec:
      containers:
      - name: external-dns
        args:
        - --source=ingress
        - --domain-filter=apps.example.com
        - --provider=aws
```

## Namespace-Based Filtering

Route different namespaces to different providers using label selectors:

```yaml
# Production to Route53
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-production
spec:
  template:
    spec:
      containers:
      - name: external-dns
        args:
        - --source=service
        - --source=ingress
        - --namespace=production
        - --domain-filter=prod.example.com
        - --provider=aws
---
# Staging to Cloud DNS
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-staging
spec:
  template:
    spec:
      containers:
      - name: external-dns
        args:
        - --source=service
        - --source=ingress
        - --namespace=staging
        - --domain-filter=staging.example.com
        - --provider=google
```

## Monitoring Multiple ExternalDNS Instances

Each instance exposes metrics independently. Create a ServiceMonitor for each:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-dns-route53-metrics
  namespace: kube-system
  labels:
    app: external-dns-route53
spec:
  ports:
  - port: 7979
    name: metrics
  selector:
    app: external-dns-route53
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: external-dns-route53
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns-route53
  endpoints:
  - port: metrics
    interval: 30s
```

Create alerts for synchronization failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: external-dns-alerts
spec:
  groups:
  - name: externaldns
    rules:
    - alert: ExternalDNSSyncFailed
      expr: external_dns_registry_errors_total > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "ExternalDNS sync errors"
        description: "ExternalDNS {{ $labels.app }} has registry errors"
```

## Handling Conflicts and Ownership

Use txt-owner-id to prevent conflicts when multiple instances could modify the same zones:

```yaml
args:
- --txt-owner-id=cluster-1-route53
- --txt-prefix=k8s-
```

This creates TXT records like:

```
k8s-api.example.com TXT "heritage=external-dns,external-dns/owner=cluster-1-route53"
```

Other ExternalDNS instances with different owner IDs won't modify these records.

## Best Practices

When running multiple ExternalDNS instances:

- Use distinct domain filters to prevent overlapping management
- Set unique txt-owner-id values for each instance
- Use namespace filtering to logically separate concerns
- Monitor each instance independently
- Test failover scenarios (what happens if one provider fails)
- Document which provider manages which zones
- Use policy=sync carefully (it deletes unmanaged records)
- Consider policy=upsert-only for safer operation
- Implement proper RBAC for each service account
- Use managed identities (IRSA, Workload Identity) instead of static credentials

Running multiple ExternalDNS instances gives you the flexibility to manage complex multi-cloud DNS architectures while keeping your Kubernetes resources as the source of truth.
