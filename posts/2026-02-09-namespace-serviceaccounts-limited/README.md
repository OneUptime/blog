# How to Configure Namespace-Scoped Service Accounts with Limited Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, RBAC

Description: Learn how to configure namespace-scoped service accounts with least-privilege permissions in Kubernetes for improved security and workload isolation.

---

Service accounts in Kubernetes provide identities for pods and other workloads running in your cluster. By default, every namespace has a default service account, but using it for all workloads violates the principle of least privilege. Each application should have its own service account with only the permissions it needs to function, scoped to its namespace.

Properly configured namespace-scoped service accounts limit the blast radius of security incidents. If a pod is compromised, the attacker only gains access to resources that service account can reach, preventing lateral movement across the cluster.

## Understanding Service Account Security

Service accounts authenticate pods to the Kubernetes API server. When a pod makes API requests, it uses the service account token mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token`. Without proper RBAC configuration, this token might grant excessive permissions.

Namespace-scoped service accounts combined with roles instead of cluster roles ensure permissions are limited to a single namespace. This is critical in multi-tenant environments where different teams share a cluster.

## Creating Service Accounts with Limited Permissions

Start by creating dedicated service accounts for different workload types:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
---
# Service account for web frontend
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-frontend
  namespace: myapp
automountServiceAccountToken: false
---
# Service account for backend API
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-api
  namespace: myapp
automountServiceAccountToken: true
---
# Service account for database migrations
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db-migration
  namespace: myapp
automountServiceAccountToken: true
---
# Service account for cron jobs
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cron-jobs
  namespace: myapp
automountServiceAccountToken: true
```

Notice that `automountServiceAccountToken` is set to `false` for the frontend since it doesn't need API access.

## Defining Granular Roles

Create roles with specific permissions for each service account:

```yaml
# Role for backend API - can read ConfigMaps and Secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-api-role
  namespace: myapp
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["database-credentials", "api-keys"]
  verbs: ["get"]
---
# Role for database migrations - can read/write ConfigMaps for tracking
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: db-migration-role
  namespace: myapp
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["database-credentials"]
  verbs: ["get"]
---
# Role for cron jobs - can create and manage Jobs
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cron-jobs-role
  namespace: myapp
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "create", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
```

## Binding Roles to Service Accounts

Create RoleBindings to grant permissions:

```yaml
# Bind backend API role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-api-binding
  namespace: myapp
subjects:
- kind: ServiceAccount
  name: backend-api
  namespace: myapp
roleRef:
  kind: Role
  name: backend-api-role
  apiGroup: rbac.authorization.k8s.io
---
# Bind database migration role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: db-migration-binding
  namespace: myapp
subjects:
- kind: ServiceAccount
  name: db-migration
  namespace: myapp
roleRef:
  kind: Role
  name: db-migration-role
  apiGroup: rbac.authorization.k8s.io
---
# Bind cron jobs role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cron-jobs-binding
  namespace: myapp
subjects:
- kind: ServiceAccount
  name: cron-jobs
  namespace: myapp
roleRef:
  kind: Role
  name: cron-jobs-role
  apiGroup: rbac.authorization.k8s.io
```

## Using Service Accounts in Workloads

Deploy applications with appropriate service accounts:

```yaml
# Frontend deployment - no service account token
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      serviceAccountName: web-frontend
      automountServiceAccountToken: false
      containers:
      - name: frontend
        image: myapp/frontend:latest
        ports:
        - containerPort: 80
---
# Backend deployment - limited API access
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      serviceAccountName: backend-api
      containers:
      - name: api
        image: myapp/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: CONFIG_PATH
          value: /etc/config
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: app-config
---
# Database migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v1
  namespace: myapp
spec:
  template:
    metadata:
      labels:
        app: db-migration
    spec:
      serviceAccountName: db-migration
      restartPolicy: OnFailure
      containers:
      - name: migrate
        image: myapp/migrations:latest
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
---
# Cron job with limited permissions
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-jobs
  namespace: myapp
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cron-jobs
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: myapp/cleanup:latest
```

## Implementing Service Account Token Projection

Use projected service account tokens for better security:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-backend
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secure-backend
  template:
    metadata:
      labels:
        app: secure-backend
    spec:
      serviceAccountName: backend-api
      containers:
      - name: api
        image: myapp/backend:latest
        volumeMounts:
        - name: sa-token
          mountPath: /var/run/secrets/tokens
          readOnly: true
      volumes:
      - name: sa-token
        projected:
          sources:
          - serviceAccountToken:
              path: token
              expirationSeconds: 3600
              audience: api
