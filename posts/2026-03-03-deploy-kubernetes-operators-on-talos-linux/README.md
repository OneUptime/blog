# How to Deploy Kubernetes Operators on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Operator, Custom Resources, Automation, Cloud Native

Description: Learn how to deploy and manage Kubernetes Operators on Talos Linux to automate complex application lifecycle management tasks.

---

Kubernetes Operators extend the platform's capabilities by encoding operational knowledge into software. Instead of manually managing complex applications like databases, message queues, or monitoring systems, an Operator automates deployment, scaling, backup, upgrades, and failure recovery. On Talos Linux, Operators are particularly valuable because the immutable operating system means you cannot rely on traditional system administration tools - everything must be managed through the Kubernetes API.

This guide covers how to find, deploy, and manage Operators on a Talos Linux cluster.

## What Is a Kubernetes Operator?

An Operator is a method of packaging, deploying, and managing a Kubernetes application. It consists of:

1. **Custom Resource Definitions (CRDs)** - Define new resource types specific to the application
2. **A Controller** - Watches for changes to custom resources and takes action to reconcile the desired state with the actual state
3. **Operational Logic** - Encodes best practices for managing the application (backups, scaling, upgrades, etc.)

For example, a PostgreSQL Operator lets you create a `PostgresCluster` custom resource, and the Operator handles creating StatefulSets, Services, PersistentVolumeClaims, backup CronJobs, and everything else needed to run a production database.

## Finding Operators

The best place to discover Operators is OperatorHub.io, which catalogs hundreds of Operators for various applications. You can also find Operators on:

- Artifact Hub (artifacthub.io)
- GitHub repositories of specific projects
- Helm chart repositories (many Operators are distributed as Helm charts)

```bash
# Search for operators on Artifact Hub
# Visit https://artifacthub.io and filter by "Operator"

# Or use the OLM (Operator Lifecycle Manager) catalog
kubectl get packagemanifests
```

## Deploying an Operator with kubectl

The simplest way to deploy an Operator is by applying its manifests directly. Let us deploy the NGINX Ingress Operator as an example:

```bash
# Apply the CRDs first
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Verify the deployment
kubectl get pods -n ingress-nginx
kubectl get ingressclass
```

For Operators distributed as a collection of YAML files:

```bash
# Typical Operator installation pattern
# 1. Apply CRDs
kubectl apply -f crds/

# 2. Create namespace
kubectl create namespace operator-system

# 3. Apply RBAC
kubectl apply -f rbac/

# 4. Deploy the operator
kubectl apply -f operator/
```

## Deploying Operators with Helm

Many Operators are distributed as Helm charts, which simplifies installation and upgrades:

```bash
# Example: Deploy the Redis Operator
helm repo add ot-helm https://ot-container-kit.github.io/helm-charts/
helm repo update

helm install redis-operator ot-helm/redis-operator \
  --namespace redis-operator \
  --create-namespace

# Verify the operator is running
kubectl get pods -n redis-operator
```

Once the Operator is running, you can create Redis clusters using custom resources:

```yaml
# redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
spec:
  clusterSize: 3
  kubernetesConfig:
    image: redis:7.2
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
```

```bash
kubectl apply -f redis-cluster.yaml

# Watch the Operator create the Redis cluster
kubectl get pods -l app=redis-cluster -w
```

## Deploying the PostgreSQL Operator

Let us walk through a complete example with the CloudNativePG Operator:

```bash
# Install CloudNativePG
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml

# Wait for the operator to be ready
kubectl rollout status deployment cnpg-controller-manager -n cnpg-system
```

Now create a PostgreSQL cluster:

```yaml
# postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: my-postgres
  namespace: default
spec:
  instances: 3
  storage:
    size: 10Gi
    storageClass: local-path

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"

  bootstrap:
    initdb:
      database: myapp
      owner: myapp
      secret:
        name: myapp-db-credentials

  backup:
    barmanObjectStore:
      destinationPath: s3://my-backups/postgres/
      endpointURL: https://s3.amazonaws.com
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-credentials
          key: SECRET_ACCESS_KEY
    retentionPolicy: "30d"

  monitoring:
    enablePodMonitor: true
```

