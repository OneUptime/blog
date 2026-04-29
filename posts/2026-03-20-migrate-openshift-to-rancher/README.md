# How to Migrate from OpenShift to Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, OpenShift, Kubernetes, Migration, Container Platform

Description: Learn how to migrate workloads and configurations from Red Hat OpenShift to Rancher-managed Kubernetes, addressing OpenShift-specific APIs and security contexts.

## Introduction

OpenShift is a Kubernetes-based container platform with proprietary extensions. Migrating to Rancher-managed Kubernetes reduces licensing costs and removes vendor lock-in while maintaining enterprise-grade cluster management capabilities.

## Key Differences to Address

| OpenShift Feature | Kubernetes/Rancher Equivalent |
|---|---|
| Route | Ingress |
| BuildConfig / ImageStream | CI/CD Pipeline + Container Registry |
| DeploymentConfig | Deployment |
| Project | Namespace + Rancher Project |
| SecurityContextConstraints (SCC) | PodSecurityAdmission / PSS |
| OpenShift OAuth | OIDC / Dex |
| oc CLI | kubectl + Rancher CLI |

## Step 1: Audit OpenShift Resources

Export all resources from OpenShift:

```bash
# Export all namespaces (projects)

oc get projects -o json > projects.json

# Export workloads per namespace
for ns in $(oc get projects -o jsonpath='{.items[*].metadata.name}'); do
  mkdir -p export/$ns
  oc get all -n $ns -o yaml > export/$ns/all-resources.yaml
  oc get secrets -n $ns -o yaml > export/$ns/secrets.yaml
  oc get configmaps -n $ns -o yaml > export/$ns/configmaps.yaml
  oc get pvc -n $ns -o yaml > export/$ns/pvcs.yaml
done
```

## Step 2: Replace OpenShift Routes with Ingress

OpenShift Route:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: api
spec:
  host: api.example.com
  to:
    kind: Service
    name: api
  tls:
    termination: edge
```

Kubernetes Ingress equivalent:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
```

## Step 3: Convert DeploymentConfig to Deployment

OpenShift `DeploymentConfig` has triggers not present in Kubernetes `Deployment`. Replace with standard Deployments and external CI/CD for image-change triggers:

```yaml
# Replace DeploymentConfig with standard Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/myapp/api:latest
          ports:
            - containerPort: 8080
```

Use image update automation (Flux Image Automation) or Rancher Fleet to handle image-change triggers.

## Step 4: Handle Security Context Constraints

OpenShift SCCs restrict container privileges. Kubernetes uses PodSecurityAdmission:

```yaml
# Label namespace for restricted policy
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted

# Update container security contexts to comply
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop:
      - ALL
```

## Step 5: Replace OpenShift OAuth

Configure Rancher authentication with your identity provider:

1. In Rancher, click ☰ and navigate to **Users & Authentication** > **Auth Provider**.
2. Choose LDAP, Active Directory, GitHub, or OIDC.
3. Configure the provider details and test the connection.

## Step 6: Replace Build Pipelines

OpenShift BuildConfigs and ImageStreams typically move to external CI/CD:

```yaml
# Example Tekton pipeline (popular on Kubernetes)
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-deploy
spec:
  tasks:
    - name: build-image
      taskRef:
        name: buildah
      params:
        - name: IMAGE
          value: registry.example.com/myapp:$(tasks.git-clone.results.commit)
    - name: deploy
      taskRef:
        name: kubectl-deploy
      runAfter:
        - build-image
```

## Step 7: Deploy via Rancher

1. Create namespaces corresponding to OpenShift Projects.
2. Apply secrets and configmaps first.
3. Apply Deployments, Services, and Ingress resources.
4. Configure Rancher Projects to group namespaces as they were grouped in OpenShift.

## Step 8: Validate and Cut Over

```bash
# Verify all pods are running
kubectl get pods -n production

# Test all services
kubectl get ingress -n production

# Check PVC bindings
kubectl get pvc -n production
```

## Best Practices

- Address security contexts early - they are the most common source of migration issues.
- Test non-production environments thoroughly before production migration.
- Use Rancher's Projects and RBAC to replicate OpenShift's Project-level access controls.
- Consider Tekton or Argo CD as CI/CD replacements for OpenShift Pipelines.
- Maintain dual-running environments during cutover to allow quick rollback.

## Conclusion

Migrating from OpenShift to Rancher requires addressing OpenShift-specific APIs - particularly Routes, DeploymentConfigs, and SCCs - but the underlying Kubernetes primitives map cleanly. The result is a platform with the same enterprise capabilities, lower licensing costs, and greater community ecosystem support.
