# How to Set Up Open Service Mesh with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Open Service Mesh, OSM, Service Mesh

Description: Deploy Open Service Mesh (OSM) on Rancher-managed clusters to enable automatic mTLS, traffic policies, and observability with an SMI-compliant service mesh.

## Introduction

Open Service Mesh (OSM) is a lightweight, extensible cloud-native service mesh that implements the Service Mesh Interface (SMI) specification. It uses Envoy as the data plane proxy and provides automatic mTLS, traffic policy enforcement, and observability. OSM was a CNCF sandbox project and is now archived, so this guide pins the last released version, v1.2.4.

## Prerequisites

- Rancher-managed Kubernetes cluster (1.22.9+)
- Helm 3.x installed
- kubectl with cluster-admin access
- `osm` CLI (optional but recommended)

## Step 1: Install the OSM CLI

```bash
# Install OSM CLI on Linux/macOS

release=v1.2.4
system=$(uname -s | tr '[:upper:]' '[:lower:]')

curl -L "https://github.com/openservicemesh/osm/releases/download/${release}/osm-${release}-${system}-amd64.tar.gz" | tar -vxzf -
sudo mv ./${system}-amd64/osm /usr/local/bin/osm

# Verify installation
osm version
```

## Step 2: Install OSM via Helm

```bash
# Add OSM Helm repository
helm repo add osm https://openservicemesh.github.io/osm
helm repo update
```

```yaml
# osm-values.yaml - OSM configuration
osm:
  # Enable Prometheus metrics
  deployPrometheus: true

  # Enable Grafana for dashboards
  deployGrafana: true

  # Enable Jaeger for distributed tracing
  deployJaeger: true
  tracing:
    enable: true

  # Disable permissive traffic policy so SMI access policies are enforced
  enablePermissiveTrafficPolicy: false

  # Certificate configuration
  certificateProvider:
    kind: tresor  # Built-in cert provider

  # Envoy sidecar log level
  envoyLogLevel: warning

  # Enable debug server
  enableDebugServer: false
```

```bash
# Install OSM
helm install osm osm/osm \
  --namespace osm-system \
  --create-namespace \
  --version 1.2.4 \
  --values osm-values.yaml

# Verify installation
kubectl get pods,svc,secrets,meshconfigs,serviceaccount --namespace osm-system
```

## Step 3: Add Namespaces to the Mesh

```bash
# Add a namespace to OSM mesh monitoring
osm namespace add production

# Or label/annotate directly for the default mesh name
kubectl label namespace production openservicemesh.io/monitored-by=osm --overwrite
kubectl annotate namespace production openservicemesh.io/sidecar-injection=enabled --overwrite

# List monitored namespaces
osm namespace list --mesh-name=osm
```

## Step 4: Deploy Applications into the Mesh

```yaml
# production-apps.yaml - Services, service accounts, and deployments in the OSM mesh
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-sa
  namespace: production
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: production
spec:
  selector:
    app: frontend
  ports:
    - name: http
      port: 3000
      targetPort: 3000
      appProtocol: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      serviceAccountName: frontend-sa
      containers:
        - name: frontend
          image: registry.example.com/frontend:v1.0
          ports:
            - containerPort: 3000
---
# Backend resources in OSM mesh
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: production
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: production
spec:
  selector:
    app: backend
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      appProtocol: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      serviceAccountName: backend-sa
      containers:
        - name: backend
          image: registry.example.com/backend:v1.0
          ports:
            - containerPort: 8080
```

After adding the namespace, OSM automatically injects Envoy sidecars:

```bash
# Restart deployments to inject sidecars
kubectl rollout restart deployments -n production

# Verify sidecars are injected
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

## Step 5: Configure SMI Traffic Access Policies

OSM uses the SMI Traffic Access Control API:

```yaml
# traffic-access.yaml - Allow frontend to access backend
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: frontend-to-backend
  namespace: production
spec:
  destination:
    kind: ServiceAccount
    name: backend-sa
    namespace: production
  rules:
    - kind: HTTPRouteGroup
      name: backend-routes
      matches:
        - api-calls
  sources:
    - kind: ServiceAccount
      name: frontend-sa
      namespace: production
---
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: backend-routes
  namespace: production
spec:
  matches:
    - name: api-calls
      pathRegex: "/api/.*"
      methods:
        - GET
        - POST
```

## Step 6: Configure Traffic Splitting

```yaml
# traffic-split.yaml - A/B testing with OSM traffic splitting
# Assumes backend-v1 and backend-v2 Services already exist in the production namespace
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: backend-split
  namespace: production
spec:
  service: backend.production.svc.cluster.local
  backends:
    # 80% to stable version
    - service: backend-v1
      weight: 80
    # 20% to canary version
    - service: backend-v2
      weight: 20
```

## Step 7: Enable Metrics and Tracing

```bash
# Enable metrics scraping for Prometheus
osm metrics enable --namespace production

# View metrics via port-forward
kubectl port-forward -n osm-system \
  $(kubectl get pod -n osm-system -l app=osm-prometheus -o name) \
  7070:7070

# Access Grafana dashboard
kubectl port-forward -n osm-system \
  $(kubectl get pod -n osm-system -l app=osm-grafana -o name) \
  3000:3000
```

## Step 8: Configure Ingress with OSM

When the source kind is `Service`, the source namespace also needs to be monitored by OSM so it can discover the service endpoints:

```bash
kubectl label namespace ingress-nginx openservicemesh.io/monitored-by=osm --overwrite
```

```yaml
# ingress.yaml - IngressBackend for OSM
apiVersion: policy.openservicemesh.io/v1alpha1
kind: IngressBackend
metadata:
  name: frontend-ingress-backend
  namespace: production
spec:
  backends:
    - name: frontend
      port:
        number: 3000
        protocol: http
  sources:
    - kind: Service
      namespace: ingress-nginx
      name: ingress-nginx-controller
```

## Troubleshooting

```bash
# Check OSM controller logs
kubectl logs -n osm-system deployment/osm-controller --tail=50

# Check Envoy proxy configuration
osm proxy get config_dump <pod-name> -n production

# Verify traffic policies
osm policy check-pods \
  production/<frontend-pod> \
  production/<backend-pod>

# View sidecar logs
kubectl logs -n production <pod-name> -c envoy --tail=50
```

## Conclusion

Open Service Mesh provides a standards-compliant (SMI), lightweight service mesh that integrates with Rancher-managed clusters. Because the project is archived, pin deployments to the final v1.2.4 release and evaluate long-term support requirements before adopting it. OSM still offers the core service mesh features: automatic mTLS, traffic policies, and observability.
