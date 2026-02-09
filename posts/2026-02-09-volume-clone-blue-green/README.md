# How to Use Volume Clone for Blue-Green Deployment Data Preparation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment Strategy, VolumeCloning, Blue-Green

Description: Learn how to leverage volume cloning to prepare data for blue-green deployments, enabling rapid environment switching with pre-populated data for testing and production releases.

---

Blue-green deployments require identical data in both environments to ensure consistent testing and smooth cutover. Volume cloning provides a fast way to duplicate production data for the green environment without impacting the blue environment.

## Understanding Blue-Green with Volume Cloning

Traditional blue-green deployments manage application versions but often share storage. True blue-green requires:

1. Separate data volumes for blue and green environments
2. Identical data in both environments before cutover
3. Ability to test green with production-like data
4. Fast cloning to minimize deployment windows
5. Easy rollback by switching back to blue

Volume cloning enables these requirements efficiently.

## Basic Blue-Green Setup with Cloned Volumes

Create a blue environment with production data:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: blue-database-pvc
  labels:
    environment: blue
    version: v1
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blue-deployment
  labels:
    environment: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      environment: blue
  template:
    metadata:
      labels:
        app: myapp
        environment: blue
        version: v1
    spec:
      containers:
      - name: app
        image: myapp:v1
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: blue-database-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
    environment: blue  # Points to blue initially
  ports:
  - port: 80
    targetPort: 8080
```

Prepare green environment by cloning blue data:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prepare-green-environment
spec:
  template:
    spec:
      serviceAccountName: deployment-manager
      restartPolicy: OnFailure
      containers:
      - name: clone-data
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Preparing Green Environment ==="

          # Get blue PVC details
          BLUE_SIZE=$(kubectl get pvc blue-database-pvc \
            -o jsonpath='{.spec.resources.requests.storage}')
          STORAGE_CLASS=$(kubectl get pvc blue-database-pvc \
            -o jsonpath='{.spec.storageClassName}')

          echo "Cloning blue PVC ($BLUE_SIZE)"

          # Create green PVC as clone of blue
          cat <<EOF | kubectl apply -f -
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: green-database-pvc
            labels:
              environment: green
              version: v2
              cloned-from: blue-database-pvc
              clone-timestamp: $(date +%Y%m%d-%H%M%S)
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: $BLUE_SIZE
            storageClassName: $STORAGE_CLASS
            dataSource:
              kind: PersistentVolumeClaim
              name: blue-database-pvc
          EOF

          # Wait for clone to be ready
          echo "Waiting for clone to complete..."
          kubectl wait --for=jsonpath='{.status.phase}'=Bound \
            pvc/green-database-pvc --timeout=600s

          echo "✓ Green PVC ready"

          # Deploy green environment
          cat <<EOF | kubectl apply -f -
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: green-deployment
            labels:
              environment: green
          spec:
            replicas: 3
            selector:
              matchLabels:
                app: myapp
                environment: green
            template:
              metadata:
                labels:
                  app: myapp
                  environment: green
                  version: v2
              spec:
                containers:
                - name: app
                  image: myapp:v2
                  ports:
                  - containerPort: 8080
                  volumeMounts:
                  - name: data
                    mountPath: /data
                volumes:
                - name: data
                  persistentVolumeClaim:
                    claimName: green-database-pvc
          EOF

          echo "Waiting for green deployment..."
          kubectl wait --for=condition=available \
            deployment/green-deployment --timeout=300s

          echo "✓ Green environment ready"
```

## Cutover Script

Switch traffic from blue to green:

