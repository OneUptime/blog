# How to Implement Recreate Deployment Strategy for Breaking Schema Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Database

Description: Learn when and how to use the Recreate deployment strategy in Kubernetes for handling breaking database schema changes and incompatible version updates that can't run simultaneously.

---

You need to deploy a new version that changes your database schema in a way that's incompatible with the old version. Running both versions simultaneously would cause data corruption or application errors. Rolling updates won't work here.

The Recreate deployment strategy solves this by shutting down all old pods before starting new ones.

## Understanding Recreate Strategy

Kubernetes offers two deployment strategies:

**RollingUpdate** (default): Gradually replaces old pods with new ones. Both versions run simultaneously during the transition.

**Recreate**: Terminates all old pods, then creates all new pods. Causes brief downtime but ensures only one version runs at a time.

Use Recreate when:
- New version is incompatible with old version
- Database schema changes break backward compatibility
- Shared resources can't handle multiple versions
- You need guaranteed consistency during deployment

## Basic Configuration

Configure Recreate strategy in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  strategy:
    type: Recreate  # All pods killed before creating new ones
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_SCHEMA_VERSION
          value: "v2"
```

When you update this deployment, Kubernetes:
1. Scales the old ReplicaSet to 0 (terminates all pods)
2. Waits for all old pods to fully terminate
3. Scales the new ReplicaSet to desired replica count
4. Starts all new pods

## When to Use Recreate

**Breaking database schema changes**:
```sql
-- Migration that's not backward compatible
ALTER TABLE users DROP COLUMN legacy_id;
ALTER TABLE users ADD COLUMN user_type ENUM('regular', 'premium') NOT NULL;
```

The old version expects `legacy_id` to exist and doesn't know about `user_type`. Running both versions causes errors.

**Incompatible API changes**:
```javascript
// Old version expects field 'name'
const user = { name: req.body.name };

// New version uses 'firstName' and 'lastName'
const user = {
  firstName: req.body.firstName,
  lastName: req.body.lastName
};
```

**Stateful applications with shared resources**:
- File-based databases (SQLite)
- Lock files
- Local caches that must be cleared

**Configuration format changes**:
- New version uses different config file format
- Environment variable names changed
- Flag meanings changed

## Deployment with Migration

Combine Recreate strategy with database migration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Init container runs migration
      initContainers:
      - name: migrate
        image: myregistry.io/api-server:v2.0.0
        command: ['npm', 'run', 'migrate']
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url

      # Main container starts after migration
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
```

Deployment sequence:
1. Old pods terminate
2. First new pod starts
3. Init container runs migration
4. Migration completes
5. Main container starts
6. Remaining pods start (all run the same migration, idempotently)

## Minimizing Downtime

Recreate causes downtime, but you can minimize it:

**Fast startup**: Optimize application startup time.

```dockerfile
# Use smaller images
FROM node:18-alpine

# Pre-compile or pre-bundle
RUN npm run build

# Health check to mark ready quickly
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD node healthcheck.js
```

**Readiness probes**: Mark pods ready as soon as possible.

```yaml
spec:
  containers:
  - name: api
    image: myregistry.io/api-server:v2.0.0
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 5  # Start checking early
      periodSeconds: 2         # Check frequently
      failureThreshold: 2      # Mark ready quickly
```

**Graceful shutdown**: Terminate old pods quickly but cleanly.

```yaml
spec:
  containers:
  - name: api
    image: myregistry.io/api-server:v2.0.0
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]  # Allow in-flight requests to complete
  terminationGracePeriodSeconds: 30  # Total time allowed for shutdown
```

## Tracking Downtime

Monitor deployment downtime:

```bash
#!/bin/bash
# measure-recreate-downtime.sh

DEPLOYMENT=$1
NAMESPACE=${2:-default}

echo "Starting deployment update..."
START_TIME=$(date +%s)

# Update deployment
kubectl set image deployment/$DEPLOYMENT \
  api=myregistry.io/api-server:v2.0.0 \
  -n $NAMESPACE

# Wait for old pods to terminate
echo "Waiting for old pods to terminate..."
while [ $(kubectl get pods -l app=$DEPLOYMENT -n $NAMESPACE --field-selector=status.phase=Running | wc -l) -gt 1 ]; do
  sleep 1
done

TERMINATION_TIME=$(date +%s)
TERMINATION_DURATION=$((TERMINATION_TIME - START_TIME))

echo "Old pods terminated after ${TERMINATION_DURATION}s"

# Wait for new pods to be ready
echo "Waiting for new pods to be ready..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo "Deployment complete!"
echo "Total downtime: ${TOTAL_DURATION}s"
echo "Termination: ${TERMINATION_DURATION}s"
echo "Startup: $((TOTAL_DURATION - TERMINATION_DURATION))s"
```

