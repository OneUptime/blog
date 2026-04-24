# How to Deploy a Kubernetes Application via YAML Manifest in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, YAML, Deployment, DevOps

Description: Learn how to deploy Kubernetes applications by writing and applying YAML manifests directly in Portainer's web editor.

## Introduction

While Portainer's form-based deployment is great for getting started, deploying via YAML manifests gives you full control over all Kubernetes configuration options. Portainer's web editor makes it easy to write and apply manifests without leaving the browser. This guide covers YAML-based deployments in Portainer.

## Prerequisites

- Portainer with a Kubernetes environment
- Basic understanding of Kubernetes YAML manifests
- Target namespace exists, and any referenced Secret, ConfigMap, PVC, or image pull secret is already created unless you apply them in the same manifest

## Step 1: Navigate to YAML Deployment

1. Select your Kubernetes environment
2. Click **Applications → Create from code**
3. Select **Manifest**
4. In **Deploy to**, select the target namespace, or enable **Use namespace(s) specified from manifest** if your YAML already sets `metadata.namespace`

## Step 2: Write a Deployment Manifest

In **Deploy from**, select **Web editor** and enter your YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: production
  labels:
    app: my-api
    version: v2.0.0
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0    # Keeps desired replicas available during rollout
  template:
    metadata:
      labels:
        app: my-api
        version: v2.0.0
    spec:
      # Security context for the pod
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api
          image: registry.company.com/my-api:v2.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              name: http
          # Resource constraints
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          # Health checks
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3
          # Environment configuration
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "8080"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            - name: APP_CONFIG
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: config.json
          # Volume mounts
          volumeMounts:
            - name: config-volume
              mountPath: /app/config
              readOnly: true
            - name: data-volume
              mountPath: /app/data
          # Security context for container
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      # Pull secret for private registry
      imagePullSecrets:
        - name: registry-credentials
      volumes:
        - name: config-volume
          configMap:
            name: app-config
        - name: data-volume
          persistentVolumeClaim:
            claimName: my-api-data
      # Graceful shutdown
      terminationGracePeriodSeconds: 30
```

## Step 3: Add a Service Manifest

In the same YAML editor, separate multiple resources with `---`:

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: production
spec:
  selector:
    app: my-api
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: my-api-external
  namespace: production
spec:
  selector:
    app: my-api
  ports:
    - name: http
      port: 80
      targetPort: 8080
  type: LoadBalancer  # Requires a supported cloud/provider or load balancer integration
```

## Step 4: Apply the YAML

1. Review the YAML for syntax errors in the web editor
2. Click **Deploy**
3. Portainer applies the manifest to the cluster

```bash
# Equivalent kubectl command

kubectl apply -f my-api.yaml -n production
```

## Step 5: Update the Application

To update the deployment:

1. Navigate to the application in Portainer
2. Click **Edit this application**
3. Modify the manifest (e.g., update image tag)
4. Click **Update application**

In Portainer Business Edition, you can also edit the application's YAML from the **YAML** tab.

```yaml
# Change:
image: registry.company.com/my-api:v2.0.0
# To:
image: registry.company.com/my-api:v2.1.0
```

## Step 6: Apply Multiple Manifests

You can apply multiple Kubernetes resources at once:

```yaml
# All resources in one YAML file separated by ---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: production
  LOG_LEVEL: info
  config.json: |
    {"logLevel":"info","featureFlags":{"beta":false}}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-api-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: production
# ... (full deployment spec)
---
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: production
# ... (service spec)
```

## Step 7: Rollback to a Previous Version

```bash
# View rollout history
kubectl rollout history deployment/my-api -n production

# Rollback to previous version
kubectl rollout undo deployment/my-api -n production

# Rollback to a specific revision
kubectl rollout undo deployment/my-api --to-revision=3 -n production
```

## Step 8: Apply from a URL in Portainer

Instead of pasting YAML into the Web editor, choose **URL** in the **Deploy from** section:

1. Select **URL**
2. Enter a raw GitHub URL or another direct URL to the manifest file
3. Click **Deploy**

## Conclusion

YAML-based deployments in Portainer give you full control over all Kubernetes resource configurations. By using the web editor, you get a convenient environment to write, review, and apply manifests without setting up local kubectl access. For production deployments, store your manifests in Git and use GitOps practices to track all changes to your Kubernetes resources.
