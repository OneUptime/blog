# How to Connect to AlloyDB from a GKE Cluster Using the AlloyDB Auth Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, GKE, Auth Proxy, Kubernetes, PostgreSQL

Description: Learn how to securely connect to AlloyDB from GKE pods using the AlloyDB Auth Proxy as a sidecar container with Workload Identity for authentication.

---

Connecting to AlloyDB from a GKE cluster is straightforward when your pods can directly reach the AlloyDB private IP. But for secure, IAM-authenticated connections, the AlloyDB Auth Proxy is the recommended approach. It handles SSL encryption, IAM authentication, and connection management. In GKE, you deploy it as a sidecar container alongside your application pod.

In this post, I will walk through the full setup: configuring Workload Identity, deploying the Auth Proxy sidecar, and wiring up your application to use it.

## Why Use the Auth Proxy

You might wonder why you need a proxy when your pods can already connect to AlloyDB over the private network. Here are the reasons:

1. **IAM-based authentication** - Instead of managing database passwords, you use GCP IAM to control who can connect. The proxy handles the authentication handshake.

2. **Automatic SSL/TLS** - The proxy establishes encrypted connections without you needing to manage certificates.

3. **Connection draining** - The proxy handles connection cleanup gracefully during pod termination.

4. **Centralized access control** - Access is governed by IAM policies, which means you can use the same access control mechanisms you use for other GCP resources.

## Prerequisites

- A GKE cluster with Workload Identity enabled
- An AlloyDB cluster with a primary instance
- kubectl configured to access the cluster
- The AlloyDB instance connection name

Get the AlloyDB instance URI:

```bash
# Get the full instance URI for the Auth Proxy
gcloud alloydb instances describe my-primary \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --format="value(name)"
```

The output looks like: `projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary`

## Step 1 - Enable Workload Identity

If your GKE cluster does not have Workload Identity enabled:

```bash
# Enable Workload Identity on the cluster
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --workload-pool=my-project.svc.id.goog
```

## Step 2 - Create a Service Account for the Auth Proxy

Create a GCP service account that the Auth Proxy will use for IAM authentication:

```bash
# Create a service account for the Auth Proxy
gcloud iam service-accounts create alloydb-proxy-sa \
  --display-name="AlloyDB Auth Proxy Service Account"

# Grant the service account AlloyDB Client role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:alloydb-proxy-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/alloydb.client"

# Also grant the service account the ability to connect
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:alloydb-proxy-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

## Step 3 - Bind the GCP Service Account to a Kubernetes Service Account

Create a Kubernetes service account and bind it to the GCP service account:

```bash
# Create a Kubernetes service account
kubectl create serviceaccount alloydb-ksa

# Allow the Kubernetes SA to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  alloydb-proxy-sa@my-project.iam.gserviceaccount.com \
  --member="serviceAccount:my-project.svc.id.goog[default/alloydb-ksa]" \
  --role="roles/iam.workloadIdentityUser"

# Annotate the Kubernetes SA with the GCP SA email
kubectl annotate serviceaccount alloydb-ksa \
  iam.gke.io/gcp-service-account=alloydb-proxy-sa@my-project.iam.gserviceaccount.com
```

## Step 4 - Deploy the Application with the Auth Proxy Sidecar

Create a deployment that includes the Auth Proxy as a sidecar container. Save as `app-with-proxy.yaml`:

```yaml
# Deployment with AlloyDB Auth Proxy as a sidecar container
# The proxy handles authentication and TLS to AlloyDB
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Use the Kubernetes service account bound to the GCP SA
      serviceAccountName: alloydb-ksa
      containers:
        # Application container
        - name: app
          image: gcr.io/my-project/my-app:latest
          ports:
            - containerPort: 8080
          env:
            # Connect to AlloyDB through the proxy on localhost
            - name: DB_HOST
              value: "127.0.0.1"
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: "myapp"
            - name: DB_USER
              value: "appuser"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: alloydb-credentials
                  key: password
          resources:
            requests:
              cpu: 250m
              memory: 256Mi

        # AlloyDB Auth Proxy sidecar
        - name: alloydb-auth-proxy
          image: gcr.io/alloydb-connectors/alloydb-auth-proxy:latest
          args:
            # Instance URI - replace with your actual instance URI
            - "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary"
            # Listen on localhost port 5432
            - "--port=5432"
            - "--address=0.0.0.0"
            # Health check endpoint
            - "--health-check"
            - "--http-port=9090"
          ports:
            - containerPort: 5432
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
          securityContext:
            runAsNonRoot: true
