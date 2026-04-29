# How to Migrate from ECS to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Migration, Aws-ecs, Kubernetes

Description: Guide to migrating containerized workloads from Amazon ECS to Rancher Kubernetes.

## Introduction

How to Migrate from ECS to Rancher is a common task for organizations modernizing their container infrastructure. This guide provides a systematic approach to migration with minimal downtime.

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
# docker secret ls
# docker config ls
```

## Step 2: Convert Workload Definitions

```python
#!/usr/bin/env python3
# convert-to-kubernetes.py
# Example: Convert Docker Compose to Kubernetes manifests

import os
import re
import yaml

def to_k8s_name(name):
    return re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-")[:63] or "app"

def parse_environment(environment):
    if isinstance(environment, dict):
        return [{"name": str(k), "value": str(v)} for k, v in environment.items()]

    if isinstance(environment, list):
        env_vars = []
        for item in environment:
            item = str(item)
            if "=" in item:
                name, value = item.split("=", 1)
                env_vars.append({"name": name, "value": value})
            else:
                env_vars.append({"name": item, "value": os.getenv(item, "")})
        return env_vars

    return []

def parse_ports(ports):
    parsed_ports = []

    for port in ports:
        if isinstance(port, int):
            parsed_ports.append({
                "servicePort": port,
                "containerPort": port,
                "protocol": "TCP"
            })
            continue

        if isinstance(port, str):
            raw_port, _, protocol = port.partition("/")
            segments = raw_port.split(":")
            container_port = int(segments[-1].split("-")[0])
            service_port = int(segments[-2].split("-")[0]) if len(segments) > 1 else container_port
            parsed_ports.append({
                "servicePort": service_port,
                "containerPort": container_port,
                "protocol": protocol.upper() or "TCP"
            })
            continue

        if isinstance(port, dict) and "target" in port:
            container_port = int(str(port["target"]).split("-")[0])
            service_port = int(str(port.get("published", port["target"])).split("-")[0])
            parsed_ports.append({
                "servicePort": service_port,
                "containerPort": container_port,
                "protocol": str(port.get("protocol", "tcp")).upper()
            })

    return parsed_ports

def convert_service(service_name, service_config):
    """Convert a Compose service definition to Kubernetes manifests"""

    resource_name = to_k8s_name(service_name)
    image = service_config.get("image")
    if not image:
        raise ValueError(
            f"Service '{service_name}' must define an image before conversion"
        )

    container_ports = parse_ports(service_config.get("ports", []))
    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": resource_name,
            "labels": {"app": resource_name}
        },
        "spec": {
            "replicas": service_config.get("deploy", {}).get("replicas", 1),
            "selector": {"matchLabels": {"app": resource_name}},
            "template": {
                "metadata": {"labels": {"app": resource_name}},
                "spec": {
                    "containers": [{
                        "name": resource_name,
                        "image": image,
                        "env": parse_environment(service_config.get("environment")),
                        "ports": [
                            {"containerPort": port["containerPort"]}
                            for port in container_ports
                        ]
                    }]
                }
            }
        }
    }

    service = None
    if container_ports:
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": resource_name,
                "labels": {"app": resource_name}
            },
            "spec": {
                "selector": {"app": resource_name},
                "ports": [
                    {
                        "name": f"port-{index + 1}",
                        "port": port["servicePort"],
                        "targetPort": port["containerPort"],
                        "protocol": port["protocol"]
                    }
                    for index, port in enumerate(container_ports)
                ]
            }
        }

    return deployment, service

# Read compose.yaml
with open("compose.yaml") as f:
    compose = yaml.safe_load(f)

os.makedirs("k8s", exist_ok=True)

# Convert each service
for service_name, service_config in compose.get("services", {}).items():
    k8s_deployment, k8s_service = convert_service(service_name, service_config)

    resource_name = to_k8s_name(service_name)
    output_file = f"k8s/{resource_name}-deployment.yaml"
    with open(output_file, "w") as f:
        yaml.safe_dump(k8s_deployment, f, sort_keys=False)

    print(f"Converted: {service_name} -> {output_file}")

    if k8s_service:
        service_output_file = f"k8s/{resource_name}-service.yaml"
        with open(service_output_file, "w") as f:
            yaml.safe_dump(k8s_service, f, sort_keys=False)

        print(f"Converted: {service_name} -> {service_output_file}")
```

## Step 3: Alternative - Use kompose Tool

```bash
# Install kompose (Docker Compose to Kubernetes converter)
curl -L https://github.com/kubernetes/kompose/releases/download/v1.38.0/kompose-linux-amd64 -o kompose
chmod +x kompose && sudo mv ./kompose /usr/local/bin/kompose

# Convert compose.yaml to Kubernetes manifests
kompose convert -f compose.yaml

# Or convert and immediately apply to Rancher cluster
mkdir -p ./kubernetes/
kompose convert -f compose.yaml -o ./kubernetes/
kubectl apply -f ./kubernetes/
```

## Step 4: Migrate Persistent Data

```bash
#!/bin/bash
# migrate-data.sh

NAMESPACE="my-app"
PVC_NAME="app-data"
DATA_DIR="/data"
STORAGE_CLASS="your-storage-class"

# Create the namespace if it doesn't already exist
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

kubectl wait pod/data-migrator -n $NAMESPACE --for=jsonpath='{.status.phase}'=Succeeded --timeout=3600s
```

## Step 5: Deploy to Rancher

```bash
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
        "AliasTarget": {
          "HostedZoneId": "YOUR_LOAD_BALANCER_HOSTED_ZONE_ID",
          "DNSName": "YOUR_LOAD_BALANCER_DNS_NAME",
          "EvaluateTargetHealth": false
        }
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

Migrating to Rancher from ecs requires careful planning but provides significant long-term benefits in manageability, scalability, and ecosystem access. Follow the phased approach, validate each step thoroughly, and maintain the ability to roll back during the transition period.
