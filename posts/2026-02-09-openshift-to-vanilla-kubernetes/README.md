# How to Migrate from OpenShift to Vanilla Kubernetes Preserving Application Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Kubernetes, Migration, Cloud Native

Description: Complete migration guide from OpenShift to standard Kubernetes, translating OpenShift-specific resources like Routes, BuildConfigs, and Security Context Constraints to vanilla Kubernetes equivalents.

---

OpenShift provides an opinionated platform built on Kubernetes with additional features and abstractions. While these additions simplify certain workflows, they also create vendor lock-in. Migrating from OpenShift to vanilla Kubernetes requires careful translation of OpenShift-specific resources into standard Kubernetes objects. This guide walks through the process while preserving your application configurations and functionality.

## Understanding OpenShift vs Vanilla Kubernetes Differences

OpenShift adds several custom resource definitions and modified behaviors on top of Kubernetes. The main differences include Routes instead of Ingress resources, BuildConfigs for source-to-image builds, DeploymentConfigs with different update strategies than standard Deployments, Security Context Constraints instead of Pod Security Standards, and built-in image registry and build pipeline integration.

Understanding these differences is crucial because a direct export and import of manifests will not work. Each OpenShift-specific resource needs translation to its Kubernetes equivalent.

## Pre-Migration Inventory

Start by cataloging all OpenShift-specific resources in your cluster:

```bash
# Export all OpenShift Routes
oc get routes --all-namespaces -o yaml > openshift-routes.yaml

# Export BuildConfigs
oc get buildconfig --all-namespaces -o yaml > openshift-buildconfigs.yaml

# Export DeploymentConfigs
oc get deploymentconfig --all-namespaces -o yaml > openshift-deploymentconfigs.yaml

# Export ImageStreams
oc get imagestream --all-namespaces -o yaml > openshift-imagestreams.yaml

# List Security Context Constraints
oc get scc -o yaml > openshift-scc.yaml

# Export standard Kubernetes resources
oc get deploy,svc,cm,secret,pvc --all-namespaces -o yaml > k8s-resources.yaml
```

Create a spreadsheet tracking each application, its dependencies, and OpenShift-specific features it uses.

## Converting Routes to Ingress

OpenShift Routes are similar to Kubernetes Ingress but with different syntax. Here's a typical OpenShift Route:

```yaml
# OpenShift Route
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp
  namespace: production
spec:
  host: myapp.example.com
  to:
    kind: Service
    name: myapp
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
```

Convert this to a standard Kubernetes Ingress with NGINX ingress controller:

```yaml
# Kubernetes Ingress with NGINX
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 8080
```

Create a conversion script for bulk migration:

```python
#!/usr/bin/env python3
# convert-routes-to-ingress.py
import yaml
import sys

def convert_route_to_ingress(route):
    """Convert OpenShift Route to Kubernetes Ingress"""
    ingress = {
        'apiVersion': 'networking.k8s.io/v1',
        'kind': 'Ingress',
        'metadata': {
            'name': route['metadata']['name'],
            'namespace': route['metadata'].get('namespace', 'default'),
            'annotations': {}
        },
        'spec': {
            'ingressClassName': 'nginx',
            'rules': []
        }
    }

    # Handle TLS
    if 'tls' in route['spec']:
        tls_config = route['spec']['tls']
        if tls_config.get('termination') == 'edge':
            ingress['metadata']['annotations']['nginx.ingress.kubernetes.io/ssl-redirect'] = 'true'
            ingress['spec']['tls'] = [{
                'hosts': [route['spec']['host']],
                'secretName': f"{route['metadata']['name']}-tls"
            }]

    # Handle routing rules
    rule = {
        'host': route['spec']['host'],
        'http': {
            'paths': [{
                'path': route['spec'].get('path', '/'),
                'pathType': 'Prefix',
                'backend': {
                    'service': {
                        'name': route['spec']['to']['name'],
                        'port': {
                            'number': int(route['spec']['port']['targetPort'])
                        }
                    }
                }
            }]
        }
    }
    ingress['spec']['rules'].append(rule)

    return ingress

def main():
    with open('openshift-routes.yaml', 'r') as f:
        routes_doc = yaml.safe_load_all(f)

        ingresses = []
        for doc in routes_doc:
            if doc and doc.get('kind') == 'Route':
                ingress = convert_route_to_ingress(doc)
                ingresses.append(ingress)

    with open('kubernetes-ingresses.yaml', 'w') as f:
        yaml.dump_all(ingresses, f, default_flow_style=False)

    print(f"Converted {len(ingresses)} Routes to Ingress resources")

if __name__ == '__main__':
    main()
```

## Replacing DeploymentConfigs with Deployments

OpenShift DeploymentConfigs differ from standard Kubernetes Deployments in update strategies and triggers. Convert them manually:

```yaml
# OpenShift DeploymentConfig
apiVersion: apps.openshift.io/v1
kind: DeploymentConfig
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 8080
  triggers:
  - type: ConfigChange
  - type: ImageChange
    imageChangeParams:
      automatic: true
      containerNames:
      - myapp
      from:
        kind: ImageStreamTag
        name: myapp:latest
```

Convert to standard Kubernetes Deployment:

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: registry.example.com/myapp:v1.2.3  # Use explicit tags
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Note the use of explicit image tags instead of relying on ImageStreams, and the addition of health probes which should be standard practice.

## Handling BuildConfigs and CI/CD

OpenShift BuildConfigs provide source-to-image capabilities. Replace these with external CI/CD pipelines using tools like GitLab CI, GitHub Actions, or Jenkins.