```bash
#!/bin/bash
# cutover-to-green.sh

set -e

echo "=== Blue-Green Cutover ==="

# Verify green is healthy
echo "Checking green deployment health..."
READY_REPLICAS=$(kubectl get deployment green-deployment \
  -o jsonpath='{.status.readyReplicas}')
DESIRED_REPLICAS=$(kubectl get deployment green-deployment \
  -o jsonpath='{.spec.replicas}')

if [ "$READY_REPLICAS" != "$DESIRED_REPLICAS" ]; then
  echo "ERROR: Green deployment not fully ready"
  exit 1
fi

echo "✓ Green deployment healthy ($READY_REPLICAS/$DESIRED_REPLICAS ready)"

# Test green environment
echo "Testing green environment..."
POD=$(kubectl get pod -l app=myapp,environment=green \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec $POD -- curl -f http://localhost:8080/health || {
  echo "ERROR: Green health check failed"
  exit 1
}

echo "✓ Green health check passed"

# Update service to point to green
echo "Switching traffic to green..."
kubectl patch service myapp-service -p '{"spec":{"selector":{"environment":"green"}}}'

echo "✓ Traffic switched to green"

# Scale down blue (optional)
echo "Scaling down blue deployment..."
kubectl scale deployment blue-deployment --replicas=0

echo "✓ Blue-Green cutover complete"
```

## Rollback Script

Quickly rollback to blue if issues arise:

```bash
#!/bin/bash
# rollback-to-blue.sh

set -e

echo "=== Rolling back to Blue ==="

# Scale up blue if needed
BLUE_REPLICAS=$(kubectl get deployment blue-deployment \
  -o jsonpath='{.spec.replicas}')

if [ "$BLUE_REPLICAS" = "0" ]; then
  echo "Scaling up blue deployment..."
  kubectl scale deployment blue-deployment --replicas=3
  kubectl wait --for=condition=available \
    deployment/blue-deployment --timeout=120s
fi

# Switch traffic back to blue
echo "Switching traffic to blue..."
kubectl patch service myapp-service -p '{"spec":{"selector":{"environment":"blue"}}}'

echo "✓ Rolled back to blue"

# Optionally scale down green
echo "Scaling down green..."
kubectl scale deployment green-deployment --replicas=0

echo "✓ Rollback complete"
```

## Automated Blue-Green Pipeline

