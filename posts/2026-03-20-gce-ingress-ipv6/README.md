# How to Configure GCE Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GKE, GCE, Google Cloud, Kubernetes, Ingress, Load Balancer

Description: Configure the GCE Ingress Controller on Google Kubernetes Engine (GKE) to create IPv6-capable Global HTTP(S) Load Balancers, including dual-stack service configuration and IPv6 external IP assignment.

## Introduction

Google Kubernetes Engine (GKE) uses the GKE Ingress controller to provision Google Cloud Application Load Balancers for Kubernetes Ingress resources. GKE dual-stack clusters can assign IPv4 and IPv6 addresses to nodes, Pods, and Services. For Ingress, the exact frontend behavior depends on the load balancer type that GKE creates: external GKE Ingress creates a classic Application Load Balancer, and internal GKE Ingress creates a regional internal Application Load Balancer.

## Prerequisites: GKE Cluster with IPv6

```bash
# Requires an existing custom mode VPC network, for example my-custom-vpc.

# Create a dual-stack cluster and subnet simultaneously
gcloud container clusters create my-cluster \
    --enable-ip-alias \
    --stack-type=ipv4-ipv6 \
    --ipv6-access-type=EXTERNAL \
    --network=my-custom-vpc \
    --create-subnetwork name=my-gke-subnet,range=10.0.0.0/20 \
    --location=us-central1

# Or use INTERNAL for private IPv6 addressing on the subnet
# (the VPC network must use ULA for internal IPv6)
gcloud container clusters create my-cluster \
    --enable-ip-alias \
    --stack-type=ipv4-ipv6 \
    --ipv6-access-type=INTERNAL \
    --network=my-custom-vpc \
    --create-subnetwork name=my-gke-subnet,range=10.0.0.0/20 \
    --location=us-central1

# Verify the cluster's dual-stack configuration
gcloud container clusters describe my-cluster --location=us-central1 | \
    grep -E "stackType|ipv6AccessType|subnetIpv6CidrBlock|servicesIpv6CidrBlock"

# Verify nodes have dual-stack Pod CIDRs
kubectl get node -o yaml | grep -A5 "podCIDRs"
# Should show both IPv4 and IPv6 Pod CIDRs

# Get credentials
gcloud container clusters get-credentials my-cluster --location=us-central1
```

## GKE Ingress on a Dual-Stack Cluster (Global Load Balancer)

```yaml
# ingress-gce-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    # Use GCE (global) ingress class
    kubernetes.io/ingress.class: "gce"

    # Static global IP (create with gcloud compute addresses)
    kubernetes.io/ingress.global-static-ip-name: "myapp-global-ip"

    # TLS configuration using a pre-shared certificate
    ingress.gcp.kubernetes.io/pre-shared-cert: "myapp-ssl-cert"

    # Disable HTTP. If you need HTTP-to-HTTPS redirects, use FrontendConfig.
    kubernetes.io/ingress.allow-http: "false"

spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /*
            pathType: ImplementationSpecific
            backend:
              service:
                name: myapp
                port:
                  number: 8080
```

## Create Static Global Address

```bash
# Create the global static external IP referenced by the Ingress annotation
gcloud compute addresses create myapp-global-ip \
    --global

# Get the assigned address
gcloud compute addresses describe myapp-global-ip --global \
    --format="get(address)"
# Returns: 203.0.113.10

# Update DNS with the load balancer address
gcloud dns record-sets transaction start --zone=example-zone
gcloud dns record-sets transaction add "203.0.113.10" \
    --name=app.example.com. \
    --ttl=300 \
    --type=A \
    --zone=example-zone
gcloud dns record-sets transaction execute --zone=example-zone
```

## BackendConfig for Health Checks

```yaml
# backendconfig.yaml

apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: myapp-backend-config
  namespace: production
spec:
  # Health check configuration
  healthCheck:
    checkIntervalSec: 10
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /health
    # With container-native load balancing, this should match
    # the serving Pod's containerPort.
    port: 8080

  # Connection draining
  connectionDraining:
    drainingTimeoutSec: 60

  # Session affinity (optional; useful when the Service uses NEGs)
  sessionAffinity:
    affinityType: GENERATED_COOKIE
    affinityCookieTtlSec: 3600
```

```yaml
# Attach BackendConfig to service
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  annotations:
    # Link BackendConfig for health check and other LB settings
    cloud.google.com/backend-config: '{"default": "myapp-backend-config"}'
    # Use container-native load balancing for the Ingress backend
    cloud.google.com/neg: '{"ingress": true}'
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: myapp
  type: NodePort
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## GKE Ingress for Internal Load Balancer

```yaml
# ingress-gce-internal.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-internal
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "gce-internal"
    # Internal GKE Ingress creates a regional internal
    # Application Load Balancer with an IPv4 frontend address.

    # Static regional internal IP for the internal load balancer
    kubernetes.io/ingress.regional-static-ip-name: "myapp-internal-ip"
spec:
  rules:
    - host: app.internal.example.com
      http:
        paths:
          - path: /*
            pathType: ImplementationSpecific
            backend:
              service:
                name: myapp
                port:
                  number: 8080
```

## Verify GCE Ingress Operation

```bash
# Check the Ingress has an address
kubectl get ingress myapp -n production

# Get the load balancer address
gcloud compute addresses describe myapp-global-ip --global \
    --format="get(address)"

# Test DNS resolution
dig A app.example.com
# Expected: app.example.com. 300 IN A 203.0.113.10

# Test HTTPS
curl -k -H "Host: app.example.com" "https://203.0.113.10/"

# Check backend health
gcloud compute backend-services get-health BACKEND_SERVICE_NAME \
    --global \
    --format="table(status.healthStatus[].ipAddress,status.healthStatus[].healthState)"
```

## GKE Network Policy

```yaml
# network-policy.yaml

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-lb-health-checks
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  ingress:
    # Allow Google Cloud health check ranges for external
    # Application Load Balancer backends
    - from:
        - ipBlock:
            cidr: "35.191.0.0/16"    # GCP health check IPv4
        - ipBlock:
            cidr: "130.211.0.0/22"   # GCP health check IPv4
      ports:
        - port: 8080
```

## Conclusion

GKE dual-stack clusters are created by using a dual-stack subnet or by creating the subnet and cluster together with `--stack-type=ipv4-ipv6` and `--ipv6-access-type`. For the built-in GKE Ingress controller, use the `kubernetes.io/ingress.class` annotation because GKE does not use `spec.ingressClassName` for this controller. `kubernetes.io/ingress.allow-http: "false"` disables HTTP rather than configuring redirects, and `FrontendConfig` is required for HTTP-to-HTTPS redirection. `BackendConfig` works normally on dual-stack clusters, and when you pin the health check port to a Pod port you should use container-native load balancing with `cloud.google.com/neg: '{"ingress": true}'`. For external Application Load Balancer health checks, allow `35.191.0.0/16` and `130.211.0.0/22`. Internal GKE Ingress creates a regional internal Application Load Balancer that uses an IPv4 frontend address.
