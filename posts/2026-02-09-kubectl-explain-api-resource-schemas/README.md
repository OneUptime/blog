# How to Use kubectl explain to Explore API Resource Schemas from the Command Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, API Documentation

Description: Master kubectl explain to discover resource field definitions, data types, required fields, and documentation directly from the command line without external API references.

---

Writing Kubernetes YAML requires knowing field names, types, and structures. Instead of searching online documentation or example files, kubectl explain provides authoritative schema information directly from your cluster's API server.

## Basic kubectl explain Usage

Query resource schemas with the resource type name:

```bash
# Explain pods
kubectl explain pods

# Explain deployments
kubectl explain deployments

# Explain services
kubectl explain services

# Explain configmaps
kubectl explain configmaps
```

This shows top-level resource structure and available fields.

## Exploring Nested Fields

Use dot notation to drill into nested structures:

```bash
# Explain pod spec
kubectl explain pods.spec

# Explain container spec within pod spec
kubectl explain pods.spec.containers

# Explain resource requirements
kubectl explain pods.spec.containers.resources

# Explain volume mounts
kubectl explain pods.spec.containers.volumeMounts
```

Each level reveals deeper field structures.

## Understanding Field Descriptions

Explain output shows field types and descriptions:

```bash
# Explain deployment replicas field
kubectl explain deployments.spec.replicas

# Output includes:
# KIND:     Deployment
# VERSION:  apps/v1
# FIELD:    replicas <integer>
# DESCRIPTION:
#   Number of desired pods. This is a pointer to distinguish between explicit
#   zero and not specified. Defaults to 1.
```

This provides field data types and semantic meaning.

## Finding Required Fields

Identify which fields are mandatory:

```bash
# Explain pod spec
kubectl explain pods.spec

# Look for "-required-" in output
# Required fields are marked in the description

# Check container requirements
kubectl explain pods.spec.containers
# Shows "name" and "image" are required fields
```

Required fields must be present for resources to be valid.

## Exploring Array Fields

Arrays show their element structure:

```bash
# Explain containers array
kubectl explain pods.spec.containers
# Shows it's an array of Container objects

# Explain individual container fields
kubectl explain pods.spec.containers.name
kubectl explain pods.spec.containers.image
kubectl explain pods.spec.containers.ports

# Explore port definition
kubectl explain pods.spec.containers.ports.containerPort
kubectl explain pods.spec.containers.ports.protocol
```

Array elements have their own schema definitions.

## Using Recursive Output

Show entire resource schema at once:

```bash
# Recursive explain (shows all nested fields)
kubectl explain pods --recursive

# Recursive with grep to find specific fields
kubectl explain pods --recursive | grep -i volume

# Recursive for specific nested section
kubectl explain pods.spec --recursive
```

Recursive mode outputs the complete field hierarchy.

## Checking API Versions

Different API versions may have different schemas:

```bash
# Explain with specific API version
kubectl explain deployment --api-version=apps/v1

# Compare API versions
kubectl explain horizontalpodautoscaler --api-version=autoscaling/v1
kubectl explain horizontalpodautoscaler --api-version=autoscaling/v2

# Check available versions
kubectl api-versions | grep autoscaling
```

This reveals version-specific field differences.

## Exploring Custom Resources

Explain works with CRDs:

```bash
# Explain custom resource
kubectl explain applications.argoproj.io

# Explore CRD fields
kubectl explain applications.argoproj.io.spec

# Dive into CRD-specific fields
kubectl explain applications.argoproj.io.spec.source
kubectl explain applications.argoproj.io.spec.destination
```

CRDs provide explain schemas just like built-in resources.

## Finding Field Data Types

Understand expected data types for each field:

```bash
# Check field type
kubectl explain pods.spec.activeDeadlineSeconds
# FIELD: activeDeadlineSeconds <integer>

kubectl explain pods.spec.hostname
# FIELD: hostname <string>

kubectl explain pods.spec.hostNetwork
# FIELD: hostNetwork <boolean>

kubectl explain pods.spec.containers
# FIELD: containers <[]Object> -required-
```

Data types include integer, string, boolean, Object, and arrays.

## Exploring Volume Types