Create a complete automated pipeline:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: blue-green-deploy-v2
spec:
  template:
    spec:
      serviceAccountName: deployment-manager
      restartPolicy: OnFailure
      containers:
      - name: deploy
        image: bitnami/kubectl:latest
        env:
        - name: NEW_VERSION
          value: "v2"
        - name: NEW_IMAGE
          value: "myapp:v2"
        - name: SMOKE_TEST_ENDPOINT
          value: "http://localhost:8080/health"
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Blue-Green Deployment Pipeline ==="
          echo "New version: $NEW_VERSION"

          CURRENT_ENV=$(kubectl get service myapp-service \
            -o jsonpath='{.spec.selector.environment}')
          echo "Current active environment: $CURRENT_ENV"

          # Determine target environment
          if [ "$CURRENT_ENV" = "blue" ]; then
            TARGET_ENV="green"
            SOURCE_ENV="blue"
          else
            TARGET_ENV="blue"
            SOURCE_ENV="green"
          fi

          echo "Deploying to: $TARGET_ENV"

          # Step 1: Clone data from active to target
          echo "Step 1: Cloning data volume..."

          SOURCE_PVC="${SOURCE_ENV}-database-pvc"
          TARGET_PVC="${TARGET_ENV}-database-pvc"

          # Delete old target PVC if exists
          kubectl delete pvc $TARGET_PVC --ignore-not-found=true
          sleep 5

          # Clone from source
          STORAGE_SIZE=$(kubectl get pvc $SOURCE_PVC \
            -o jsonpath='{.spec.resources.requests.storage}')
          STORAGE_CLASS=$(kubectl get pvc $SOURCE_PVC \
            -o jsonpath='{.spec.storageClassName}')

          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: $TARGET_PVC
            labels:
              environment: $TARGET_ENV
              version: $NEW_VERSION
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: $STORAGE_SIZE
            storageClassName: $STORAGE_CLASS
            dataSource:
              kind: PersistentVolumeClaim
              name: $SOURCE_PVC
          EOF

          kubectl wait --for=jsonpath='{.status.phase}'=Bound \
            pvc/$TARGET_PVC --timeout=600s

          echo "✓ Data cloned"

          # Step 2: Deploy to target environment
          echo "Step 2: Deploying application..."

          kubectl apply -f - <<EOF
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: ${TARGET_ENV}-deployment
          spec:
            replicas: 3
            selector:
              matchLabels:
                app: myapp
                environment: $TARGET_ENV
            template:
              metadata:
                labels:
                  app: myapp
                  environment: $TARGET_ENV
                  version: $NEW_VERSION
              spec:
                containers:
                - name: app
                  image: $NEW_IMAGE
                  ports:
                  - containerPort: 8080
                  volumeMounts:
                  - name: data
                    mountPath: /data
                  readinessProbe:
                    httpGet:
                      path: /health
                      port: 8080
                    initialDelaySeconds: 10
                    periodSeconds: 5
                volumes:
                - name: data
                  persistentVolumeClaim:
                    claimName: $TARGET_PVC
          EOF

          kubectl wait --for=condition=available \
            deployment/${TARGET_ENV}-deployment --timeout=300s

          echo "✓ Deployment ready"

          # Step 3: Smoke tests
          echo "Step 3: Running smoke tests..."

          POD=$(kubectl get pod -l app=myapp,environment=$TARGET_ENV \
            -o jsonpath='{.items[0].metadata.name}')

          for i in {1..5}; do
            if kubectl exec $POD -- curl -f $SMOKE_TEST_ENDPOINT; then
              echo "✓ Smoke test $i passed"
            else
              echo "ERROR: Smoke test $i failed"
              exit 1
            fi
            sleep 2
          done

          echo "✓ All smoke tests passed"

          # Step 4: Cutover
          echo "Step 4: Switching traffic..."

          kubectl patch service myapp-service -p \
            "{\"spec\":{\"selector\":{\"environment\":\"$TARGET_ENV\"}}}"

          echo "✓ Traffic switched to $TARGET_ENV"

          # Step 5: Monitor
          echo "Step 5: Monitoring for 60 seconds..."
          sleep 60

          # Check for errors
          ERROR_COUNT=$(kubectl logs -l app=myapp,environment=$TARGET_ENV \
            --tail=100 | grep -i error | wc -l || echo 0)

          if [ "$ERROR_COUNT" -gt 10 ]; then
            echo "WARNING: High error count detected ($ERROR_COUNT errors)"
            echo "Consider rollback"
          else
            echo "✓ No significant errors detected"
          fi

          # Step 6: Scale down old environment
          echo "Step 6: Scaling down $SOURCE_ENV..."
          kubectl scale deployment ${SOURCE_ENV}-deployment --replicas=0

          echo "=== Deployment Complete ==="
          echo "Active environment: $TARGET_ENV"
          echo "Inactive environment: $SOURCE_ENV (scaled to 0)"
```

Create RBAC for the pipeline:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployment-manager
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager-role
rules:
- apiGroups: [""]
  resources: ["persistentvolumeclaims", "services", "pods", "pods/exec", "pods/log"]
  verbs: ["get", "list", "create", "delete", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "list", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-manager-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployment-manager-role
subjects:
- kind: ServiceAccount
  name: deployment-manager
```

## Best Practices

1. **Clone data before each deployment** for consistency
2. **Run comprehensive smoke tests** before cutover
3. **Keep both environments** available for quick rollback
4. **Monitor metrics** after cutover for issues
5. **Automate the entire pipeline** to reduce human error
6. **Document rollback procedures** clearly
7. **Test rollback regularly** to ensure it works
8. **Use readiness probes** to validate health before cutover

Volume cloning enables true blue-green deployments with data isolation, providing confidence in testing and fast rollback capabilities. This approach minimizes risk and downtime during production releases.
