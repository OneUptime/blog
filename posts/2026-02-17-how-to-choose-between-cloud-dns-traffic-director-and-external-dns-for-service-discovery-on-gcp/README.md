# How to Choose Between Cloud DNS Traffic Director and External DNS for Service Discovery on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, Traffic Director, Service Discovery, Networking

Description: Compare Cloud DNS, Traffic Director, and ExternalDNS for service discovery on Google Cloud and learn when to use each approach.

---

Service discovery - the mechanism by which services find and communicate with each other - is a fundamental piece of any distributed system. On Google Cloud Platform, you have several options: Cloud DNS for traditional DNS-based discovery, Traffic Director for advanced service mesh-based routing, and ExternalDNS for automatically synchronizing Kubernetes service endpoints with DNS providers. Each solves a different slice of the service discovery problem.

## Cloud DNS for Service Discovery

Cloud DNS is Google's managed authoritative DNS service. Beyond hosting public DNS zones, it supports private DNS zones that are accessible only within your VPC. This makes it a natural fit for internal service discovery.

```bash
# Create a private DNS zone for internal service discovery
gcloud dns managed-zones create internal-services \
  --dns-name "internal.mycompany.com." \
  --description "Internal service discovery zone" \
  --visibility private \
  --networks my-vpc

# Add a DNS record for an internal service
gcloud dns record-sets create api.internal.mycompany.com. \
  --zone internal-services \
  --type A \
  --ttl 60 \
  --rrdatas "10.0.1.50"

# Add an SRV record for service port discovery
gcloud dns record-sets create _http._tcp.api.internal.mycompany.com. \
  --zone internal-services \
  --type SRV \
  --ttl 60 \
  --rrdatas "10 0 8080 api.internal.mycompany.com."
```

Cloud DNS also supports DNS peering, which lets you forward DNS queries from one VPC to another. This is useful when services are spread across multiple VPCs or projects.

**Cloud DNS strengths for service discovery:**

- Universal protocol - every application and language supports DNS
- Low overhead - no sidecar proxies or agents needed
- Works for VMs, GKE, Cloud Run, and any other GCP compute
- Private zones keep internal services invisible from the public internet
- Response policies can override DNS responses for testing or failover

**Cloud DNS limitations:**

- DNS caching makes updates slow to propagate (even with low TTL)
- No health checking built into DNS - a record can point to a dead service
- No load balancing intelligence - round-robin at best
- No traffic management features like canary deployments or circuit breaking

## Traffic Director for Service Mesh Discovery

Traffic Director is Google's managed control plane for service mesh. It configures Envoy sidecar proxies (or proxyless gRPC clients) to handle service discovery, load balancing, traffic management, and observability. Think of it as a centralized brain that tells every service how to route traffic to every other service.

```yaml
# GKE service with Traffic Director sidecar injection
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  annotations:
    # Traffic Director discovers this service automatically
    cloud.google.com/neg: '{"ingress": true}'
spec:
  selector:
    app: payment
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: networking.gke.io/v1
kind: ServiceExport
metadata:
  name: payment-service
  namespace: default
```

Traffic Director provides advanced traffic management through traffic policies:

```yaml
# Traffic routing rule for canary deployments
apiVersion: networking.gke.io/v1alpha1
kind: HTTPRoute
metadata:
  name: payment-route
spec:
  parentRefs:
    - name: payment-service
  rules:
    - matches:
        - headers:
            - name: x-canary
              value: "true"
      backendRefs:
        - name: payment-service-canary
          port: 8080
          weight: 100
    - backendRefs:
        # Split traffic between stable and canary versions
        - name: payment-service-stable
          port: 8080
          weight: 90
        - name: payment-service-canary
          port: 8080
          weight: 10
```

**Traffic Director strengths:**

- Real-time service discovery with health checking
- Advanced load balancing (least requests, round robin, ring hash)
- Traffic splitting for canary and blue-green deployments
- Circuit breaking and outlier detection
- Built-in observability with distributed tracing
- Multi-cluster service discovery across GKE clusters

**Traffic Director limitations:**

- Requires Envoy sidecar proxies or proxyless gRPC, adding complexity
- Higher resource overhead due to sidecar containers
- Steeper learning curve for the team
- Primarily designed for GKE workloads

## ExternalDNS for Kubernetes Service Discovery

ExternalDNS is an open-source Kubernetes controller that automatically creates DNS records in external DNS providers (including Cloud DNS) based on Kubernetes Service and Ingress resources. It bridges the gap between Kubernetes service discovery and DNS-based discovery.

```yaml
# Deploy ExternalDNS with Cloud DNS provider
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  replicas: 1
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
            # Use Google Cloud DNS as the provider
            - --provider=google
            - --google-project=my-project
            - --google-zone-visibility=private
            - --domain-filter=internal.mycompany.com
            - --source=service
            - --source=ingress
            - --registry=txt
            - --txt-owner-id=my-gke-cluster
```

With ExternalDNS running, any Kubernetes Service with the right annotation automatically gets a DNS record:

```yaml
# Service that ExternalDNS will create a DNS record for
apiVersion: v1
kind: Service
metadata:
  name: user-api
  annotations:
    # ExternalDNS reads this annotation to create a DNS record
    external-dns.alpha.kubernetes.io/hostname: user-api.internal.mycompany.com
spec:
  type: LoadBalancer
  selector:
    app: user-api
  ports:
    - port: 80
      targetPort: 8080
```

**ExternalDNS strengths:**

- Automates DNS record management - no manual updates
- Works with multiple DNS providers (Cloud DNS, Route53, Azure DNS, etc.)
- Fits naturally into GitOps workflows
- Services become discoverable by name from outside the Kubernetes cluster
- Supports both public and private DNS zones

**ExternalDNS limitations:**

- Still DNS-based, so it inherits DNS caching issues
- Only handles the DNS record creation - no health checking or traffic management
- Requires careful RBAC and IAM configuration
- Can conflict with manually managed DNS records

## Decision Matrix

| Need | Cloud DNS | Traffic Director | ExternalDNS |
|------|-----------|-----------------|-------------|
| VM-to-VM discovery | Good | Limited | No |
| GKE-to-GKE discovery | Good | Excellent | Good |
| Cross-cluster discovery | Manual | Built-in | Possible |
| Health-aware routing | No | Yes | No |
| Traffic splitting | No | Yes | No |
| Operational complexity | Low | High | Medium |
| Protocol support | Any (DNS) | HTTP/gRPC | Any (DNS) |
| Non-GKE workloads | Yes | Limited | No |

## Combining Approaches

In practice, you often use more than one of these tools together:

1. **Cloud DNS private zones** for base-level service discovery across your entire VPC, covering VMs, Cloud SQL instances, and other non-Kubernetes resources
2. **ExternalDNS** to automatically register Kubernetes services in Cloud DNS so they are discoverable by non-Kubernetes clients
3. **Traffic Director** for advanced service-to-service communication within your GKE clusters where you need health checking, traffic management, and observability

This layered approach gives you broad DNS-based discovery for everything, with sophisticated traffic management where it matters most.

## My Recommendation

Start with Cloud DNS private zones. They work everywhere, require no special client libraries, and the operational overhead is minimal. Add ExternalDNS if you have GKE clusters and want DNS records to be automatically managed. Graduate to Traffic Director only when you need its advanced features - traffic splitting, circuit breaking, or multi-cluster service mesh - because it comes with meaningful complexity.

Do not deploy Traffic Director just because it has more features. Deploy it because you have traffic management problems that DNS cannot solve.
