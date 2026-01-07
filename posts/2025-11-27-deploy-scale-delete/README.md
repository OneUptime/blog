# How to Create, Scale, and Delete Deployments + Services with `kubectl apply`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Learning Resource, Getting Started

Description: A practical notebook for the `kubectl apply` workflow-create a Deployment, expose it with a Service, scale replicas up/down, and clean up safely.

---

`kubectl apply` is the Kubernetes equivalent of "save." Declare what you want in YAML, apply it, and let the cluster reconcile reality. This guide keeps you in a single terminal session so the core loop sticks.

## 1. Create the Deployment YAML

A Deployment is the standard way to run stateless applications in Kubernetes. The manifest below defines a simple nginx web server with 2 replicas for basic redundancy. The `selector` and `labels` must match so the Deployment knows which Pods it owns.

`deploy.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-app           # Name used to reference this Deployment
spec:
  replicas: 2               # Run 2 identical Pods for redundancy
  selector:
    matchLabels:
      app: hello-app        # Must match the Pod template labels below
  template:
    metadata:
      labels:
        app: hello-app      # Labels applied to each Pod instance
    spec:
      containers:
        - name: web
          image: nginx:1.27 # Official nginx image from Docker Hub
          ports:
            - containerPort: 80  # Port the container listens on
```

Apply the manifest to create the Deployment, then verify both the Deployment resource and its Pods are running:

```bash
# Create or update the Deployment from the YAML file
kubectl apply -f deploy.yaml

# Check the Deployment status (READY column shows available replicas)
kubectl get deployments

# List only Pods belonging to this Deployment using label selector
kubectl get pods -l app=hello-app
```

## 2. Expose with a Service

Pods get ephemeral IP addresses that change on restarts. A Service provides a stable endpoint that routes traffic to all matching Pods. The `ClusterIP` type creates an internal-only address; use `LoadBalancer` or `NodePort` for external access.

`service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-web          # Stable DNS name: hello-web.<namespace>.svc.cluster.local
spec:
  type: ClusterIP          # Internal-only access (default type)
  selector:
    app: hello-app         # Route traffic to Pods with this label
  ports:
    - port: 80             # Port clients connect to
      targetPort: 80       # Port on the container to forward to
```

Apply the Service and test connectivity by port-forwarding to your local machine:

```bash
# Create the Service resource
kubectl apply -f service.yaml

# Verify the Service exists and note its ClusterIP
kubectl get svc hello-web

# Forward local port 8080 to the Service's port 80
kubectl port-forward svc/hello-web 8080:80

# In another terminal, test the connection
curl http://localhost:8080
```

Stop port-forward with `Ctrl+C`.

## 3. Scale with `kubectl scale` or `apply`

Scaling adjusts the number of Pod replicas running your application. Kubernetes automatically creates new Pods or terminates excess ones to match the desired count. The Service automatically load-balances across all healthy Pods.

```bash
# Scale up to 4 replicas imperatively
kubectl scale deployment hello-app --replicas=4

# Watch the new Pods spin up (will show 4 Pods total)
kubectl get pods -l app=hello-app
```

Or edit the YAML (`replicas: 4`) and re-run `kubectl apply -f deploy.yaml` for GitOps parity.

## 4. Update Images Safely

Rolling updates let you deploy new versions with zero downtime. Kubernetes gradually replaces old Pods with new ones, ensuring the Service always has healthy Pods to handle traffic.

```bash
# Update the container image to a new version
kubectl set image deployment/hello-app web=nginx:1.27.1

# Watch the rollout progress in real-time
kubectl rollout status deployment/hello-app
```

Watch pods replace gradually.

## 5. Delete When Finished

When cleaning up, delete both the Service and Deployment. Deleting by file ensures you remove exactly what you created; deleting by name works for quick cleanup.

Delete the Service and Deployment:

```bash
# Delete resources defined in both files at once
kubectl delete -f service.yaml -f deploy.yaml
```

or `kubectl delete deployment hello-app svc hello-web`.

## 6. Tips for Busy Teams

- Keep manifests in version control; never rely on `kubectl edit` for long-term changes.
- Use labels aggressively (`tier=frontend`, `env=dev`) so `kubectl get pods -l tier=frontend` stays useful.
- `kubectl apply --server-side -f file.yaml` catches field conflicts early when multiple tools manage the same object.

---

Mastering this simple loop-write YAML, `kubectl apply`, inspect, scale, delete-unlocks almost every higher-level Kubernetes workflow. Practice until it feels as second nature as `git add && git commit`.