Volumes have many configuration options:

```bash
# List available volume types
kubectl explain pods.spec.volumes

# Explain specific volume types
kubectl explain pods.spec.volumes.emptyDir
kubectl explain pods.spec.volumes.configMap
kubectl explain pods.spec.volumes.secret
kubectl explain pods.spec.volumes.persistentVolumeClaim

# Explore volume options
kubectl explain pods.spec.volumes.emptyDir.sizeLimit
kubectl explain pods.spec.volumes.emptyDir.medium
```

Each volume type has unique configuration fields.

## Understanding Security Context

Security settings nest under securityContext:

```bash
# Pod-level security context
kubectl explain pods.spec.securityContext

# Container-level security context
kubectl explain pods.spec.containers.securityContext

# Specific security fields
kubectl explain pods.spec.containers.securityContext.runAsUser
kubectl explain pods.spec.containers.securityContext.runAsNonRoot
kubectl explain pods.spec.containers.securityContext.capabilities
```

Security context options control container privileges and access.

## Exploring Resource Requirements

CPU and memory settings:

```bash
# Resource requirements
kubectl explain pods.spec.containers.resources

# Requests
kubectl explain pods.spec.containers.resources.requests
kubectl explain pods.spec.containers.resources.requests.cpu
kubectl explain pods.spec.containers.resources.requests.memory

# Limits
kubectl explain pods.spec.containers.resources.limits
kubectl explain pods.spec.containers.resources.limits.cpu
kubectl explain pods.spec.containers.resources.limits.memory
```

This shows how to specify resource constraints.

## Discovering Probe Configurations

Liveness and readiness probe options:

```bash
# Liveness probe
kubectl explain pods.spec.containers.livenessProbe

# Probe types
kubectl explain pods.spec.containers.livenessProbe.exec
kubectl explain pods.spec.containers.livenessProbe.httpGet
kubectl explain pods.spec.containers.livenessProbe.tcpSocket

# Probe tuning
kubectl explain pods.spec.containers.livenessProbe.initialDelaySeconds
kubectl explain pods.spec.containers.livenessProbe.periodSeconds
kubectl explain pods.spec.containers.livenessProbe.timeoutSeconds
kubectl explain pods.spec.containers.livenessProbe.successThreshold
kubectl explain pods.spec.containers.livenessProbe.failureThreshold
```

Probes ensure pod health monitoring.

## Understanding Deployment Strategies

Deployment update strategies:

```bash
# Deployment strategy
kubectl explain deployments.spec.strategy

# Strategy type
kubectl explain deployments.spec.strategy.type

# Rolling update parameters
kubectl explain deployments.spec.strategy.rollingUpdate
kubectl explain deployments.spec.strategy.rollingUpdate.maxSurge
kubectl explain deployments.spec.strategy.rollingUpdate.maxUnavailable
```

This reveals deployment rollout configuration options.

## Exploring Service Types

Service configuration varies by type:

```bash
# Service types
kubectl explain services.spec.type

# ClusterIP specific
kubectl explain services.spec.clusterIP

# LoadBalancer specific
kubectl explain services.spec.loadBalancerIP
kubectl explain services.spec.loadBalancerSourceRanges

# NodePort specific
kubectl explain services.spec.ports.nodePort

# Service ports
kubectl explain services.spec.ports
kubectl explain services.spec.ports.port
kubectl explain services.spec.ports.targetPort
kubectl explain services.spec.ports.protocol
```

Each service type has specific configuration fields.

## Checking Storage Class Options

Storage configuration fields:

```bash
# Storage class
kubectl explain storageclass

# Provisioner
kubectl explain storageclass.provisioner

# Parameters
kubectl explain storageclass.parameters

# Reclaim policy
kubectl explain storageclass.reclaimPolicy

# Volume binding mode
kubectl explain storageclass.volumeBindingMode
```

Storage classes configure dynamic volume provisioning.

## Finding Affinity and Toleration Fields

Pod scheduling constraints:

