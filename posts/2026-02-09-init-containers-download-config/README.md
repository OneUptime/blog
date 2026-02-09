# How to Implement Init Containers That Download Configuration from External Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Configuration Management, Secrets, External Configuration

Description: Learn how to use init containers to fetch configuration from external sources like S3, Vault, or configuration servers before your application starts, enabling dynamic configuration management.

---

Modern applications often need configuration from external sources rather than baking it into container images or ConfigMaps. Init containers can fetch configuration from cloud storage, secret management systems, or configuration servers before your application starts.

This approach separates configuration from deployment, enables environment-specific settings, and keeps sensitive data out of your container images and Kubernetes manifests.

## Downloading Configuration from AWS S3

Here's an init container that fetches configuration from S3:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-s3-config
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: app-service-account
      initContainers:
      - name: fetch-config-from-s3
        image: amazon/aws-cli:2.13.0
        command:
        - sh
        - -c
        - |
          echo "Downloading configuration from S3..."
          aws s3 cp s3://$S3_BUCKET/$CONFIG_PATH/config.yaml /config/app-config.yaml
          aws s3 cp s3://$S3_BUCKET/$CONFIG_PATH/secrets.env /config/secrets.env
          echo "Configuration downloaded successfully"
          ls -la /config/
        env:
        - name: S3_BUCKET
          value: "my-app-configs"
        - name: CONFIG_PATH
          value: "production"
        - name: AWS_REGION
          value: "us-east-1"
        # Use IRSA (IAM Roles for Service Accounts) for authentication
        volumeMounts:
        - name: config
          mountPath: /config

      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        env:
        - name: CONFIG_FILE
          value: "/app/config/app-config.yaml"

      volumes:
      - name: config
        emptyDir: {}
```

## Fetching Secrets from HashiCorp Vault

Use an init container to retrieve secrets from Vault:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-vault-secrets
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: app-vault-auth
      initContainers:
      - name: fetch-vault-secrets
        image: hashicorp/vault:1.15
        command:
        - sh
        - -c
        - |
          # Authenticate with Vault using Kubernetes auth
          export VAULT_ADDR="http://vault:8200"

          # Get Vault token using Kubernetes service account
          KUBE_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

          VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
            role=myapp \
            jwt=$KUBE_TOKEN)

          export VAULT_TOKEN

          # Fetch secrets
          echo "Fetching secrets from Vault..."
          vault kv get -format=json secret/myapp/config > /config/secrets.json

          # Extract specific values
          vault kv get -field=database_url secret/myapp/db > /config/database_url
          vault kv get -field=api_key secret/myapp/external > /config/api_key

          echo "Secrets fetched successfully"
          chmod 600 /config/*
        volumeMounts:
        - name: config
          mountPath: /config

      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /app/secrets
          readOnly: true

      volumes:
      - name: config
        emptyDir:
          medium: Memory  # Store secrets in memory
```

## Downloading from Google Cloud Storage

For GCP environments:

```yaml
initContainers:
- name: fetch-gcs-config
  image: google/cloud-sdk:alpine
  command:
  - sh
  - -c
  - |
    echo "Downloading configuration from GCS..."
    gsutil cp gs://$GCS_BUCKET/config/$ENVIRONMENT/* /config/
    echo "Files downloaded:"
    ls -la /config/
  env:
  - name: GCS_BUCKET
    value: "my-app-configs"
  - name: ENVIRONMENT
    value: "production"
  volumeMounts:
  - name: config
    mountPath: /config
```

## Fetching from Azure Key Vault

For Azure environments:

```yaml
initContainers:
- name: fetch-azure-keyvault
  image: mcr.microsoft.com/azure-cli:latest
  command:
  - sh
  - -c
  - |
    # Login using managed identity
    az login --identity

    # Fetch secrets
    echo "Fetching secrets from Azure Key Vault..."
    az keyvault secret show --vault-name $KEYVAULT_NAME \
      --name database-connection-string \
      --query value -o tsv > /config/database_url

    az keyvault secret show --vault-name $KEYVAULT_NAME \
      --name api-key \
      --query value -o tsv > /config/api_key

    echo "Secrets fetched successfully"
    chmod 600 /config/*
  env:
  - name: KEYVAULT_NAME
    value: "myapp-keyvault"
  volumeMounts:
  - name: config
    mountPath: /config
```

## Custom Configuration Fetcher Script

Create a versatile configuration fetcher:

