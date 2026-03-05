# How to Project Volumes from Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secret, Projected Volumes, Security

Description: Learn how to use projected volumes to combine Secrets, ConfigMaps, and other sources into a single volume mount on Talos Linux.

---

Projected volumes in Kubernetes allow you to combine data from multiple sources - Secrets, ConfigMaps, Downward API fields, and service account tokens - into a single directory inside your pod. This is particularly useful on Talos Linux where you often need to assemble configuration from several Kubernetes resources without having access to the host filesystem.

This guide explains how to project volumes from Secrets and combine them with other data sources on a Talos Linux cluster.

## What Are Projected Volumes?

A projected volume maps several existing volume sources into the same directory. Instead of mounting each Secret and ConfigMap to separate paths, you can consolidate them into one mount point. The supported sources are:

- `secret` - Data from Kubernetes Secrets
- `configMap` - Data from Kubernetes ConfigMaps
- `downwardAPI` - Pod and container metadata
- `serviceAccountToken` - Automatically rotated service account tokens

## Basic Secret Projection

Let us start with projecting a single Secret into a volume. First, create a Secret:

```yaml
# db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: dbadmin
  password: "Pr0duction-S3cret!"
  host: postgres.db.svc.cluster.local
```

```bash
kubectl apply -f db-secret.yaml
```

Now create a pod that uses a projected volume with this Secret:

```yaml
# pod-projected-secret.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: projected-config
      mountPath: /etc/myapp
      readOnly: true
  volumes:
  - name: projected-config
    projected:
      sources:
      - secret:
          name: db-credentials
          items:
          - key: username
            path: db-username
          - key: password
            path: db-password
          - key: host
            path: db-host
```

```bash
kubectl apply -f pod-projected-secret.yaml

# Verify the projected files
kubectl exec myapp -- ls -la /etc/myapp/
kubectl exec myapp -- cat /etc/myapp/db-username
```

Inside the container, you will find three files at `/etc/myapp/`: `db-username`, `db-password`, and `db-host`, each containing the corresponding Secret value.

## Combining Multiple Secrets

Projected volumes really shine when you need to combine data from multiple Secrets:

```yaml
# multiple-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: dbadmin
  password: "DbP@ss123"
---
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials
type: Opaque
stringData:
  api-key: "ak-12345-abcde"
  api-secret: "as-67890-fghij"
---
apiVersion: v1
kind: Secret
metadata:
  name: smtp-credentials
type: Opaque
stringData:
  smtp-user: "notifications@example.com"
  smtp-pass: "SmtpS3cret!"
```

```yaml
# pod-multi-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-multi
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: all-credentials
      mountPath: /etc/credentials
      readOnly: true
  volumes:
  - name: all-credentials
    projected:
      sources:
      - secret:
          name: db-credentials
          items:
          - key: username
            path: database/username
          - key: password
            path: database/password
      - secret:
          name: api-credentials
          items:
          - key: api-key
            path: api/key
          - key: api-secret
            path: api/secret
      - secret:
          name: smtp-credentials
          items:
          - key: smtp-user
            path: smtp/username
          - key: smtp-pass
            path: smtp/password
```

This creates a directory structure like:

```text
/etc/credentials/
  database/
    username
    password
  api/
    key
    secret
  smtp/
    username
    password
```

## Mixing Secrets and ConfigMaps

A common pattern is combining Secrets with ConfigMaps in one projected volume:

```yaml
# mixed-projection.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.yaml: |
    server:
      port: 8080
      workers: 4
    features:
      enable_cache: true
      enable_notifications: true
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  secrets.yaml: |
    database:
      password: "S3cretP@ss"
    api:
      key: "ak-production-12345"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        volumeMounts:
        - name: app-combined-config
          mountPath: /etc/myapp
          readOnly: true
      volumes:
      - name: app-combined-config
        projected:
          sources:
          - configMap:
              name: app-config
              items:
              - key: app.yaml
                path: app.yaml
          - secret:
              name: app-secrets
              items:
              - key: secrets.yaml
                path: secrets.yaml
```

Your application can then read both `/etc/myapp/app.yaml` and `/etc/myapp/secrets.yaml` from the same directory.

