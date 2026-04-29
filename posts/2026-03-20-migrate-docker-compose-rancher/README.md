# How to Migrate from Docker Compose to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Migration, Docker-compose, Kubernetes

Description: Guide to converting Docker Compose workloads to Kubernetes manifests for deployment on Rancher.

## Introduction

How to Migrate from Docker Compose to Rancher is a common task for organizations modernizing their container infrastructure. This guide provides a systematic approach to migration with minimal downtime.

## Why Migrate to Rancher?

- **Centralized management**: Single pane of glass for all clusters
- **Enterprise features**: RBAC, audit logging, compliance
- **Kubernetes native**: Access to the full Kubernetes ecosystem
- **Multi-cloud flexibility**: Run anywhere
- **GitOps support**: Fleet for declarative deployments

## Migration Strategy

### Phase 1: Assessment
Inventory current workloads, dependencies, and configurations.

### Phase 2: Preparation
Set up Rancher cluster, configure networking and storage.

### Phase 3: Migration
Move workloads one by one, starting with stateless applications.

### Phase 4: Validation
Verify all workloads operate correctly in the new environment.

### Phase 5: Cutover
Update DNS/load balancers, decommission old environment.

## Step 1: Inventory Your Workloads

```bash
#!/bin/bash
# inventory-workloads.sh

echo "=== Workload Inventory ==="
echo ""
echo "Services/Applications:"
# Docker Swarm example:

# docker service ls --format "table {{.Name}}\t{{.Image}}\t{{.Replicas}}"

# Docker Compose example:
# docker compose ps

# ECS example:
# aws ecs list-services --cluster your-cluster

echo ""
echo "Volumes/Data:"
# docker volume ls

echo ""
echo "Networks:"
# docker network ls

echo ""
echo "Secrets/Configs:"
# Docker Compose example:
# docker compose config

# Docker Swarm example:
# docker secret ls
# docker config ls
```

## Step 2: Convert Workload Definitions

```python
#!/usr/bin/env python3
# convert-to-kubernetes.py
# Example: Convert Docker Compose services to Kubernetes Deployment and Service manifests

import json
import os
import yaml
import subprocess

def normalize_environment(environment):
    if not environment:
        return []

    if isinstance(environment, dict):
        items = environment.items()
    else:
        items = []
        for entry in environment:
            if "=" in entry:
                key, value = entry.split("=", 1)
                items.append((key, value))
            else:
                items.append((entry, ""))

    return [
        {"name": str(key), "value": "" if value is None else str(value)}
        for key, value in items
    ]

def normalize_ports(ports):
    normalized = []

    for port in ports or []:
        if isinstance(port, dict):
            target = port.get("target")
            protocol = str(port.get("protocol", "tcp")).upper()
        else:
            value = str(port)
            target = value.split("/", 1)[0].rsplit(":", 1)[-1]
            protocol = "TCP"

        if not target:
            continue

        container_port = int(str(target).split("-", 1)[0])
        normalized.append(
            {
                "name": f"port-{container_port}",
                "port": container_port,
                "targetPort": container_port,
                "containerPort": container_port,
                "protocol": protocol,
            }
        )

    unique_ports = []
    seen = set()
    for port in normalized:
        key = (port["containerPort"], port["protocol"])
        if key not in seen:
            unique_ports.append(port)
            seen.add(key)

    return unique_ports

def convert_service_to_manifests(service_name, service_config):
    image = service_config.get("image")
    if not image:
        raise ValueError(f"Service '{service_name}' must define an image before conversion")

    environment = normalize_environment(service_config.get("environment"))
    ports = normalize_ports(service_config.get("ports"))

    container = {
        "name": service_name,
        "image": image,
    }

    if environment:
        container["env"] = environment

    if ports:
        container["ports"] = [
            {
                "containerPort": port["containerPort"],
                "protocol": port["protocol"],
            }
            for port in ports
        ]

    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": service_name,
            "labels": {"app": service_name},
        },
        "spec": {
            "replicas": service_config.get("deploy", {}).get("replicas", 1),
            "selector": {"matchLabels": {"app": service_name}},
            "template": {
                "metadata": {"labels": {"app": service_name}},
                "spec": {
                    "containers": [container],
                },
            },
        },
    }

    manifests = [deployment]

    if ports:
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": service_name,
                "labels": {"app": service_name},
            },
            "spec": {
                "selector": {"app": service_name},
                "ports": [
                    {
                        "name": port["name"],
                        "port": port["port"],
                        "targetPort": port["targetPort"],
                        "protocol": port["protocol"],
                    }
                    for port in ports
                ],
            },
        }
        manifests.append(service)

    return manifests

compose_output = subprocess.check_output(
    ["docker", "compose", "config", "--format", "json"],
    text=True,
)
compose = json.loads(compose_output)

os.makedirs("k8s", exist_ok=True)

# Convert each service
for service_name, service_config in compose.get("services", {}).items():
    for manifest in convert_service_to_manifests(service_name, service_config):
        kind = manifest["kind"].lower()
        output_file = f"k8s/{service_name}-{kind}.yaml"
        with open(output_file, "w") as f:
            yaml.safe_dump(manifest, f, sort_keys=False)

        print(f"Converted: {service_name} -> {output_file}")
```