```python
#!/usr/bin/env python3
# config_fetcher.py

import os
import sys
import json
import boto3
import requests
from pathlib import Path

class ConfigFetcher:
    def __init__(self, output_dir='/config'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def fetch_from_s3(self, bucket, key):
        """Fetch file from S3"""
        print(f"Fetching {key} from S3 bucket {bucket}...")
        s3 = boto3.client('s3')
        local_path = self.output_dir / Path(key).name
        s3.download_file(bucket, key, str(local_path))
        print(f"Downloaded to {local_path}")
        return local_path

    def fetch_from_url(self, url, filename):
        """Fetch file from HTTP(S) URL"""
        print(f"Fetching {url}...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        local_path = self.output_dir / filename
        local_path.write_bytes(response.content)
        print(f"Downloaded to {local_path}")
        return local_path

    def fetch_from_consul(self, consul_url, key_prefix):
        """Fetch configuration from Consul KV"""
        print(f"Fetching from Consul: {key_prefix}")
        url = f"{consul_url}/v1/kv/{key_prefix}?recurse"
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        for item in response.json():
            key = item['Key'].replace(f"{key_prefix}/", "")
            value = item.get('Value', '')

            if value:
                import base64
                decoded_value = base64.b64decode(value).decode('utf-8')
                local_path = self.output_dir / key
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_text(decoded_value)
                print(f"Wrote {local_path}")

    def fetch_from_etcd(self, etcd_url, key_prefix):
        """Fetch configuration from etcd"""
        print(f"Fetching from etcd: {key_prefix}")
        url = f"{etcd_url}/v2/keys/{key_prefix}?recursive=true"
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        def process_node(node, parent_path=""):
            if node.get('dir'):
                for child in node.get('nodes', []):
                    process_node(child, parent_path)
            else:
                key = node['key'].replace(f"/{key_prefix}/", "")
                value = node.get('value', '')
                local_path = self.output_dir / key
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_text(value)
                print(f"Wrote {local_path}")

        data = response.json()
        if 'node' in data:
            process_node(data['node'])

def main():
    fetcher = ConfigFetcher()

    config_sources = json.loads(os.getenv('CONFIG_SOURCES', '[]'))

    for source in config_sources:
        source_type = source.get('type')

        try:
            if source_type == 's3':
                fetcher.fetch_from_s3(
                    source['bucket'],
                    source['key']
                )
            elif source_type == 'url':
                fetcher.fetch_from_url(
                    source['url'],
                    source['filename']
                )
            elif source_type == 'consul':
                fetcher.fetch_from_consul(
                    source['url'],
                    source['key_prefix']
                )
            elif source_type == 'etcd':
                fetcher.fetch_from_etcd(
                    source['url'],
                    source['key_prefix']
                )
            else:
                print(f"Unknown source type: {source_type}")
                sys.exit(1)

        except Exception as e:
            print(f"Error fetching from {source_type}: {e}")
            sys.exit(1)

    print("All configuration fetched successfully")

if __name__ == '__main__':
    main()
```

Use this fetcher:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-sources
data:
  sources.json: |
    [
      {
        "type": "s3",
        "bucket": "my-configs",
        "key": "production/app-config.yaml"
      },
      {
        "type": "url",
        "url": "https://config-server.example.com/myapp/production",
        "filename": "remote-config.json"
      }
    ]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-config-fetcher
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
      - name: fetch-config
        image: config-fetcher:latest
        env:
        - name: CONFIG_SOURCES
          valueFrom:
            configMapKeyRef:
              name: config-sources
              key: sources.json
        volumeMounts:
        - name: config
          mountPath: /config

      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true

      volumes:
      - name: config
        emptyDir: {}
```

## Template Rendering with Downloaded Config

Render configuration templates with environment-specific values:

```yaml
initContainers:
- name: fetch-and-render-config
  image: alpine:3.19
  command:
  - sh
  - -c
  - |
    apk add --no-cache curl envsubst

    # Download template
    curl -o /config/template.yaml \
      https://config-server.example.com/templates/app-config.yaml

    # Render with environment variables
    envsubst < /config/template.yaml > /config/app-config.yaml

    echo "Configuration rendered successfully"
    cat /config/app-config.yaml
  env:
  - name: ENVIRONMENT
    value: "production"
  - name: DATABASE_HOST
    value: "postgres.production.svc.cluster.local"
  - name: CACHE_HOST
    value: "redis.production.svc.cluster.local"
  volumeMounts:
  - name: config
    mountPath: /config
```

## Monitoring Configuration Fetches

Add observability to configuration fetching:

```yaml
initContainers:
- name: fetch-config
  image: config-fetcher:latest
  command:
  - sh
  - -c
  - |
    START_TIME=$(date +%s)

    if /fetch-config.py; then
      END_TIME=$(date +%s)
      DURATION=$((END_TIME - START_TIME))

      # Log success metric
      echo "config_fetch_duration_seconds $DURATION" >> /metrics/init-metrics.prom
      echo "config_fetch_status 1" >> /metrics/init-metrics.prom

      exit 0
    else
      # Log failure metric
      echo "config_fetch_status 0" >> /metrics/init-metrics.prom
      exit 1
    fi
  volumeMounts:
  - name: metrics
    mountPath: /metrics
  - name: config
    mountPath: /config
```

Init containers provide a flexible mechanism for fetching configuration from external sources, enabling dynamic configuration management and keeping sensitive data secure while maintaining clean separation between configuration and deployment.
