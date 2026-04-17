# How to Deploy ClickHouse on Crossplane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Crossplane, Kubernetes, Infrastructure as Code, DevOps

Description: Learn how to provision ClickHouse infrastructure on AWS using Crossplane managed resources and Compositions from within a Kubernetes cluster.

---

## What Is Crossplane

Crossplane is a Kubernetes extension that lets you provision and manage cloud infrastructure using Kubernetes custom resources. Instead of running separate Terraform or CDK pipelines, you apply Crossplane manifests with `kubectl` and the operator reconciles the desired state in your cloud provider.

## Prerequisites

Install Crossplane and the AWS provider:

```bash
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane crossplane-stable/crossplane -n crossplane-system --create-namespace

kubectl apply -f - <<'EOF'
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.21.2
EOF
```

## AWS Provider Credentials

```bash
kubectl create secret generic aws-secret \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.ini
```

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: creds
```

## Security Group Resource

```yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroup
metadata:
  name: clickhouse-sg
spec:
  forProvider:
    region: us-east-1
    description: ClickHouse security group
    vpcIdRef:
      name: my-vpc
  providerConfigRef:
    name: default
```

## EC2 Instance Managed Resource

```yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: clickhouse-node-1
spec:
  forProvider:
    region: us-east-1
    ami: ami-0c55b159cbfafe1f0
    instanceType: m6i.2xlarge
    vpcSecurityGroupIdRefs:
      - name: clickhouse-sg
    userData: |
      #!/bin/bash
      apt-get update
      apt-get install -y apt-transport-https ca-certificates curl gnupg
      curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=$(dpkg --print-architecture)] https://packages.clickhouse.com/deb stable main" > /etc/apt/sources.list.d/clickhouse.list
      apt-get update
      apt-get install -y clickhouse-server clickhouse-client
      systemctl enable --now clickhouse-server
    tags:
      Name: clickhouse-node-1
      Role: clickhouse
  providerConfigRef:
    name: default
```

## Crossplane Composition for Reuse

A Composition wraps EC2 + SecurityGroup into a reusable `ClickHouseCluster` XRD so teams can provision clusters with a simple claim.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xclickhouseclusters.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XClickHouseCluster
    plural: xclickhouseclusters
  claimNames:
    kind: ClickHouseCluster
    plural: clickhouseclusters
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                nodeCount:
                  type: integer
                  default: 1
```

## Applying a Cluster Claim

```yaml
apiVersion: platform.example.com/v1alpha1
kind: ClickHouseCluster
metadata:
  name: analytics-cluster
  namespace: data-platform
spec:
  nodeCount: 3
```

## Summary

Crossplane brings cloud infrastructure provisioning into the Kubernetes control plane using CRDs and controllers. Provision ClickHouse EC2 instances and security groups as managed resources with `kubectl apply`. Build Compositions and XRDs to create higher-level abstractions that platform teams expose to application developers as simple claims.