```bash
# Node affinity
kubectl explain pods.spec.affinity.nodeAffinity

# Pod affinity
kubectl explain pods.spec.affinity.podAffinity

# Pod anti-affinity
kubectl explain pods.spec.affinity.podAntiAffinity

# Tolerations
kubectl explain pods.spec.tolerations
kubectl explain pods.spec.tolerations.key
kubectl explain pods.spec.tolerations.operator
kubectl explain pods.spec.tolerations.effect
```

Affinity and tolerations control pod placement.

## Exploring Init Containers

Init container configuration:

```bash
# Init containers array
kubectl explain pods.spec.initContainers

# Init container fields (same as containers)
kubectl explain pods.spec.initContainers.name
kubectl explain pods.spec.initContainers.image
kubectl explain pods.spec.initContainers.command
```

Init containers run before main containers start.

## Understanding Environment Variables

Environment variable configuration:

```bash
# Environment variables
kubectl explain pods.spec.containers.env

# Env from literal value
kubectl explain pods.spec.containers.env.name
kubectl explain pods.spec.containers.env.value

# Env from field reference
kubectl explain pods.spec.containers.env.valueFrom
kubectl explain pods.spec.containers.env.valueFrom.fieldRef

# Env from ConfigMap
kubectl explain pods.spec.containers.env.valueFrom.configMapKeyRef

# Env from Secret
kubectl explain pods.spec.containers.env.valueFrom.secretKeyRef
```

Multiple methods exist for setting environment variables.

## Using explain in Scripts

Integrate explain into automation:

```bash
#!/bin/bash
# check-field-exists.sh

RESOURCE=$1
FIELD=$2

if kubectl explain "$RESOURCE.$FIELD" &>/dev/null; then
    echo "Field $FIELD exists in $RESOURCE"
    kubectl explain "$RESOURCE.$FIELD"
else
    echo "Field $FIELD does not exist in $RESOURCE"
    exit 1
fi
```

This validates field existence before attempting to use it.

## Generating YAML Templates

Use explain to guide YAML writing:

```bash
#!/bin/bash
# generate-pod-template.sh

echo "# Pod template based on kubectl explain"
echo "apiVersion: v1"
echo "kind: Pod"
echo "metadata:"
echo "  name: example-pod"
echo "spec:"

# Get required fields from explain
kubectl explain pods.spec --recursive | grep -E "^\s+\w+" | while read field; do
    echo "  # $field"
done
```

This creates starter templates with field hints.

## Comparing Resource Versions

Check differences between API versions:

```bash
# Compare HPA v1 vs v2
kubectl explain horizontalpodautoscaler.spec --api-version=autoscaling/v1 > hpa-v1.txt
kubectl explain horizontalpodautoscaler.spec --api-version=autoscaling/v2 > hpa-v2.txt
diff hpa-v1.txt hpa-v2.txt

# Identify new fields in v2
```

This reveals what changed between versions.

## Finding Deprecated Fields

Some API versions deprecate fields:

```bash
# Check current version fields
kubectl explain deployments.spec

# Compare with older API version if supported
kubectl explain deployments.spec --api-version=apps/v1beta2

# Look for deprecation warnings in describe
kubectl describe deployment webapp
```

Explain shows current valid fields for the API version.

## Interactive Field Exploration

Build an interactive explorer:

```bash
#!/bin/bash
# explore-resource.sh

RESOURCE=$1
CURRENT_PATH=$RESOURCE

while true; do
    echo "Explaining: $CURRENT_PATH"
    kubectl explain "$CURRENT_PATH"
    echo ""
    read -p "Enter field to explore (or 'back' or 'quit'): " field

    if [[ "$field" == "quit" ]]; then
        break
    elif [[ "$field" == "back" ]]; then
        CURRENT_PATH=$(echo "$CURRENT_PATH" | rev | cut -d. -f2- | rev)
    else
        CURRENT_PATH="$CURRENT_PATH.$field"
    fi
done
```

This creates an interactive API documentation browser.

kubectl explain turns your cluster into a living API reference. No internet required, no version mismatches, just accurate schema information from the authoritative source. Use it when writing YAML, debugging field errors, or exploring new resource types. Combine with other discovery commands like api-resources for complete cluster capability understanding. See https://oneuptime.com/blog/post/2026-02-09-kubectl-api-resources-versions-discover/view for more API exploration techniques.
