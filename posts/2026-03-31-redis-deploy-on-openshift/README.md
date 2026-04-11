# How to Deploy Redis on OpenShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OpenShift, Kubernetes, Container, Deployment

Description: Step-by-step guide to deploying Redis on OpenShift, handling security context constraints, persistent storage, and service configuration.

---

OpenShift adds security layers on top of Kubernetes that require extra configuration when deploying Redis. The most common challenge is Security Context Constraints (SCCs), which prevent containers from running as root by default.

## Understanding OpenShift Security Context Constraints

By default, OpenShift's `restricted` SCC prevents pods from running as specific UIDs. Redis container images often expect to run as UID 999. You need to grant the service account permission to use a nonroot SCC or set the correct UID.

## Option 1: Deploy Using the Bitnami Redis Image

Bitnami's Redis image is designed to run as a non-root user, making it OpenShift-compatible out of the box:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: redis
        image: bitnami/redis:7.2
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        - name: REDIS_AOF_ENABLED
          value: "yes"
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /bitnami/redis/data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

## Creating the Required Resources

Create the secret and PVC first:

```bash
oc create secret generic redis-secret \
  --from-literal=password=your-strong-password \
  -n my-app

oc apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: my-app
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF
```

## Option 2: Grant anyuid SCC for Official Redis Image

If you need to use the official Redis image, grant the `anyuid` SCC to the service account:

```bash
# Create a dedicated service account
oc create serviceaccount redis-sa -n my-app

# Grant anyuid SCC
oc adm policy add-scc-to-user anyuid -z redis-sa -n my-app
```

Then reference the service account in your deployment:

```yaml
spec:
  serviceAccountName: redis-sa
  containers:
  - name: redis
    image: redis:7.2-alpine
    securityContext:
      runAsUser: 999
      allowPrivilegeEscalation: false
```

## Exposing Redis as a Service

Create a ClusterIP service for internal access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: my-app
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

```bash
oc apply -f redis-service.yaml
```

## Deploying Redis with Helm on OpenShift

The Bitnami Redis Helm chart has OpenShift-specific settings:

```bash
helm install redis oci://registry-1.docker.io/bitnamicharts/redis \
  --set global.storageClass=gp2 \
  --set auth.password=your-strong-password \
  --set master.podSecurityContext.enabled=true \
  --set master.podSecurityContext.fsGroup=1001 \
  --set master.containerSecurityContext.runAsUser=1001 \
  -n my-app
```

## Verifying the Deployment

```bash
# Check pod status
oc get pods -n my-app -l app=redis

# Test connectivity
oc exec -it redis-master-0 -n my-app -- redis-cli -a your-strong-password ping
```

Expected output:

```text
PONG
```

## Summary

Deploying Redis on OpenShift requires handling Security Context Constraints, which restrict container user IDs for security. Using the Bitnami Redis image is the simplest path since it runs as a non-root user by default. For the official Redis image, grant the `anyuid` SCC to a dedicated service account. Always use persistent storage and secrets for production deployments.
