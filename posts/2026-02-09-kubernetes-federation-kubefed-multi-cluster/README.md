# How to Set Up Kubernetes Federation v2 with KubeFed for Multi-Cluster Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Federation

Description: Learn how to install and configure KubeFed (Kubernetes Federation v2) to manage and deploy applications across multiple Kubernetes clusters from a single control plane.

---

Managing applications across multiple Kubernetes clusters is complex. Each cluster needs its own deployments, services, and configurations. KubeFed (Kubernetes Federation v2) solves this by providing a single control plane that propagates resources to multiple clusters. You define resources once, and KubeFed distributes them across your cluster fleet.

## Understanding KubeFed Architecture

KubeFed introduces several concepts:

- **Host Cluster**: The cluster running the KubeFed control plane
- **Member Clusters**: Clusters managed by KubeFed
- **Federated Resources**: Resources that KubeFed synchronizes across clusters
- **Placement**: Rules defining which clusters receive which resources
- **Override**: Cluster-specific customizations to federated resources

## Installing KubeFed

Install KubeFed on your host cluster using Helm:

```bash
# Add KubeFed Helm repository
helm repo add kubefed-charts https://raw.githubusercontent.com/kubernetes-sigs/kubefed/master/charts
helm repo update

# Create namespace for KubeFed
kubectl create namespace kube-federation-system

# Install KubeFed
helm install kubefed kubefed-charts/kubefed \
  --namespace kube-federation-system \
  --create-namespace \
  --set controllermanager.replicaCount=2
```

Verify installation:

```bash
kubectl get pods -n kube-federation-system
kubectl get crd | grep federation
```

You should see CRDs like:

```
federatedconfigmaps.types.kubefed.io
federateddeployments.types.kubefed.io
federatedservices.types.kubefed.io
kubefedclusters.core.kubefed.io
kubefedconfigs.core.kubefed.io
```

## Joining Member Clusters

To manage a cluster with KubeFed, join it as a member cluster. First, ensure you have kubeconfig access to all clusters:

```bash
# List available contexts
kubectl config get-contexts
```

Output shows your clusters:

```
CURRENT   NAME           CLUSTER        AUTHINFO       NAMESPACE
*         cluster-1      cluster-1      admin-1
          cluster-2      cluster-2      admin-2
          cluster-3      cluster-3      admin-3
```

Join cluster-2 and cluster-3 to the federation (assuming cluster-1 is the host):

```bash
# Join cluster-2
kubefedctl join cluster-2 \
  --cluster-context cluster-1 \
  --host-cluster-context cluster-1 \
  --kubefed-namespace kube-federation-system \
  --v=2

# Join cluster-3
kubefedctl join cluster-3 \
  --cluster-context cluster-1 \
  --host-cluster-context cluster-1 \
  --kubefed-namespace kube-federation-system \
  --v=2
```

If kubefedctl isn't installed:

```bash
# Install kubefedctl
curl -LO https://github.com/kubernetes-sigs/kubefed/releases/download/v0.10.0/kubefedctl-0.10.0-linux-amd64.tgz
tar -xzf kubefedctl-0.10.0-linux-amd64.tgz
sudo mv kubefedctl /usr/local/bin/
```

Verify joined clusters:

```bash
kubectl get kubefedclusters -n kube-federation-system
```

Output:

```
NAME        AGE   READY
cluster-2   1m    True
cluster-3   1m    True
```

## Creating a Federated Namespace

Namespaces must be federated before you can deploy federated resources to them:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedNamespace
metadata:
  name: production
  namespace: production
spec:
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
```

Apply this to the host cluster:

```bash
kubectl apply -f federated-namespace.yaml
```

KubeFed creates the "production" namespace in cluster-2 and cluster-3.

Verify:

```bash
kubectl get namespace production --context cluster-2
kubectl get namespace production --context cluster-3
```

## Deploying Federated Applications

Create a federated deployment that runs across all member clusters:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: webapp
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: webapp
    spec:
      replicas: 3
      selector:
        matchLabels:
          app: webapp
      template:
        metadata:
          labels:
            app: webapp
        spec:
          containers:
          - name: webapp
            image: webapp:v2.1
            ports:
            - containerPort: 8080
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
```

Apply to host cluster:

```bash
kubectl apply -f federated-deployment.yaml
```

KubeFed creates the deployment in both clusters:

```bash
# Check deployment in cluster-2
kubectl get deployment webapp -n production --context cluster-2

# Check deployment in cluster-3
kubectl get deployment webapp -n production --context cluster-3
```

## Using Placement Policies

Control which clusters receive resources using placement policies:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: api-server
  namespace: production
spec:
  template:
    # ... deployment spec ...
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
    clusterSelector:
      matchLabels:
        environment: production
        region: us-east
