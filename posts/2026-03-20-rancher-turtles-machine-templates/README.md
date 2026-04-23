# How to Configure CAPI Machine Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Machine Templates, Kubernetes, Infrastructure

Description: Create and manage Cluster API machine templates for defining infrastructure specifications for cluster nodes.

## Introduction

Configuring CAPI machine templates with Rancher Turtles means defining the provider-specific infrastructure templates that Cluster API uses for control plane and worker nodes. This guide provides a practical walkthrough using current Cluster API and CAPRKE2 resource shapes.

## Prerequisites

- Rancher Turtles installed and configured
- kubectl access to the management cluster
- Cluster API providers installed
- A compatible infrastructure provider installed for your environment; the example below uses the Docker provider

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. Machine templates are provider-specific resources such as `DockerMachineTemplate`, `AWSMachineTemplate`, or `VSphereMachineTemplate`. They are referenced from `RKE2ControlPlane.spec.machineTemplate.spec.infrastructureRef` for control plane nodes and from `MachineDeployment.spec.template.spec.infrastructureRef` for worker nodes. These templates are intended to be treated as immutable, so changes should be made by creating a new template and updating the reference.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Check installed CAPI providers managed by Rancher Turtles
kubectl get capiproviders.turtles-capi.cattle.io -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

The example below uses the Docker infrastructure provider. On AWS, Azure, or vSphere, replace `DockerCluster` and `DockerMachineTemplate` with the provider-specific cluster and machine template resources for that provider.

```yaml
# Example CAPI machine template configuration for Rancher Turtles
apiVersion: v1
kind: Namespace
metadata:
  name: capi-clusters
  labels:
    cluster-api.cattle.io/rancher-auto-import: "true"
---
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: example-cluster
  namespace: capi-clusters
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 10.45.0.0/16
    services:
      cidrBlocks:
        - 10.46.0.0/16
    serviceDomain: cluster.local
  controlPlaneRef:
    apiGroup: controlplane.cluster.x-k8s.io
    kind: RKE2ControlPlane
    name: example-cluster-control-plane
  infrastructureRef:
    apiGroup: infrastructure.cluster.x-k8s.io
    kind: DockerCluster
    name: example-cluster
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: DockerCluster
metadata:
  name: example-cluster
  namespace: capi-clusters
spec:
  loadBalancer:
    customHAProxyConfigTemplateRef:
      name: example-cluster-lb-config
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: RKE2ControlPlane
metadata:
  name: example-cluster-control-plane
  namespace: capi-clusters
spec:
  replicas: 1
  version: v1.34.6+rke2r3
  registrationMethod: control-plane-endpoint
  rolloutStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
  agentConfig: {}
  gzipUserData: false
  serverConfig:
    disableComponents:
      kubernetesComponents:
        - cloudController
  machineTemplate:
    spec:
      infrastructureRef:
        apiGroup: infrastructure.cluster.x-k8s.io
        kind: DockerMachineTemplate
        name: example-cluster-control-plane-template
      deletion:
        nodeDrainTimeoutSeconds: 120
        nodeVolumeDetachTimeoutSeconds: 300
        nodeDeletionTimeoutSeconds: 30
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: DockerMachineTemplate
metadata:
  name: example-cluster-control-plane-template
  namespace: capi-clusters
spec:
  template:
    spec:
      customImage: kindest/node:v1.34.6
      bootstrapTimeout: 15m
---
apiVersion: cluster.x-k8s.io/v1beta2
kind: MachineDeployment
metadata:
  name: example-cluster-workers
  namespace: capi-clusters
spec:
  clusterName: example-cluster
  replicas: 2
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: example-cluster
      nodepool: workers
  template:
    metadata:
      labels:
        cluster.x-k8s.io/cluster-name: example-cluster
        nodepool: workers
    spec:
      version: v1.34.6+rke2r3
      clusterName: example-cluster
      bootstrap:
        configRef:
          apiGroup: bootstrap.cluster.x-k8s.io
          kind: RKE2ConfigTemplate
          name: example-cluster-workers-bootstrap
      infrastructureRef:
        apiGroup: infrastructure.cluster.x-k8s.io
        kind: DockerMachineTemplate
        name: example-cluster-workers-template
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: DockerMachineTemplate
metadata:
  name: example-cluster-workers-template
  namespace: capi-clusters
spec:
  template:
    spec:
      customImage: kindest/node:v1.34.6
      bootstrapTimeout: 15m
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta2
kind: RKE2ConfigTemplate
metadata:
  name: example-cluster-workers-bootstrap
  namespace: capi-clusters
spec:
  template:
    spec:
      agentConfig: {}
      gzipUserData: false
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: example-cluster-lb-config
  namespace: capi-clusters
data:
  value: |-
    # generated by kind
    global
      log /dev/log local0
      log /dev/log local1 notice
      daemon

    resolvers docker
      nameserver dns 127.0.0.11:53

    defaults
      log global
      mode tcp
      option dontlognull
      timeout connect 5000
      timeout client 50000
      timeout server 50000
      default-server init-addr none

    frontend control-plane
      bind *:{{ .FrontendControlPlanePort }}
      {{ if .IPv6 -}}
      bind :::{{ .FrontendControlPlanePort }};
      {{- end }}
      default_backend kube-apiservers

    backend kube-apiservers
      option httpchk GET /healthz
      {{range $server, $backend := .BackendServers}}
      server {{ $server }} {{ JoinHostPort $backend.Address $.BackendControlPlanePort }} check check-ssl verify none resolvers docker resolve-prefer {{ if $.IPv6 -}} ipv6 {{- else -}} ipv4 {{- end }}
      {{- end}}

    frontend rke2-join
      bind *:9345
      {{ if .IPv6 -}}
      bind :::9345;
      {{- end }}
      default_backend rke2-servers

    backend rke2-servers
      option httpchk GET /v1-rke2/readyz
      http-check expect status 403
      {{range $server, $backend := .BackendServers}}
      server {{ $server }} {{ $backend.Address }}:9345 check check-ssl verify none
      {{- end}}
```

