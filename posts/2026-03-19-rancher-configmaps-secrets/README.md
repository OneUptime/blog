# How to Mount ConfigMaps and Secrets in Rancher Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, ConfigMap, Secret, Workload

Description: Learn how to mount ConfigMaps and Secrets as volumes in Rancher workloads to provide configuration files and sensitive data to your containers.

While environment variables are good for simple key-value configuration, many applications read their settings from configuration files. Kubernetes allows you to mount ConfigMaps and Secrets as files inside containers using volumes. This approach is ideal for complex configurations, certificates, and files that applications expect at specific paths. This guide covers how to create and mount ConfigMaps and Secrets as volumes in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster
- Access to a project and namespace

## Part 1: Working with ConfigMaps

### Create a ConfigMap with File Content

In Rancher, navigate to **More Resources > Core > ConfigMaps** and click **Create**:

- **Name**: `nginx-config`
- **Namespace**: `default`
- Add a key representing the filename and its content:
  - **Key**: `nginx.conf`
  - **Value**: Paste your nginx configuration

Or via YAML:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: default
data:
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html;
        }

        location /api {
            proxy_pass http://backend-service:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
  mime.types: |
    types {
        text/html html;
        text/css css;
        application/javascript js;
    }
```

### Mount a ConfigMap as a Volume via the UI

1. Navigate to **Workloads > Deployments** and create or edit a workload
2. Scroll to the **Volumes** section
3. Click **Add Volume** and select **ConfigMap**
4. Select the ConfigMap name (`nginx-config`)
5. Set the **Mount Point** in the container (e.g., `/etc/nginx/conf.d`)
6. Optionally select specific keys to mount

### Mount a ConfigMap as a Volume via YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-nginx
  template:
    metadata:
      labels:
        app: my-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config-volume
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: nginx-config-volume
          configMap:
            name: nginx-config
```

Each key in the ConfigMap becomes a file in the mount directory. In this example:
- `/etc/nginx/conf.d/nginx.conf`
- `/etc/nginx/conf.d/mime.types`

### Mount Specific Keys

To mount only certain keys and optionally rename them:

```yaml
volumes:
  - name: nginx-config-volume
    configMap:
      name: nginx-config
      items:
        - key: nginx.conf
          path: default.conf
```

This mounts only the `nginx.conf` key as `/etc/nginx/conf.d/default.conf`.

### Mount a Single File Without Overwriting the Directory

Using `subPath` lets you mount a single file without replacing the entire directory contents:

```yaml
volumeMounts:
  - name: nginx-config-volume
    mountPath: /etc/nginx/conf.d/default.conf
    subPath: nginx.conf
```

This adds `default.conf` to the existing `/etc/nginx/conf.d/` directory without removing other files.

## Part 2: Working with Secrets

### Create a Secret with File Content

Secrets work similarly to ConfigMaps but are intended for sensitive data. Values in the `data` field are base64-encoded, so you should still use RBAC and encryption at rest to protect them.

In Rancher, navigate to **Storage > Secrets** and click **Create**:

- **Name**: `tls-certs`
- **Type**: Select **TLS Certificate** or **Opaque**
- Add your certificate and key data

For an Opaque secret via YAML:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: default
type: Opaque
stringData:
  db-config.yaml: |
    database:
      host: postgres.default.svc.cluster.local
      port: 5432
      name: production
      username: admin
      password: supersecretpassword
  api-key.txt: "sk-abc123def456ghi789"
```

Using `stringData` lets you provide values in plain text; Kubernetes encodes them automatically.

For TLS secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-certs
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-certificate>
  tls.key: <base64-encoded-key>
```

### Mount a Secret as a Volume

Via the Rancher UI:

1. In the workload form, go to the **Volumes** section
2. Click **Add Volume** and select **Secret**
3. Select the Secret name
4. Set the mount path
5. Secret volumes are mounted read-only; if the UI offers a read-only option, leave it enabled

Via YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          volumeMounts:
            - name: credentials
              mountPath: /etc/app/credentials
              readOnly: true
            - name: tls
              mountPath: /etc/ssl/certs/app
              readOnly: true
      volumes:
        - name: credentials
          secret:
            secretName: app-credentials
            defaultMode: 0400
        - name: tls
          secret:
            secretName: tls-certs
            defaultMode: 0400
```

The `defaultMode: 0400` sets the file permissions to read-only for the owner, which is a security best practice for credential files.

### Mount Specific Secret Keys

```yaml
volumes:
  - name: credentials
    secret:
      secretName: app-credentials
      items:
        - key: db-config.yaml
          path: database.yaml
        - key: api-key.txt
          path: api-key
```

## Part 3: Projected Volumes

Projected volumes let you mount multiple ConfigMaps and Secrets into a single directory:

```yaml
volumes:
  - name: app-config
    projected:
      sources:
        - configMap:
            name: app-settings
            items:
              - key: app.conf
                path: app.conf
        - secret:
            name: app-credentials
            items:
              - key: db-config.yaml
                path: credentials/db-config.yaml
        - configMap:
            name: feature-flags
            items:
              - key: flags.json
                path: flags.json
```

Mount point:

```yaml
volumeMounts:
  - name: app-config
    mountPath: /etc/app
```

Result:
- `/etc/app/app.conf`
- `/etc/app/credentials/db-config.yaml`
- `/etc/app/flags.json`

## Automatic Updates

ConfigMaps and Secrets mounted as volumes are automatically updated when the source data changes, but the update is eventually consistent rather than immediate and can take up to the kubelet sync period plus cache propagation delay. However, this has caveats:

- Files mounted via `subPath` are not automatically updated
- The application must re-read the files, watch for file changes, or be restarted to pick up new values
- Environment variables from ConfigMaps and Secrets are not updated without a pod restart

To force a restart after updating a ConfigMap:

```bash
kubectl rollout restart deployment/my-app -n default
```

## Verifying Mounted Files

Check that the files are correctly mounted:

```bash
kubectl exec my-app-pod -n default -- ls -la /etc/app/credentials/
kubectl exec my-app-pod -n default -- cat /etc/app/credentials/db-config.yaml
```

In Rancher, use the **Execute Shell** feature to inspect the mounted files.

## Summary

Mounting ConfigMaps and Secrets as volumes in Rancher gives you the flexibility to provide configuration files, certificates, and credential files to your containers. Use ConfigMaps for non-sensitive configuration and Secrets for sensitive data. Rancher simplifies the process through its UI, while YAML gives you full control over mount paths, file permissions, and projected volumes. Remember to set restrictive file permissions on Secret volumes and use read-only mounts where possible.