```

Label your clusters:

```bash
kubectl label kubefedclusters cluster-2 \
  environment=production region=us-east \
  -n kube-federation-system

kubectl label kubefedclusters cluster-3 \
  environment=production region=us-west \
  -n kube-federation-system
```

Now only clusters matching the selector receive the deployment.

## Applying Cluster-Specific Overrides

Different clusters often need different configurations. Use overrides:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: webapp
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: webapp
    spec:
      replicas: 3  # Default replica count
      selector:
        matchLabels:
          app: webapp
      template:
        metadata:
          labels:
            app: webapp
        spec:
          containers:
          - name: webapp
            image: webapp:v2.1
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
  overrides:
  # cluster-2 is larger, run more replicas
  - clusterName: cluster-2
    clusterOverrides:
    - path: "/spec/replicas"
      value: 5
  # cluster-3 has different resource constraints
  - clusterName: cluster-3
    clusterOverrides:
    - path: "/spec/template/spec/containers/0/resources/requests/cpu"
      value: "100m"
    - path: "/spec/template/spec/containers/0/resources/requests/memory"
      value: "128Mi"
```

This creates:
- cluster-2: 5 replicas with 200m CPU, 256Mi memory
- cluster-3: 3 replicas with 100m CPU, 128Mi memory

## Federating Services

Create a federated service to expose your application:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedService
metadata:
  name: webapp-service
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: webapp
    spec:
      selector:
        app: webapp
      ports:
      - protocol: TCP
        port: 80
        targetPort: 8080
      type: LoadBalancer
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
```

Apply this to create LoadBalancer services in each cluster:

```bash
kubectl apply -f federated-service.yaml

# Get LoadBalancer IPs
kubectl get service webapp-service -n production --context cluster-2
kubectl get service webapp-service -n production --context cluster-3
```

## Setting Up Multi-Cluster DNS

For seamless failover, use KubeFed's multi-cluster DNS with ExternalDNS:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedService
metadata:
  name: webapp-service
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        external-dns.alpha.kubernetes.io/hostname: webapp.example.com
    spec:
      selector:
        app: webapp
      ports:
      - protocol: TCP
        port: 80
        targetPort: 8080
      type: LoadBalancer
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
```

Install ExternalDNS in each cluster:

```bash
helm install external-dns bitnami/external-dns \
  --namespace kube-system \
  --set provider=aws \
  --set aws.region=us-east-1 \
  --set domainFilters[0]=example.com
```

ExternalDNS creates DNS records pointing to each cluster's LoadBalancer IP.

## Federating ConfigMaps and Secrets

Distribute configuration across clusters:

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedConfigMap
metadata:
  name: app-config
  namespace: production
spec:
  template:
    data:
      app.properties: |
        environment=production
        log.level=info
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
  overrides:
  # cluster-3 uses debug logging
  - clusterName: cluster-3
    clusterOverrides:
    - path: "/data/app.properties"
      value: |
        environment=production
        log.level=debug
---
apiVersion: types.kubefed.io/v1beta1
kind: FederatedSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  template:
    type: Opaque
    data:
      username: YWRtaW4=  # base64 encoded "admin"
      password: cGFzc3dvcmQ=  # base64 encoded "password"
  placement:
    clusters:
    - name: cluster-2
    - name: cluster-3
```

## Monitoring Federation Status

Check the status of federated resources:

```bash
# View all federated deployments
kubectl get federateddeployments -n production

# Get detailed status
kubectl describe federateddeployment webapp -n production
```

Status shows propagation state:

```yaml
status:
  clusters:
  - name: cluster-2
    status: Synced
  - name: cluster-3
    status: Synced
  conditions:
  - lastTransitionTime: "2026-02-09T10:30:00Z"
    status: "True"
    type: Propagation
```

Monitor KubeFed controller logs:

```bash
kubectl logs -n kube-federation-system deployment/kubefed-controller-manager -f
```

## Best Practices

**Start with a subset of clusters**: Don't federate your entire fleet immediately. Start with 2-3 clusters to learn the system.

**Use labels for dynamic placement**: Instead of listing clusters explicitly, use label selectors. This makes it easy to add new clusters without updating all resources.

**Test overrides carefully**: Path-based overrides are powerful but error-prone. Test in a staging federation before production.

**Monitor propagation lag**: Track how long it takes for changes to propagate to member clusters. Large numbers of resources can cause delays.

**Handle cluster failures gracefully**: If a member cluster becomes unavailable, KubeFed retries propagation. Ensure your placement policies account for this.

**Document federation decisions**: Not all resources should be federated. Document which resources are federated and why:

```yaml
metadata:
  annotations:
    federation-rationale: "Application must run in all regions for low latency"
```

KubeFed provides a powerful foundation for multi-cluster management. By federating resources, you gain a single control plane for deploying applications across clusters while maintaining the flexibility to customize deployments for each cluster's unique requirements.
