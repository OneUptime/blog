# How to Use kubectl explain to Understand Pod Spec Fields During Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Documentation, API, Debugging

Description: Master kubectl explain to understand Kubernetes API resource fields, pod specifications, and configuration options directly from the command line.

---

When debugging Kubernetes resources, understanding the available fields and their purposes is crucial. The kubectl explain command provides built-in documentation for Kubernetes API resources without leaving your terminal.

## Basic Usage

Get information about any Kubernetes resource:

```bash
# Explain pod resource
kubectl explain pod

# Explain deployment
kubectl explain deployment

# Explain service
kubectl explain service
```

Output shows the resource structure:

```
KIND:     Pod
VERSION:  v1

DESCRIPTION:
     Pod is a collection of containers that can run on a host. This resource is
     created by clients and scheduled onto hosts.

FIELDS:
   apiVersion   <string>
   kind <string>
   metadata     <Object>
   spec <Object>
   status       <Object>
```

## Exploring Nested Fields

Drill down into nested structures using dot notation:

```bash
# Explain pod spec
kubectl explain pod.spec

# Explain container configuration
kubectl explain pod.spec.containers

# Explain security context
kubectl explain pod.spec.securityContext

# Explain volume mounts
kubectl explain pod.spec.containers.volumeMounts
```

## Understanding Pod Spec During Debugging

When troubleshooting pod issues, explain specific fields:

```bash
# Why is pod failing to start?
kubectl explain pod.spec.containers.command
kubectl explain pod.spec.containers.args

# Resource-related issues
kubectl explain pod.spec.containers.resources
kubectl explain pod.spec.containers.resources.requests
kubectl explain pod.spec.containers.resources.limits

# Probe configuration
kubectl explain pod.spec.containers.livenessProbe
kubectl explain pod.spec.containers.readinessProbe
kubectl explain pod.spec.containers.startupProbe
```

Example workflow:

```bash
# Pod won't start, check restart policy
kubectl explain pod.spec.restartPolicy

# Output shows:
FIELD: restartPolicy <string>
DESCRIPTION:
     Restart policy for all containers within the pod. One of Always, OnFailure,
     Never. Default to Always.
```

## Exploring Security Context Options

Understand security settings:

```bash
# Pod-level security
kubectl explain pod.spec.securityContext

# Container-level security
kubectl explain pod.spec.containers.securityContext

# Specific security fields
kubectl explain pod.spec.securityContext.runAsUser
kubectl explain pod.spec.securityContext.fsGroup
kubectl explain pod.spec.containers.securityContext.capabilities
kubectl explain pod.spec.containers.securityContext.privileged
```

Useful for debugging permission issues:

```bash
# Check what securityContext fields are available
kubectl explain pod.spec.securityContext --recursive

# Understand capabilities
kubectl explain pod.spec.containers.securityContext.capabilities.add
```

## Volume Configuration

Understand volume types and mounting:

```bash
# Volume types
kubectl explain pod.spec.volumes

# See all volume types
kubectl explain pod.spec.volumes --recursive | grep "<Object>" -B 1

# Specific volume types
kubectl explain pod.spec.volumes.configMap
kubectl explain pod.spec.volumes.secret
kubectl explain pod.spec.volumes.persistentVolumeClaim
kubectl explain pod.spec.volumes.emptyDir

# Volume mounts
kubectl explain pod.spec.containers.volumeMounts
kubectl explain pod.spec.containers.volumeMounts.mountPath
kubectl explain pod.spec.containers.volumeMounts.subPath
```

Debug volume mount issues:

```bash
# Why is volume not mounting?
kubectl explain pod.spec.volumes.configMap.optional
kubectl explain pod.spec.volumes.secret.defaultMode

# Understand mount options
kubectl explain pod.spec.containers.volumeMounts.readOnly
```

## Network Configuration

Explore networking options:

