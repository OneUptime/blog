# How to Create, Scale, and Delete Deployments + Services with `kubectl apply`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Learning Resource, Getting Started

Description: A practical notebook for the `kubectl apply` workflow-create a Deployment, expose it with a Service, scale replicas up/down, and clean up safely.

---

`kubectl apply` is the Kubernetes equivalent of "save." Declare what you want in YAML, apply it, and let the cluster reconcile reality. This guide keeps you in a single terminal session so the core loop sticks.

## 1. Create the Deployment YAML

`deploy.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-app
  template:
    metadata:
      labels:
        app: hello-app
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
```

Apply it:

```bash
kubectl apply -f deploy.yaml
kubectl get deployments
kubectl get pods -l app=hello-app
```

## 2. Expose with a Service

`service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-web
spec:
  type: ClusterIP
  selector:
    app: hello-app
  ports:
    - port: 80
      targetPort: 80
```

Apply + test:

```bash
kubectl apply -f service.yaml
kubectl get svc hello-web
kubectl port-forward svc/hello-web 8080:80
curl http://localhost:8080
```

Stop port-forward with `Ctrl+C`.

## 3. Scale with `kubectl scale` or `apply`

```bash
kubectl scale deployment hello-app --replicas=4
kubectl get pods -l app=hello-app
```

Or edit the YAML (`replicas: 4`) and re-run `kubectl apply -f deploy.yaml` for GitOps parity.

## 4. Update Images Safely

```bash
kubectl set image deployment/hello-app web=nginx:1.27.1
kubectl rollout status deployment/hello-app
```

Watch pods replace gradually.

## 5. Delete When Finished

Delete the Service and Deployment:

```bash
kubectl delete -f service.yaml -f deploy.yaml
```

or `kubectl delete deployment hello-app svc hello-web`.

## 6. Tips for Busy Teams

- Keep manifests in version control; never rely on `kubectl edit` for long-term changes.
- Use labels aggressively (`tier=frontend`, `env=dev`) so `kubectl get pods -l tier=frontend` stays useful.
- `kubectl apply --server-side -f file.yaml` catches field conflicts early when multiple tools manage the same object.

---

Mastering this simple loop-write YAML, `kubectl apply`, inspect, scale, delete-unlocks almost every higher-level Kubernetes workflow. Practice until it feels as second nature as `git add && git commit`.