```bash
# Create the database credentials
kubectl create secret generic myapp-db-credentials \
  --from-literal=username=myapp \
  --from-literal=password='DatabaseP@ss123'

# Deploy the cluster
kubectl apply -f postgres-cluster.yaml

# Watch the cluster come up
kubectl get cluster my-postgres -w
kubectl get pods -l cnpg.io/cluster=my-postgres -w
```

## Verifying Operator Functionality

After deploying an Operator, verify it is working correctly:

```bash
# Check the Operator pod is running
kubectl get pods -n <operator-namespace>

# View Operator logs for errors
kubectl logs -n <operator-namespace> -l control-plane=controller-manager --tail=50

# Verify CRDs are installed
kubectl get crds | grep <operator-domain>

# Check custom resources
kubectl get <custom-resource-type> --all-namespaces

# View events related to the Operator
kubectl get events -n <operator-namespace> --sort-by='.lastTimestamp'
```

## Operator RBAC on Talos Linux

Operators need specific RBAC permissions to manage resources. Most Operators come with their own RBAC configuration, but you should review it:

```bash
# List ClusterRoles created by an Operator
kubectl get clusterroles | grep <operator-name>

# View the permissions
kubectl describe clusterrole <operator-role-name>

# Check if the Operator has overly broad permissions
kubectl get clusterrole <operator-role-name> -o yaml | grep -A 5 "rules:"
```

For security-sensitive Talos Linux deployments, consider restricting Operator permissions to specific namespaces:

```yaml
# namespace-scoped-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: operator-role
  namespace: app-namespace
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Upgrading Operators

Upgrading an Operator requires care since it manages other workloads:

```bash
# For Helm-based Operators
helm repo update
helm upgrade redis-operator ot-helm/redis-operator \
  --namespace redis-operator

# For manifest-based Operators
kubectl apply -f https://example.com/operator/v2.0.0/install.yaml

# Always check the upgrade notes and CRD changes
kubectl get crds -o custom-columns=NAME:.metadata.name,VERSION:.spec.versions[*].name
```

After upgrading, verify managed resources are healthy:

```bash
# Check all managed resources
kubectl get <custom-resource> --all-namespaces

# Look for reconciliation errors
kubectl logs -n <operator-namespace> -l control-plane=controller-manager --tail=100 | grep -i error
```

## Uninstalling Operators

When removing an Operator, decide whether to keep the managed resources:

```bash
# Option 1: Remove the Operator but keep managed resources
# Delete the operator deployment
kubectl delete deployment <operator-name> -n <operator-namespace>

# The custom resources remain but are no longer managed

# Option 2: Clean up everything
# First, delete all custom resources
kubectl delete <custom-resource> --all --all-namespaces

# Then remove the operator
helm uninstall <operator-name> -n <operator-namespace>

# Finally, remove CRDs (this deletes ALL custom resources of that type!)
kubectl delete crd <crd-name>
```

## Monitoring Operators

Set up monitoring for your Operators:

```bash
# Check operator health
kubectl get pods -n <operator-namespace> -o wide

# Monitor resource usage
kubectl top pods -n <operator-namespace>

# Set up alerts for operator failures
# Most operators expose Prometheus metrics
kubectl port-forward -n <operator-namespace> svc/<operator-metrics-service> 8443:8443
curl -k https://localhost:8443/metrics
```

## Wrapping Up

Kubernetes Operators on Talos Linux automate the heavy lifting of managing complex applications. They are especially valuable on Talos because the immutable OS means all management must happen through the Kubernetes API. Start with well-established Operators for your databases and infrastructure components, verify their RBAC permissions, and monitor them alongside your application workloads. The Operator pattern transforms manual runbooks into automated controllers that run 24/7, making your Talos Linux cluster truly self-managing.