## Adding Downward API Data

You can include pod metadata alongside your Secrets using the Downward API:

```yaml
# projected-with-downward.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-downward
  labels:
    app: myapp
    version: v2
  annotations:
    build: "2024-01-15"
spec:
  containers:
  - name: myapp
    image: myapp:latest
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    volumeMounts:
    - name: pod-info
      mountPath: /etc/podinfo
      readOnly: true
  volumes:
  - name: pod-info
    projected:
      sources:
      - secret:
          name: app-secrets
          items:
          - key: secrets.yaml
            path: secrets.yaml
      - downwardAPI:
          items:
          - path: pod-name
            fieldRef:
              fieldPath: metadata.name
          - path: pod-namespace
            fieldRef:
              fieldPath: metadata.namespace
          - path: pod-labels
            fieldRef:
              fieldPath: metadata.labels
          - path: cpu-limit
            resourceFieldRef:
              containerName: myapp
              resource: limits.cpu
```

## Projected Service Account Tokens

Kubernetes can project short-lived, automatically rotated service account tokens into your pods. This is more secure than the default token mounting:

```yaml
# projected-sa-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-sa-token
spec:
  serviceAccountName: myapp-sa
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: credentials
      mountPath: /var/run/secrets/app
      readOnly: true
  volumes:
  - name: credentials
    projected:
      sources:
      - secret:
          name: app-secrets
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: "https://myapi.example.com"
      - configMap:
          name: ca-bundle
          items:
          - key: ca.crt
            path: ca.crt
```

The `expirationSeconds` field controls how often the token is rotated. The kubelet handles the rotation automatically and updates the file in the volume.

## Setting File Permissions

Control the default file permissions for all projected files:

```yaml
volumes:
- name: projected-config
  projected:
    defaultMode: 0400  # Owner read only
    sources:
    - secret:
        name: tls-certs
        items:
        - key: tls.key
          path: tls.key
          mode: 0400  # Override for this specific file
        - key: tls.crt
          path: tls.crt
          mode: 0444  # Certificate can be more permissive
    - configMap:
        name: app-config
        items:
        - key: config.yaml
          path: config.yaml
          mode: 0644
```

## Handling Conflicts

If two sources project files with the same path, the last source in the list wins. Be careful with naming:

```yaml
# This will cause the second secret's 'config' to overwrite the first
volumes:
- name: projected
  projected:
    sources:
    - secret:
        name: secret-a
        items:
        - key: data
          path: config  # This file...
    - secret:
        name: secret-b
        items:
        - key: data
          path: config  # ...gets overwritten by this one
```

To avoid conflicts, use unique paths or organize files into subdirectories as shown in the multi-secret example earlier.

## Practical Example: TLS Application on Talos

Here is a complete example of deploying a TLS-enabled application that needs certificates, configuration, and credentials all in one place:

```yaml
# tls-app-complete.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-api
  template:
    metadata:
      labels:
        app: secure-api
    spec:
      containers:
      - name: api
        image: secure-api:latest
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: app-volume
          mountPath: /etc/secure-api
          readOnly: true
        env:
        - name: CONFIG_DIR
          value: /etc/secure-api
      volumes:
      - name: app-volume
        projected:
          defaultMode: 0400
          sources:
          - secret:
              name: api-tls
              items:
              - key: tls.crt
                path: certs/server.crt
              - key: tls.key
                path: certs/server.key
          - secret:
              name: db-credentials
              items:
              - key: password
                path: secrets/db-password
          - configMap:
              name: api-config
              items:
              - key: config.yaml
                path: config.yaml
          - downwardAPI:
              items:
              - path: pod-info/name
                fieldRef:
                  fieldPath: metadata.name
```

## Wrapping Up

Projected volumes on Talos Linux give you a clean way to assemble configuration from multiple Kubernetes resources into a single mount point. Instead of managing separate volume mounts for each Secret and ConfigMap, you can organize everything into a logical directory structure within one projected volume. This approach reduces complexity in your pod specs and makes it easier to reason about what configuration your application has access to. Combine it with proper RBAC and file permissions for a solid security posture on your Talos cluster.