```bash
# Apply the configuration
kubectl apply -f cluster-config.yaml

# Monitor progress
kubectl get cluster example-cluster -n capi-clusters --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters -n capi-clusters

# Describe the cluster for detailed status
kubectl describe cluster example-cluster -n capi-clusters

# View the control plane, machine templates, and worker deployment
kubectl get rke2controlplanes.controlplane.cluster.x-k8s.io,dockermachinetemplates.infrastructure.cluster.x-k8s.io,machinedeployments.cluster.x-k8s.io -n capi-clusters

# Check Rancher import status
kubectl get clusters.management.cattle.io -A
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Verify the cluster appears in the list
3. Check cluster health indicators
4. Review node status and resource utilization

## Common Operations

```bash
# Scale worker nodes
kubectl scale machinedeployment example-cluster-workers --replicas=3 -n capi-clusters

# Create a new machine template revision and update the worker pool to use it
kubectl patch machinedeployment example-cluster-workers -n capi-clusters --type merge -p '{"spec":{"template":{"spec":{"infrastructureRef":{"apiGroup":"infrastructure.cluster.x-k8s.io","kind":"DockerMachineTemplate","name":"example-cluster-workers-template-v2"}}}}}'

# Get cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace capi-clusters > cluster-kubeconfig.yaml

# Test connectivity
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes

# Return to management cluster
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system   -l control-plane=controller-manager   --follow

# Check CAPI controller logs
kubectl logs -n cattle-capi-system   -l control-plane=controller-manager   --since=30m

# Check RKE2 control plane logs
kubectl logs -n rke2-control-plane-system   -l control-plane=controller-manager   --since=30m

# Get events for a cluster
kubectl get events -n capi-clusters   --field-selector involvedObject.name=example-cluster   --sort-by=.lastTimestamp
```

## Conclusion

How to Configure CAPI Machine Templates with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By defining provider-specific machine templates and referencing them from `RKE2ControlPlane` and `MachineDeployment`, you can control node sizing and images cleanly while letting Cluster API handle rollouts when those references change.