## Step 3: Alternative - Use kompose Tool

```bash
# Install kompose (Docker Compose to Kubernetes converter)
curl -L https://github.com/kubernetes/kompose/releases/download/v1.38.0/kompose-linux-amd64   -o kompose
chmod +x kompose && sudo mv ./kompose /usr/local/bin/kompose

# Convert docker-compose.yml to Kubernetes manifests
kompose convert -f docker-compose.yml

# Or convert and immediately apply to Rancher cluster
kompose convert -f docker-compose.yml -o ./kubernetes/
kubectl apply -f ./kubernetes/
```

## Step 4: Migrate Persistent Data

```bash
#!/bin/bash
# migrate-data.sh

NAMESPACE="my-app"
PVC_NAME="app-data"
DATA_DIR="/data"
STORAGE_CLASS="YOUR_STORAGE_CLASS"

# Create namespace if it does not exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create PVC on new cluster
kubectl apply -f - << PVCEOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVC_NAME
  namespace: $NAMESPACE
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: $STORAGE_CLASS
PVCEOF

# Copy data using a migration pod
kubectl apply -f - << PODEOF
apiVersion: v1
kind: Pod
metadata:
  name: data-migrator
  namespace: $NAMESPACE
spec:
  restartPolicy: Never
  containers:
  - name: migrator
    image: amazon/aws-cli:latest
    command:
    - sh
    - -c
    - |
      # Download from S3 backup
      aws s3 sync "s3://migration-backup${DATA_DIR}" /mnt/data/
    volumeMounts:
    - name: data
      mountPath: /mnt/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: $PVC_NAME
PODEOF

kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/data-migrator -n "$NAMESPACE"   --timeout=3600s
```

## Step 5: Deploy to Rancher

```bash
# Create namespace if it does not exist
kubectl create namespace my-app --dry-run=client -o yaml | kubectl apply -f -

# Apply converted manifests to Rancher cluster
kubectl apply -f ./kubernetes/ --namespace my-app

# Verify all pods are running
kubectl get pods -n my-app

# Test application functionality
kubectl run test-client   --image=curlimages/curl   --rm -it   --restart=Never   --namespace my-app   -- curl http://my-app:8080/health
```

## Step 6: DNS Cutover

```bash
# Once validated, update DNS to point to new cluster
# For AWS Route53:
aws route53 change-resource-record-sets   --hosted-zone-id YOUR_ZONE_ID   --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "NEW_CLUSTER_LB_IP"}]
      }
    }]
  }'
```

## Step 7: Validation Checklist

```bash
#!/bin/bash
# validation-checklist.sh

echo "=== Migration Validation ==="
echo "[ ] All pods running: $(kubectl get pods -n my-app | grep -c Running)/$(kubectl get pods -n my-app | tail -n +2 | wc -l)"
echo "[ ] Services accessible"
echo "[ ] Data integrity verified"
echo "[ ] Authentication working"
echo "[ ] Monitoring configured"
echo "[ ] Logging configured"
echo "[ ] Backups configured"
echo "[ ] DNS pointing to new cluster"
echo "[ ] Old environment decommissioned"
```

## Conclusion

Migrating to Rancher from docker-compose requires careful planning but provides significant long-term benefits in manageability, scalability, and ecosystem access. Follow the phased approach, validate each step thoroughly, and maintain the ability to roll back during the transition period.