```bash
# DNS and hostname
kubectl explain pod.spec.hostname
kubectl explain pod.spec.subdomain
kubectl explain pod.spec.dnsPolicy
kubectl explain pod.spec.dnsConfig

# Host networking
kubectl explain pod.spec.hostNetwork
kubectl explain pod.spec.hostIPC
kubectl explain pod.spec.hostPID

# Container ports
kubectl explain pod.spec.containers.ports
kubectl explain pod.spec.containers.ports.containerPort
kubectl explain pod.spec.containers.ports.protocol
```

## Scheduling and Node Selection

Understand pod placement:

```bash
# Node selection
kubectl explain pod.spec.nodeSelector
kubectl explain pod.spec.nodeName
kubectl explain pod.spec.affinity

# Tolerations for taints
kubectl explain pod.spec.tolerations
kubectl explain pod.spec.tolerations.key
kubectl explain pod.spec.tolerations.operator
kubectl explain pod.spec.tolerations.effect

# Priority
kubectl explain pod.spec.priority
kubectl explain pod.spec.priorityClassName
```

Debug scheduling issues:

```bash
# Pod won't schedule, check constraints
kubectl explain pod.spec.affinity.nodeAffinity
kubectl explain pod.spec.affinity.podAffinity
kubectl explain pod.spec.affinity.podAntiAffinity

# Check topology spread
kubectl explain pod.spec.topologySpreadConstraints
```

## Using Recursive Flag

See complete structure at once:

```bash
# Show all pod spec fields
kubectl explain pod.spec --recursive

# Show container spec
kubectl explain pod.spec.containers --recursive | less

# Find specific fields
kubectl explain pod.spec --recursive | grep -i "timeout"
kubectl explain pod.spec --recursive | grep -i "period"
```

This is useful for discovering available options:

```bash
# What probe options exist?
kubectl explain pod.spec.containers.livenessProbe --recursive

# Output includes:
httpGet      <Object>
  host       <string>
  httpHeaders        <[]Object>
  path       <string>
  port       <string>
  scheme     <string>
exec <Object>
  command    <[]string>
tcpSocket    <Object>
  host       <string>
  port       <string>
initialDelaySeconds  <integer>
periodSeconds        <integer>
timeoutSeconds       <integer>
failureThreshold     <integer>
successThreshold     <integer>
```

## Exploring Init Containers

Understand init container configuration:

```bash
# Init containers
kubectl explain pod.spec.initContainers

# Same fields as regular containers
kubectl explain pod.spec.initContainers.command
kubectl explain pod.spec.initContainers.env
kubectl explain pod.spec.initContainers.volumeMounts
```

## Service Account and RBAC

Understand service account configuration:

```bash
# Service accounts
kubectl explain pod.spec.serviceAccount
kubectl explain pod.spec.serviceAccountName
kubectl explain pod.spec.automountServiceAccountToken

# Image pull secrets
kubectl explain pod.spec.imagePullSecrets
```

## Environment Variables

Explore environment variable options:

```bash
# Environment configuration
kubectl explain pod.spec.containers.env

# Value from sources
kubectl explain pod.spec.containers.env.valueFrom
kubectl explain pod.spec.containers.env.valueFrom.configMapKeyRef
kubectl explain pod.spec.containers.env.valueFrom.secretKeyRef
kubectl explain pod.spec.containers.env.valueFrom.fieldRef
kubectl explain pod.spec.containers.env.valueFrom.resourceFieldRef

# Environment from
kubectl explain pod.spec.containers.envFrom
kubectl explain pod.spec.containers.envFrom.configMapRef
kubectl explain pod.spec.containers.envFrom.secretRef
```

## Image Configuration

Understand image-related fields:

```bash
# Image specification
kubectl explain pod.spec.containers.image
kubectl explain pod.spec.containers.imagePullPolicy

# Debug image pull issues
kubectl explain pod.spec.imagePullSecrets
```

## Lifecycle Hooks

Explore container lifecycle options:

