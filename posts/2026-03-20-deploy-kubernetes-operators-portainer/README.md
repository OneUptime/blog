# How to Deploy Kubernetes Operators via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Operator, CRD, Automation, Infrastructure

Description: Deploy and manage Kubernetes Operators through Portainer's manifest interface to automate complex stateful application lifecycle operations like database provisioning, backup, and scaling.

---

Kubernetes Operators extend the Kubernetes API with custom controllers that automate the operational knowledge of complex applications. Instead of manually managing database failovers or certificate renewals, an Operator watches custom resources and performs the right actions. Portainer's manifest editor makes it straightforward to install Operators and create custom resources.

## What Operators Do

| Operator | Automates |
|---|---|
| PostgreSQL Operator (Zalando) | Cluster provisioning, failover, backup |
| Cert-Manager | Certificate issuance and renewal |
| Prometheus Operator | Prometheus/Alertmanager lifecycle |
| Strimzi | Kafka cluster management |
| KEDA | Event-driven autoscaling |

## Step 1: Install an Operator via Portainer

Most Operators ship as YAML manifests or Helm charts. Use Portainer's **Kubernetes > Advanced Deployment** to apply manifests.

Example: Install Cert-Manager:

```bash
# Apply the Cert-Manager CRDs and Operator in one manifest

# Copy the URL to Portainer's manifest import or paste content
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

Via Portainer's URL manifest import:

1. Go to **Kubernetes > Namespaces > Add**
2. Create namespace `cert-manager`
3. Go to **Advanced Deployment**
4. Paste the cert-manager manifest YAML and click **Deploy**

## Step 2: Verify Operator Pods

Check the Operator is running via Portainer's namespace view:

```text
Namespace: cert-manager
Pods:
  cert-manager-xxxxxx         Running
  cert-manager-cainjector-xx  Running
  cert-manager-webhook-xx     Running
```

## Step 3: Create Custom Resources

Once an Operator is installed, create Custom Resources to trigger its automation. Example: issue a TLS certificate with Cert-Manager:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: production
spec:
  secretName: api-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
```

Apply both manifests via Portainer's Advanced Deployment.

## Step 4: PostgreSQL Operator Example

Install the Zalando Postgres Operator and create a cluster:

```yaml
# postgres-cluster.yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: production-db
  namespace: production
spec:
  teamId: "production"
  volume:
    size: 50Gi
  numberOfInstances: 3
  users:
    appuser:
      - superuser
      - createdb
  databases:
    myapp: appuser
  postgresql:
    version: "16"
```

The Operator watches this resource and automatically provisions a 3-node HA PostgreSQL cluster with streaming replication.

## Step 5: Monitor Operator Status via Portainer

Custom resources created by Operators are visible in Portainer under **Kubernetes > Custom Resources** (depending on Portainer version). Use the terminal to check status:

```bash
# Check Certificate issuance status
kubectl get certificates -n production
kubectl describe certificate api-tls -n production

# Check PostgreSQL cluster status
kubectl get postgresql -n production
```

## Summary

Portainer's manifest interface provides a practical path to Operator-based Kubernetes automation without requiring deep kubectl expertise. By deploying Operators and their CRDs through Portainer's deployment interface, teams can leverage sophisticated application lifecycle automation while maintaining a consistent management workflow.