## Maintenance Window Deployment

Schedule Recreate deployments during maintenance windows:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-deployment
spec:
  # Run at 2 AM every Sunday
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: deployer
          containers:
          - name: deploy
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              echo "Starting maintenance deployment"

              # Update deployment
              kubectl set image deployment/api-server \
                api=myregistry.io/api-server:$(date +%Y%m%d)

              # Wait for completion
              kubectl rollout status deployment/api-server

              # Verify health
              sleep 30
              HEALTHY=$(kubectl get deployment api-server -o jsonpath='{.status.availableReplicas}')

              if [ "$HEALTHY" -eq "5" ]; then
                echo "Deployment successful"
              else
                echo "Deployment unhealthy, rolling back"
                kubectl rollout undo deployment/api-server
              fi
          restartPolicy: OnFailure
```

## Blue-Green Alternative

For zero-downtime deployments with incompatible versions, use blue-green instead:

```yaml
# Blue deployment (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-blue
  labels:
    version: blue
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: blue
  template:
    metadata:
      labels:
        app: api
        version: blue
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.0.0
---
# Green deployment (new)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-green
  labels:
    version: green
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: green
  template:
    metadata:
      labels:
        app: api
        version: green
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
---
# Service that switches between blue and green
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
    version: blue  # Change to 'green' to switch
  ports:
  - port: 80
    targetPort: 8080
```

Deployment process:
1. Run migration on a separate database instance
2. Deploy green version
3. Test green version thoroughly
4. Switch service selector from blue to green
5. Monitor for issues
6. Delete blue deployment if all is well

## Migration Rollback Strategy

Prepare for migration rollback:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-scripts
data:
  migrate-up.sql: |
    -- Forward migration
    ALTER TABLE users ADD COLUMN user_type VARCHAR(20);
    UPDATE users SET user_type = 'regular';

  migrate-down.sql: |
    -- Rollback migration
    ALTER TABLE users DROP COLUMN user_type;
---
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-up
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: postgres:14
        command:
        - psql
        - $(DATABASE_URL)
        - -f
        - /scripts/migrate-up.sql
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: migration-scripts
      restartPolicy: Never
```

If deployment fails:

```bash
# Rollback deployment
kubectl rollout undo deployment/api-server

# Rollback migration
kubectl create job migrate-down-$(date +%s) \
  --from=cronjob/migrate-down
```

## Monitoring Recreate Deployments

Alert on extended downtime:

```yaml
groups:
- name: recreate_deployments
  rules:
  - alert: RecreateDeploymentDowntime
    expr: |
      (
        kube_deployment_spec_replicas{deployment="api-server"}
        -
        kube_deployment_status_replicas_available{deployment="api-server"}
      ) == kube_deployment_spec_replicas{deployment="api-server"}
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "All pods down during Recreate deployment"
      description: "Deployment api-server has zero available pods for 2 minutes during Recreate update"
```

## Best Practices

**Communicate downtime**. Alert users before Recreate deployments that will cause service interruption.

**Test migrations extensively**. Use a copy of production data to test migrations before deploying.

**Keep migrations fast**. Long migrations mean long downtime. Use online migration tools when possible.

**Have a rollback plan**. Write down (reverse) migrations before deploying.

**Monitor closely**. Watch the deployment carefully since downtime is guaranteed.

**Consider alternatives first**. Use Recreate only when truly necessary. RollingUpdate with careful schema design is usually better.

**Document incompatibilities**. Clearly note why Recreate is needed:

```yaml
metadata:
  annotations:
    deployment.kubernetes.io/strategy-reason: |
      Using Recreate strategy because v2.0.0 drops the 'legacy_id' column
      that v1.x depends on. Cannot run both versions simultaneously.
```

**Schedule during low-traffic periods**. Minimize user impact by deploying when usage is low.

## Conclusion

The Recreate deployment strategy is a blunt but necessary tool for handling incompatible version updates. It guarantees that only one version runs at a time by accepting brief downtime.

Use it sparingly and only when truly needed. For most applications, investing in backward-compatible schema changes and rolling updates provides better availability. But when you have genuinely incompatible versions, Recreate ensures clean cutover without data corruption or application errors.

Plan carefully, minimize downtime through fast startups and migrations, and always have a rollback strategy ready. The predictable downtime of Recreate is better than the unpredictable corruption of running incompatible versions simultaneously.