```bash
# Lifecycle hooks
kubectl explain pod.spec.containers.lifecycle
kubectl explain pod.spec.containers.lifecycle.postStart
kubectl explain pod.spec.containers.lifecycle.preStop

# Hook handlers
kubectl explain pod.spec.containers.lifecycle.postStart.exec
kubectl explain pod.spec.containers.lifecycle.postStart.httpGet
kubectl explain pod.spec.containers.lifecycle.postStart.tcpSocket
```

## Creating Helper Functions

Make explain more accessible:

```bash
# Add to .bashrc or .zshrc
kexplain() {
  kubectl explain "$@" | less
}

# Search for fields
ksearch() {
  RESOURCE=$1
  PATTERN=$2
  kubectl explain $RESOURCE --recursive | grep -i "$PATTERN"
}

# Usage:
kexplain pod.spec.containers.resources
ksearch pod "timeout"
```

More advanced helpers:

```bash
# Find all fields matching a pattern
kfind() {
  kubectl explain "$1" --recursive | grep -B 1 -i "$2"
}

# Show field with examples
khelp() {
  echo "=== Field Documentation ==="
  kubectl explain "$1"
  echo ""
  echo "=== Example from Running Pods ==="
  kubectl get pods -o yaml | grep -A 5 -B 2 "$(echo $1 | awk -F. '{print $NF}')" | head -20
}

# Usage:
kfind pod.spec "memory"
khelp pod.spec.containers.resources.limits
```

## Comparing API Versions

Check differences between API versions:

```bash
# Default version
kubectl explain deployment

# Specific version
kubectl explain deployment --api-version=apps/v1
kubectl explain deployment --api-version=extensions/v1beta1

# Compare fields between versions
diff <(kubectl explain deployment --api-version=apps/v1 --recursive) \
     <(kubectl explain deployment --api-version=apps/v1beta1 --recursive)
```

## Practical Debugging Scenarios

### Scenario 1: Pod Stuck in Pending

```bash
# What scheduling options are available?
kubectl explain pod.spec.nodeSelector
kubectl explain pod.spec.tolerations
kubectl explain pod.spec.affinity

# Check actual pod configuration
kubectl get pod mypod -o yaml | grep -A 10 "tolerations:"
```

### Scenario 2: Container Keeps Restarting

```bash
# Understand restart policy
kubectl explain pod.spec.restartPolicy

# Check probe configurations
kubectl explain pod.spec.containers.livenessProbe
kubectl explain pod.spec.containers.startupProbe

# What's the default behavior?
kubectl explain pod.spec.containers.livenessProbe.failureThreshold
kubectl explain pod.spec.containers.livenessProbe.periodSeconds
```

### Scenario 3: Permission Denied Errors

```bash
# Understand security context
kubectl explain pod.spec.securityContext.runAsUser
kubectl explain pod.spec.securityContext.runAsGroup
kubectl explain pod.spec.securityContext.fsGroup

# Check container-level security
kubectl explain pod.spec.containers.securityContext.allowPrivilegeEscalation
kubectl explain pod.spec.containers.securityContext.readOnlyRootFilesystem
```

### Scenario 4: Resource Constraints

```bash
# Understand resource specifications
kubectl explain pod.spec.containers.resources.requests
kubectl explain pod.spec.containers.resources.limits

# What happens with QoS?
kubectl explain pod.status.qosClass
```

## Integration with Documentation

kubectl explain pulls from the same API schema as official documentation:

```bash
# Find field type and description
kubectl explain pod.spec.containers.resources.limits

# Output shows structure:
KIND:     Pod
VERSION:  v1

RESOURCE: limits <map[string]string>

DESCRIPTION:
     Limits describes the maximum amount of compute resources allowed.
```

This helps when API documentation is inaccessible or you need quick reference.

## Conclusion

kubectl explain is an indispensable tool for understanding Kubernetes API resources during debugging. It provides instant access to field documentation, types, and descriptions without leaving the terminal.

By mastering explain, you can quickly understand configuration options, discover available fields, and troubleshoot issues more effectively. Combine it with kubectl get and kubectl describe for a complete debugging workflow that doesn't require external documentation.