Sample GitHub Actions workflow replacing a BuildConfig:

```yaml
# .github/workflows/build-and-push.yaml
name: Build and Push Image

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: registry.example.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          registry.example.com/myapp:${{ github.sha }}
          registry.example.com/myapp:latest
        cache-from: type=registry,ref=registry.example.com/myapp:buildcache
        cache-to: type=registry,ref=registry.example.com/myapp:buildcache,mode=max

    - name: Update Kubernetes deployment
      run: |
        kubectl set image deployment/myapp \
          myapp=registry.example.com/myapp:${{ github.sha }} \
          -n production
```

## Security Context Constraints to Pod Security Standards

OpenShift uses Security Context Constraints to control pod permissions. Vanilla Kubernetes uses Pod Security Standards and Pod Security Admission.

OpenShift SCC example:

```yaml
# OpenShift SCC
kind: SecurityContextConstraints
apiVersion: security.openshift.io/v1
metadata:
  name: myapp-scc
allowPrivilegedContainer: false
runAsUser:
  type: MustRunAsRange
  uidRangeMin: 1000
  uidRangeMax: 2000
seLinuxContext:
  type: RunAsAny
fsGroup:
  type: MustRunAs
  ranges:
  - min: 1000
    max: 2000
```

In vanilla Kubernetes, enforce similar constraints using Pod Security Standards:

```yaml
# Namespace with Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Update pod securityContext explicitly:

```yaml
# Deployment with explicit security context
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: myapp
        image: myapp:latest
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
```

## Image Registry Migration

OpenShift includes an integrated image registry. Migrate images to an external registry like Harbor, Docker Hub, or cloud provider registries:

```bash
# List all images in OpenShift registry
oc get imagestreams --all-namespaces

# Export images to external registry
for namespace in $(oc get projects -o jsonpath='{.items[*].metadata.name}'); do
  for imagestream in $(oc get imagestreams -n $namespace -o jsonpath='{.items[*].metadata.name}'); do
    # Get image reference
    image=$(oc get imagestream $imagestream -n $namespace -o jsonpath='{.status.dockerImageRepository}')

    # Pull from OpenShift
    docker pull $image

    # Tag for external registry
    docker tag $image registry.example.com/$namespace/$imagestream:latest

    # Push to external registry
    docker push registry.example.com/$namespace/$imagestream:latest

    echo "Migrated $image to registry.example.com/$namespace/$imagestream:latest"
  done
done
```

Update all deployments to reference the new registry:

```bash
# Update image references
kubectl set image deployment/myapp \
  myapp=registry.example.com/production/myapp:v1.2.3 \
  -n production
```

## Service Account and RBAC Translation

OpenShift automatically creates service accounts with different permissions. Review and recreate RBAC policies:

```bash
# Export OpenShift RoleBindings
oc get rolebindings --all-namespaces -o yaml > openshift-rolebindings.yaml

# Export ClusterRoleBindings
oc get clusterrolebindings -o yaml > openshift-clusterrolebindings.yaml
```

Create equivalent Kubernetes RBAC:

```yaml
# Kubernetes RBAC
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-rolebinding
  namespace: production
subjects:
- kind: ServiceAccount
  name: myapp-sa
  namespace: production
roleRef:
  kind: Role
  name: myapp-role
  apiGroup: rbac.authorization.k8s.io
```

## Network Policy Migration

OpenShift uses both Kubernetes NetworkPolicies and its own SDN configuration. Ensure your vanilla Kubernetes cluster has a CNI that supports NetworkPolicy (Calico, Cilium, etc.):

```yaml
# Network policy example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: myapp-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: production
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
```

## Testing and Validation

Set up a parallel vanilla Kubernetes cluster and deploy converted resources:

```bash
# Apply converted resources to test cluster
kubectl apply -f kubernetes-ingresses.yaml --dry-run=server
kubectl apply -f kubernetes-deployments.yaml --dry-run=server

# Deploy to staging namespace
kubectl create namespace staging-migration
kubectl apply -f . -n staging-migration

# Run smoke tests
kubectl run test-pod --image=curlimages/curl -it --rm -- \
  curl http://myapp.staging-migration.svc.cluster.local:8080/health
```

Create integration tests comparing OpenShift and vanilla Kubernetes environments:

```bash
# Compare service endpoints
diff <(oc get svc -n production) <(kubectl get svc -n production --context=vanilla-k8s)

# Verify all pods are running
kubectl get pods --all-namespaces --field-selector=status.phase!=Running
```

## Cutover Strategy

Plan a maintenance window for the final migration:

1. Freeze changes to OpenShift cluster
2. Take final backups of all data
3. Perform final sync of images and configurations
4. Update DNS to point to new cluster
5. Monitor logs and metrics for issues
6. Keep OpenShift cluster running for 24 hours as backup

```bash
# DNS cutover example
# Update A records to point to new cluster load balancer
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Post-Migration Cleanup

After successful migration and stabilization:

```bash
# Archive OpenShift configurations
tar czf openshift-configs-$(date +%Y%m%d).tar.gz *.yaml

# Document lessons learned
# Update runbooks and documentation
# Train team on vanilla Kubernetes operations

# Decommission OpenShift cluster (after 30 days of successful operation)
```

## Conclusion

Migrating from OpenShift to vanilla Kubernetes requires careful planning and translation of platform-specific resources. The key is understanding how OpenShift abstractions map to standard Kubernetes primitives and replacing OpenShift-specific features with equivalent open-source tools. With proper testing and a phased approach, you can successfully migrate while maintaining application availability and preserving configurations.
