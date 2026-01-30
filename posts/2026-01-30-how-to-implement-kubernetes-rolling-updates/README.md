# How to Implement Kubernetes Rolling Updates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Rolling Updates, DevOps

Description: Learn how to configure and manage Kubernetes rolling updates for zero-downtime deployments with rollback capabilities.

---

Kubernetes rolling updates enable you to update your applications with zero downtime by incrementally replacing old Pods with new ones. This strategy ensures continuous availability while deploying new versions, making it essential for production environments where service interruptions are unacceptable.

## Understanding the RollingUpdate Strategy

The RollingUpdate strategy is the default deployment strategy in Kubernetes. It gradually replaces instances of the old version with the new version, ensuring that some instances are always available to serve traffic.

Here is a basic deployment configuration with rolling update settings:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: my-application
  template:
    metadata:
      labels:
        app: my-application
    spec:
      containers:
      - name: app
        image: my-app:v2
        ports:
        - containerPort: 8080
```

## Configuring maxSurge and maxUnavailable

The two critical parameters that control rolling update behavior are `maxSurge` and `maxUnavailable`. Understanding these parameters is key to achieving the right balance between update speed and resource utilization.

**maxSurge** specifies the maximum number of Pods that can be created above the desired replica count during the update. This can be an absolute number or a percentage.

**maxUnavailable** defines the maximum number of Pods that can be unavailable during the update process.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%        # Can create up to 25% more pods
    maxUnavailable: 25%  # Up to 25% of pods can be unavailable
```

For a deployment with 4 replicas using these settings, Kubernetes will ensure at least 3 Pods are always available while allowing up to 5 Pods total during the transition.

## Implementing Readiness Gates

Readiness gates provide additional control over when a Pod is considered ready. This is particularly useful when you need external systems to verify the Pod status before it receives traffic.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
spec:
  replicas: 3
  template:
    spec:
      readinessGates:
      - conditionType: "custom.io/gate"
      containers:
      - name: app
        image: my-app:v2
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 3
```

The readiness probe ensures that new Pods only receive traffic after they pass health checks, preventing requests from being routed to instances that are not yet ready.

## Monitoring Rollout Status

Kubernetes provides built-in commands to monitor the progress of your deployments. Use the following commands to track rollout status:

```bash
# Watch the rollout status in real-time
kubectl rollout status deployment/my-application

# View rollout history
kubectl rollout history deployment/my-application

# Get detailed information about a specific revision
kubectl rollout history deployment/my-application --revision=2
```

The rollout status command will block and report progress until the deployment completes or fails, making it ideal for CI/CD pipelines.

## Rollback with kubectl rollout undo

When issues arise after a deployment, Kubernetes makes it straightforward to roll back to a previous version. The rollout history is preserved, allowing quick recovery.

```bash
# Rollback to the previous version
kubectl rollout undo deployment/my-application

# Rollback to a specific revision
kubectl rollout undo deployment/my-application --to-revision=2

# Check the status after rollback
kubectl rollout status deployment/my-application
```

To preserve rollout history with meaningful annotations, record changes when applying updates:

```bash
kubectl apply -f deployment.yaml
kubectl annotate deployment/my-application kubernetes.io/change-cause="Updated to v2 with new feature X"
```

## Pause and Resume Updates

For complex deployments requiring manual verification at intermediate stages, you can pause and resume rolling updates. This canary-style approach allows testing with partial traffic before completing the rollout.

```bash
# Pause the ongoing rollout
kubectl rollout pause deployment/my-application

# Verify the new version with partial traffic
# Make any necessary adjustments

# Resume the rollout to completion
kubectl rollout resume deployment/my-application
```

This technique is valuable when you want to observe metrics or logs from the new version before fully committing to the update.

## Best Practices for Production

When implementing rolling updates in production environments, consider these recommendations:

1. Always configure appropriate readiness probes to prevent traffic routing to unready Pods
2. Set `maxUnavailable` to 0 for critical services requiring strict availability
3. Use `minReadySeconds` to add a buffer time before marking Pods as available
4. Maintain sufficient rollout history with `revisionHistoryLimit` for rollback capabilities
5. Implement proper monitoring and alerting to detect issues early

```yaml
spec:
  minReadySeconds: 30
  revisionHistoryLimit: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

Kubernetes rolling updates provide a robust mechanism for deploying applications without service interruption. By properly configuring update parameters, implementing health checks, and understanding rollback procedures, you can achieve reliable zero-downtime deployments in your production environment.
