# How to Migrate from Docker Swarm to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Migration, Docker-swarm, Kubernetes

Description: Step-by-step guide to migrating containerized workloads from Docker Swarm to Rancher Kubernetes.

## Introduction

Migrating from Docker Swarm to a Rancher-managed Kubernetes cluster is a common task for organizations modernizing their container infrastructure. This guide provides a systematic approach to migration with minimal downtime.

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
Set up Rancher and the downstream Kubernetes cluster, then configure networking and storage.

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

from pathlib import Path
import os
import re

import yaml


def to_k8s_name(name):
    """Convert a service name into a valid Kubernetes resource name."""
    normalized = re.sub(r"[^a-z0-9-]", "-", name.lower())
    return normalized.strip("-")


def convert_environment(environment):
    """Convert Compose environment values to Kubernetes env vars."""
    env_vars = []

    if isinstance(environment, dict):
        for key, value in environment.items():
            if value is None:
                value = os.environ.get(key)
                if value is None:
                    continue
            env_vars.append({"name": str(key), "value": str(value)})
        return env_vars

    if isinstance(environment, list):
        for item in environment:
            if "=" in item:
                key, value = item.split("=", 1)
                env_vars.append({"name": key, "value": value})
                continue

            value = os.environ.get(item)
            if value is not None:
                env_vars.append({"name": item, "value": value})

    return env_vars


def convert_ports(ports):
    """Convert simple Compose port mappings to Kubernetes service ports."""
    service_ports = []

    for index, port in enumerate(ports, start=1):
        protocol = "TCP"

        if isinstance(port, int):
            container_port = port
        elif isinstance(port, str):
            port_spec, _, protocol_value = port.partition("/")
            if protocol_value:
                protocol = protocol_value.upper()
            container_port = port_spec.rsplit(":", 1)[-1]
        elif isinstance(port, dict):
            container_port = port["target"]
            protocol = port.get("protocol", "tcp").upper()
        else:
            continue

        if isinstance(container_port, str) and "-" in container_port:
            continue

        container_port = int(container_port)

        service_ports.append(
            {
                "name": f"port-{index}",
                "port": container_port,
                "targetPort": container_port,
                "protocol": protocol,
            }
        )

    return service_ports


def convert_service(service_name, service_config):
    """Convert a Docker service definition to Kubernetes manifests."""
    k8s_name = to_k8s_name(service_name)
    ports = convert_ports(service_config.get("ports", []))
    environment = convert_environment(service_config.get("environment", {}))

    container = {
        "name": k8s_name,
        "image": service_config["image"],
    }

    if environment:
        container["env"] = environment

    if ports:
        container["ports"] = [
            {
                "containerPort": port["targetPort"],
                "protocol": port["protocol"],
            }
            for port in ports
        ]

    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": k8s_name,
            "labels": {"app": k8s_name},
        },
        "spec": {
            "replicas": service_config.get("deploy", {}).get("replicas", 1),
            "selector": {"matchLabels": {"app": k8s_name}},
            "template": {
                "metadata": {"labels": {"app": k8s_name}},
                "spec": {"containers": [container]},
            },
        },
    }

    manifests = [deployment]

    if ports:
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": k8s_name,
                "labels": {"app": k8s_name},
            },
            "spec": {
                "selector": {"app": k8s_name},
                "ports": ports,
            },
        }
        manifests.append(service)

    return manifests


# Read docker-compose.yml
with open("docker-compose.yml") as f:
    compose = yaml.safe_load(f)

output_dir = Path("kubernetes")
output_dir.mkdir(exist_ok=True)

# Convert each service
for service_name, service_config in compose.get("services", {}).items():
    for manifest in convert_service(service_name, service_config):
        output_file = output_dir / f"{manifest['metadata']['name']}-{manifest['kind'].lower()}.yaml"
        with output_file.open("w") as f:
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

# Or convert and immediately apply to a Rancher-managed cluster
mkdir -p kubernetes
kompose convert -f docker-compose.yml -o ./kubernetes/
kubectl create namespace my-app --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f ./kubernetes/ --namespace my-app
```

## Step 4: Migrate Persistent Data

```bash
#!/bin/bash
# migrate-data.sh

NAMESPACE="my-app"
PVC_NAME="app-data"
DATA_DIR="/data"

# Create namespace and PVC on new cluster
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
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
  storageClassName: your-storage-class
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
      aws s3 sync s3://migration-backup${DATA_DIR} /mnt/data/
    volumeMounts:
    - name: data
      mountPath: /mnt/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: $PVC_NAME
PODEOF

kubectl wait pod/data-migrator -n $NAMESPACE   --for=jsonpath='{.status.phase}'=Succeeded   --timeout=3600s
```

## Step 5: Deploy to a Rancher-Managed Cluster

```bash
# Create the namespace and apply converted manifests
kubectl create namespace my-app --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f ./kubernetes/ --namespace my-app

# Verify all pods are running
kubectl get pods -n my-app

# Test application functionality via the generated Service
kubectl run test-client   --image=busybox:1.36   --rm -it   --restart=Never   --namespace my-app   --command -- wget -qO- http://service-name:PORT/health
```

## Step 6: DNS Cutover

```bash
# Once validated, update DNS to point to new cluster
# For AWS Route53 alias records to an AWS load balancer:
aws route53 change-resource-record-sets   --hosted-zone-id YOUR_ZONE_ID   --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ELB_HOSTED_ZONE_ID",
          "DNSName": "new-cluster-lb-123456.eu-west-2.elb.amazonaws.com.",
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

Migrating from Docker Swarm to a Rancher-managed Kubernetes cluster requires careful planning but provides significant long-term benefits in manageability, scalability, and ecosystem access. Follow the phased approach, validate each step thoroughly, and maintain the ability to roll back during the transition period.
