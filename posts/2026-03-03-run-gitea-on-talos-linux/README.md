# How to Run Gitea on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Gitea, Git, Self-Hosted, Kubernetes, DevOps

Description: A practical guide to deploying Gitea, a lightweight self-hosted Git service, on a Talos Linux Kubernetes cluster with persistent storage and ingress.

---

Gitea is a lightweight, self-hosted Git service that gives you full control over your source code without depending on third-party platforms. Running it on Talos Linux makes a lot of sense because Talos provides a minimal, immutable, and secure operating system designed specifically for Kubernetes. Together, they form a solid foundation for teams that want a private Git hosting solution that is both performant and easy to maintain.

In this guide, we will walk through the entire process of deploying Gitea on a Talos Linux cluster, including setting up persistent storage, configuring the database, exposing the service through an ingress, and verifying everything works correctly.

## Prerequisites

Before you begin, make sure you have the following in place:

- A running Talos Linux cluster with at least one control plane node and one worker node
- kubectl configured to communicate with your cluster
- A storage provisioner such as local-path-provisioner or Longhorn for persistent volumes
- An ingress controller like Nginx or Traefik deployed on your cluster
- Helm installed on your local machine

If you do not already have a storage provisioner, you can install local-path-provisioner quickly:

```bash
# Install local-path-provisioner for persistent storage
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
```

## Creating the Namespace

Start by creating a dedicated namespace for Gitea. This keeps things organized and makes it easier to manage resources later.

```yaml
# gitea-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gitea
```

Apply it:

```bash
kubectl apply -f gitea-namespace.yaml
```

## Deploying Gitea with Helm

The simplest way to deploy Gitea on Kubernetes is through the official Helm chart. Add the Gitea Helm repository first:

```bash
# Add the Gitea Helm chart repository
helm repo add gitea-charts https://dl.gitea.com/charts/
helm repo update
```

Now create a values file that configures Gitea for your Talos Linux environment:

```yaml
# gitea-values.yaml
replicaCount: 1

image:
  repository: gitea/gitea
  tag: "1.21"
  pullPolicy: IfNotPresent

# Persistent storage for Gitea data
persistence:
  enabled: true
  size: 10Gi
  storageClass: local-path

# Built-in PostgreSQL database
postgresql:
  enabled: true
  global:
    postgresql:
      auth:
        password: "your-secure-password"
        database: gitea
  primary:
    persistence:
      enabled: true
      size: 5Gi
      storageClass: local-path

# Gitea application configuration
gitea:
  admin:
    username: gitea-admin
    password: "your-admin-password"
    email: "admin@example.com"
  config:
    database:
      DB_TYPE: postgres
    server:
      DOMAIN: gitea.example.com
      ROOT_URL: https://gitea.example.com
    service:
      DISABLE_REGISTRATION: false

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: gitea.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: gitea-tls
      hosts:
        - gitea.example.com
```

Deploy Gitea using the values file:

```bash
# Install Gitea using Helm with custom values
helm install gitea gitea-charts/gitea \
  --namespace gitea \
  -f gitea-values.yaml
```

## Verifying the Deployment

After running the Helm install, check that all pods are coming up properly:

```bash
# Check the status of pods in the gitea namespace
kubectl get pods -n gitea -w
```

You should see the Gitea pod and the PostgreSQL pod both reaching the Running state. If either pod is stuck in a CrashLoopBackOff or Pending state, check the logs:

```bash
# View logs for the Gitea pod
kubectl logs -n gitea deployment/gitea -f

# View logs for the PostgreSQL pod
kubectl logs -n gitea statefulset/gitea-postgresql -f
```

## Setting Up SSH Access for Git

Gitea supports SSH-based Git operations, which is preferred by many developers. To enable SSH access on Talos Linux, you need to expose the SSH port through a service:

```yaml
# gitea-ssh-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: gitea-ssh
  namespace: gitea
spec:
  type: NodePort
  ports:
    - port: 22
      targetPort: 22
      nodePort: 30022
      protocol: TCP
      name: ssh
  selector:
    app: gitea
```

Apply this service:

```bash
kubectl apply -f gitea-ssh-service.yaml
```

Now users can clone repositories over SSH using port 30022 on any node in the cluster.

## Configuring Persistent Storage on Talos

One thing to keep in mind with Talos Linux is that the filesystem is read-only except for specific paths. When using local-path-provisioner, data is stored under `/var/local-path-provisioner` by default. You may need to configure Talos to allow writes to this path through a machine configuration patch:

```yaml
# talos-storage-patch.yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/local-path-provisioner
        type: bind
        source: /var/local-path-provisioner
        options:
          - bind
          - rshared
          - rw
```

Apply the patch to your worker nodes:

```bash
# Apply the storage patch to worker nodes
talosctl apply-config --patch @talos-storage-patch.yaml --nodes <worker-node-ip>
```

## Configuring Gitea for Production Use

For production deployments, there are several additional settings you should consider. Update your Gitea configuration through the Helm values:

```yaml
# Additional production settings in gitea-values.yaml
gitea:
  config:
    mailer:
      ENABLED: true
      SMTP_ADDR: smtp.example.com
      SMTP_PORT: 587
      FROM: "gitea@example.com"
    cache:
      ADAPTER: memory
    session:
      PROVIDER: memory
    log:
      MODE: console
      LEVEL: Info
    security:
      INSTALL_LOCK: true
      SECRET_KEY: "generate-a-long-random-string"
```

Upgrade the deployment with the new values:

```bash
helm upgrade gitea gitea-charts/gitea \
  --namespace gitea \
  -f gitea-values.yaml
```

## Setting Up Backups

Since Gitea stores both your repositories and metadata in persistent volumes, you need a backup strategy. A simple approach is to use Velero for Kubernetes backup:

```bash
# Install Velero for cluster backups
velero install --provider aws \
  --bucket gitea-backups \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-east-1

# Create a scheduled backup for the gitea namespace
velero schedule create gitea-daily \
  --schedule="0 2 * * *" \
  --include-namespaces gitea \
  --ttl 720h
```

This creates daily backups of the entire Gitea namespace, including persistent volumes, and retains them for 30 days.

## Monitoring Gitea

To keep an eye on your Gitea instance, you can enable Prometheus metrics. Add this to your Gitea configuration:

```yaml
gitea:
  config:
    metrics:
      ENABLED: true
      TOKEN: "your-metrics-token"
```

Then create a ServiceMonitor if you have Prometheus Operator installed:

```yaml
# gitea-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gitea
  namespace: gitea
spec:
  selector:
    matchLabels:
      app: gitea
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Troubleshooting Common Issues

If Gitea fails to start on Talos Linux, the most common issues are related to storage permissions and network policies. Check that your persistent volumes are properly bound:

```bash
# Verify persistent volume claims
kubectl get pvc -n gitea
```

If the PVCs are stuck in Pending, your storage class may not be configured correctly. Also check that there are no network policies blocking traffic between the Gitea pod and the PostgreSQL pod.

Another common issue on Talos Linux is DNS resolution. Make sure CoreDNS is running properly:

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Conclusion

Running Gitea on Talos Linux gives you a secure, minimal, and highly maintainable self-hosted Git platform. The immutable nature of Talos means you do not have to worry about configuration drift on the host level, and Gitea's lightweight design means it runs efficiently even on modest hardware. With proper persistent storage, ingress, and monitoring in place, you have a production-ready Git hosting solution that you fully control.
