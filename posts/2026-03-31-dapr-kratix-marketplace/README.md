# How to Use Dapr with Kratix Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kratix, Platform Engineering, Kubernetes, Promise

Description: Use Kratix Promises to provision Dapr-enabled microservice platforms as a service, enabling platform teams to deliver standardized Dapr configurations to development teams.

---

## Overview

Kratix is a framework for building internal developer platforms on Kubernetes using "Promises" - declarative API contracts. By creating a Dapr Promise in Kratix, platform teams can offer self-service Dapr environments to development teams, pre-configured with approved components, policies, and observability settings.

## Prerequisites

- Kratix installed on a platform cluster
- At least one worker cluster registered with Kratix
- Dapr Helm chart available
- kubectl configured

## Understanding Kratix Promises

A Kratix Promise consists of:
- `api`: The CRD that developers use to request resources
- `dependencies`: Base resources to install on worker clusters
- `workflows`: Pipeline steps executed when a developer makes a request

## Creating a Dapr Promise

Define the CRD that developers use to request Dapr environments:

```yaml
apiVersion: platform.kratix.io/v1alpha1
kind: Promise
metadata:
  name: dapr
  namespace: default
spec:
  api:
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: dapr-environments.marketplace.kratix.io
    spec:
      group: marketplace.kratix.io
      names:
        kind: DaprEnvironment
        plural: dapr-environments
      scope: Namespaced
      versions:
      - name: v1alpha1
        served: true
        storage: true
        schema:
          openAPIV3Schema:
            type: object
            properties:
              spec:
                type: object
                properties:
                  namespace:
                    type: string
                  haEnabled:
                    type: boolean
                    default: false
                  observabilityEnabled:
                    type: boolean
                    default: true
```

## Worker Cluster Resources

Define the base Dapr installation for all worker clusters:

```yaml
  dependencies:
  - apiVersion: v1
    kind: Namespace
    metadata:
      name: dapr-system
  - apiVersion: helm.cattle.io/v1
    kind: HelmChart
    metadata:
      name: dapr
      namespace: dapr-system
    spec:
      chart: dapr
      repo: https://dapr.github.io/helm-charts/
      version: "1.17.4"
      valuesContent: |-
        global:
          ha:
            enabled: false
          logAsJson: true
```

## Request Pipeline

Create the pipeline that provisions Dapr components per request:

```yaml
  workflows:
    resource:
      configure:
      - apiVersion: platform.kratix.io/v1alpha1
        kind: Pipeline
        metadata:
          name: dapr-namespace-provisioner
        spec:
          containers:
          - name: dapr-namespace-provisioner
            image: myregistry/dapr-provisioner:v1
            imagePullPolicy: Always
```

Pipeline script in the container:

```bash
#!/bin/bash
# Read the request
NAMESPACE=$(yq '.spec.namespace' /kratix/input/object.yaml)
HA_ENABLED=$(yq '.spec.haEnabled' /kratix/input/object.yaml)

# Generate Dapr component configuration
cat > /kratix/output/dapr-config.yaml << EOF
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: ${NAMESPACE}
spec:
  tracing:
    samplingRate: "1"
  mtls:
    enabled: true
EOF

echo "Dapr configuration generated for namespace ${NAMESPACE}"
```

## Developer Self-Service Request

Developers request a Dapr environment:

```yaml
apiVersion: marketplace.kratix.io/v1alpha1
kind: DaprEnvironment
metadata:
  name: my-team-dapr
  namespace: default
spec:
  namespace: my-team
  haEnabled: true
  observabilityEnabled: true
```

```bash
kubectl apply -f dapr-environment-request.yaml
kubectl get dapr-environments
```

## Summary

Kratix Promises enable platform teams to offer standardized Dapr environments as a self-service offering. Developers submit a simple request and receive a fully configured Dapr namespace with approved components, security policies, and observability - all managed through Kratix's GitOps-compatible framework.