```

This creates short-lived tokens that expire after one hour, reducing the window for token abuse.

## Auditing Service Account Permissions

Create a script to audit service account permissions:

```bash
#!/bin/bash

NAMESPACE=$1

if [ -z "$NAMESPACE" ]; then
    echo "Usage: $0 <namespace>"
    exit 1
fi

echo "Service Account Permissions Audit for Namespace: $NAMESPACE"
echo "============================================================"
echo

# List all service accounts
SERVICE_ACCOUNTS=$(kubectl get sa -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')

for SA in $SERVICE_ACCOUNTS; do
    echo "Service Account: $SA"
    echo "-------------------"

    # Find RoleBindings
    ROLEBINDINGS=$(kubectl get rolebinding -n "$NAMESPACE" -o json | \
        jq -r ".items[] | select(.subjects[]? | select(.kind==\"ServiceAccount\" and .name==\"$SA\")) | .metadata.name")

    if [ -z "$ROLEBINDINGS" ]; then
        echo "  No RoleBindings found"
    else
        for RB in $ROLEBINDINGS; do
            echo "  RoleBinding: $RB"
            ROLE=$(kubectl get rolebinding "$RB" -n "$NAMESPACE" -o jsonpath='{.roleRef.name}')
            echo "  Role: $ROLE"

            # Show permissions
            kubectl get role "$ROLE" -n "$NAMESPACE" -o jsonpath='{range .rules[*]}{.apiGroups[*]}{" "}{.resources[*]}{" "}{.verbs[*]}{"\n"}{end}' | \
                awk '{print "    API Groups: " $1 ", Resources: " $2 ", Verbs: " $3}'
        done
    fi

    # Check ClusterRoleBindings
    CLUSTERROLEBINDINGS=$(kubectl get clusterrolebinding -o json | \
        jq -r ".items[] | select(.subjects[]? | select(.kind==\"ServiceAccount\" and .name==\"$SA\" and .namespace==\"$NAMESPACE\")) | .metadata.name")

    if [ -n "$CLUSTERROLEBINDINGS" ]; then
        echo "  WARNING: Has ClusterRoleBindings (cluster-wide access):"
        for CRB in $CLUSTERROLEBINDINGS; do
            echo "    - $CRB"
        done
    fi

    echo
done
```

## Implementing Service Account Rotation

Create a controller to rotate service account tokens periodically:

```go
package main

import (
    "context"
    "fmt"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type ServiceAccountRotator struct {
    clientset *kubernetes.Clientset
}

func NewServiceAccountRotator() (*ServiceAccountRotator, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &ServiceAccountRotator{
        clientset: clientset,
    }, nil
}

func (sar *ServiceAccountRotator) RotateTokens(ctx context.Context, namespace string) error {
    secrets, err := sar.clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
        FieldSelector: "type=kubernetes.io/service-account-token",
    })
    if err != nil {
        return err
    }

    for _, secret := range secrets.Items {
        creationTime := secret.CreationTimestamp.Time
        age := time.Since(creationTime)

        // Rotate tokens older than 90 days
        if age > 90*24*time.Hour {
            fmt.Printf("Rotating token for secret: %s\n", secret.Name)

            // Delete old secret
            err := sar.clientset.CoreV1().Secrets(namespace).Delete(
                ctx,
                secret.Name,
                metav1.DeleteOptions{},
            )
            if err != nil {
                fmt.Printf("Failed to delete secret %s: %v\n", secret.Name, err)
                continue
            }

            fmt.Printf("Rotated token for secret: %s\n", secret.Name)
        }
    }

    return nil
}

func main() {
    rotator, err := NewServiceAccountRotator()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := rotator.RotateTokens(ctx, "myapp"); err != nil {
        panic(err)
    }
}
```

## Validating Least Privilege

Test that service accounts have minimal permissions:

```bash
# Test backend API permissions
kubectl auth can-i get secrets --as=system:serviceaccount:myapp:backend-api -n myapp
# Should return "yes" only for specific secrets

kubectl auth can-i delete pods --as=system:serviceaccount:myapp:backend-api -n myapp
# Should return "no"

# Test frontend has no API access
kubectl auth can-i list pods --as=system:serviceaccount:myapp:web-frontend -n myapp
# Should return "no"
```

By implementing namespace-scoped service accounts with limited permissions, you significantly reduce the security risk surface in your Kubernetes clusters while maintaining the functionality your applications need.
