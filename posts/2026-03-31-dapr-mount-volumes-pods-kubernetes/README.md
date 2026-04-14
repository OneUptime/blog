# How to Mount Volumes in Dapr Pods on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Volume, Secret, ConfigMap

Description: Mount Kubernetes Secrets, ConfigMaps, and PersistentVolumes into Dapr-enabled pods for configuration files, TLS certificates, and shared storage.

---

## Why Mount Volumes in Dapr Pods

Dapr-enabled pods are regular Kubernetes pods. You may need to mount volumes for TLS certificates used by Dapr components, configuration files, or shared storage between the app container and the daprd sidecar.

## Mounting a Secret as a Volume

Mount database credentials as a volume file for Dapr component configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8080"
    spec:
      volumes:
      - name: db-creds
        secret:
          secretName: postgres-credentials
      - name: tls-certs
        secret:
          secretName: app-tls
          items:
          - key: tls.crt
            path: server.crt
          - key: tls.key
            path: server.key
      containers:
      - name: myapp
        image: myregistry/myapp:latest
        volumeMounts:
        - name: db-creds
          mountPath: /etc/secrets/db
          readOnly: true
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
```

## Mounting a ConfigMap for Dapr Component Config

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  config.yaml: |
    server:
      port: 8080
    dapr:
      stateStore: statestore
      pubSub: pubsub
```

```yaml
# In the Deployment spec
volumes:
- name: app-config
  configMap:
    name: app-config

containers:
- name: myapp
  volumeMounts:
  - name: app-config
    mountPath: /etc/config
```

## Sharing a Volume Between App and Dapr Sidecar

You can share a volume between the application container and the daprd sidecar using the `dapr.io/volume-mounts` annotation. This mounts the volume as **read-only** in the sidecar. Use `dapr.io/volume-mounts-rw` instead if the sidecar needs write access:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/volume-mounts: "shared-data:/tmp/dapr-shared"
  # Or for read-write access:
  # dapr.io/volume-mounts-rw: "shared-data:/tmp/dapr-shared"
```

```yaml
volumes:
- name: shared-data
  emptyDir: {}

containers:
- name: myapp
  volumeMounts:
  - name: shared-data
    mountPath: /tmp/app-shared
```

## Using PersistentVolumes for Stateful Apps

```yaml
volumes:
- name: data-volume
  persistentVolumeClaim:
    claimName: myapp-pvc

containers:
- name: myapp
  volumeMounts:
  - name: data-volume
    mountPath: /var/data
```

## Verifying Volume Mounts

```bash
# Verify volume is mounted in the app container
kubectl exec -it deploy/myapp -c myapp -- ls /etc/secrets/db

# Verify Dapr sidecar volume mounts
kubectl exec -it deploy/myapp -c daprd -- ls /tmp/dapr-shared
```

## Summary

Dapr-enabled Kubernetes pods support all standard volume types including Secrets, ConfigMaps, and PersistentVolumeClaims. Use the `dapr.io/volume-mounts` annotation to inject volume mounts into the daprd sidecar container, enabling shared file access between your application and the Dapr runtime.