```

Create the database password secret:

```bash
# Create a Kubernetes secret with the database password
kubectl create secret generic alloydb-credentials \
  --from-literal=password=YOUR_DB_PASSWORD
```

Deploy the application:

```bash
# Apply the deployment
kubectl apply -f app-with-proxy.yaml

# Check that pods are running with both containers
kubectl get pods -l app=my-app
```

Each pod should show 2/2 containers running (the app and the proxy sidecar).

## Step 5 - Verify the Connection

Check the Auth Proxy logs to confirm it connected successfully:

```bash
# Check Auth Proxy logs
kubectl logs deploy/my-app -c alloydb-auth-proxy --tail=20
```

You should see messages indicating a successful connection to AlloyDB.

Test from the application container:

```bash
# Exec into the app container and test the connection
kubectl exec deploy/my-app -c app -- \
  sh -c "apt-get update && apt-get install -y postgresql-client && psql -h 127.0.0.1 -U appuser -d myapp -c 'SELECT 1'"
```

## Connecting to Read Pool Instances

If you have read pool instances, you can run a second Auth Proxy sidecar on a different port:

```yaml
# Additional sidecar for read pool connection
- name: alloydb-auth-proxy-read
  image: gcr.io/alloydb-connectors/alloydb-auth-proxy:latest
  args:
    # Read pool instance URI
    - "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-read-pool"
    # Use a different port for the read connection
    - "--port=5433"
    - "--address=0.0.0.0"
    - "--health-check"
    - "--http-port=9091"
  ports:
    - containerPort: 5433
      protocol: TCP
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
```

Then in your application, connect to `127.0.0.1:5432` for writes and `127.0.0.1:5433` for reads.

## Using IAM Database Authentication

Instead of password-based authentication, you can use IAM authentication where the proxy handles the entire auth flow:

```bash
# Grant the service account IAM database login
gcloud alloydb users create alloydb-proxy-sa@my-project.iam \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --type=IAM_BASED
```

Then add the `--auto-iam-authn` flag to the Auth Proxy args:

```yaml
args:
  - "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary"
  - "--port=5432"
  - "--auto-iam-authn"
```

With this setup, no database password is needed. The proxy automatically generates short-lived authentication tokens using the Workload Identity credentials.

## Graceful Shutdown

When a pod terminates, you want the Auth Proxy to drain connections gracefully. The proxy supports this with the `--max-sigterm-delay` flag:

```yaml
args:
  - "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary"
  - "--port=5432"
  - "--max-sigterm-delay=30s"
```

This gives existing connections up to 30 seconds to complete before the proxy shuts down. Set this to match your application's graceful shutdown period.

## Troubleshooting

**Auth Proxy fails to start** - Check that Workload Identity is correctly configured. Verify the GCP service account has the `alloydb.client` role.

**Connection refused on localhost:5432** - The proxy might not be ready yet. Check the readiness probe and Auth Proxy logs.

**Permission denied** - Verify the GCP service account binding and IAM roles. Use `gcloud auth list` inside the proxy container to check the active identity.

**Timeout connecting** - Check that Private Services Access is configured and the GKE nodes can reach the AlloyDB IP range.

The AlloyDB Auth Proxy adds a layer of security and simplicity to database connections from GKE. Once set up, your application just connects to localhost and the proxy handles everything else - authentication, encryption, and connection management.
