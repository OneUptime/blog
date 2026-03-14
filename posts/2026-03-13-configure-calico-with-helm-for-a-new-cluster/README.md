# How to Configure Calico with Helm for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, Helm

Description: Learn how to configure Calico installation options using Helm values and the Tigera Operator Installation CRD.

---

## Introduction

When installing Calico via Helm, configuration is provided through Helm values and through the Tigera Operator's Installation CRD after deployment. The Helm chart itself handles deploying the Operator, while the Operator uses Installation and APIServer custom resources to configure and manage Calico's networking components.

This two-layer configuration model - Helm values for the Operator, Installation CR for Calico itself - is powerful but requires understanding which settings belong at which layer. Network CIDR, encapsulation mode, and component variants are configured in the Installation CR. Operator deployment settings like replica count and node selectors are configured in Helm values.

This guide covers both Helm values customization and Installation CR configuration for a new Calico deployment, giving you full control over the networking setup.

## Prerequisites

- Kubernetes cluster with Helm v3
- Tigera Operator installed via Helm (or ready to install)
- kubectl configured

## Step 1: Inspect Available Helm Values

```bash
helm show values projectcalico/tigera-operator --version v3.27.0 > calico-values.yaml
```

Review the values file to understand configurable options.

## Step 2: Create a Custom Values File

```yaml
# custom-calico-values.yaml
installation:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: IPIP
      natOutgoing: Enabled
      nodeSelector: all()
```

Save this as `custom-calico-values.yaml`.

## Step 3: Install Calico with Custom Values

```bash
helm install calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator \
  --create-namespace \
  --values custom-calico-values.yaml
```

## Step 4: View and Modify the Installation CR

After installation, the Operator creates an Installation CR:

```bash
kubectl get installation default -o yaml
```

Modify it to change Calico settings:

```bash
kubectl patch installation default --type merge --patch '{
  "spec": {
    "calicoNetwork": {
      "ipPools": [{
        "cidr": "192.168.0.0/16",
        "encapsulation": "VXLANCrossSubnet",
        "natOutgoing": "Enabled",
        "nodeSelector": "all()"
      }]
    }
  }
}'
```

## Step 5: Configure the APIServer CR

Enable Calico's API server for calicoctl integration:

```bash
kubectl apply -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
EOF
```

## Step 6: Check Operator Reconciliation Status

```bash
kubectl get tigerastatus
kubectl get installation default -o yaml | grep -A5 status
```

## Step 7: Verify Applied Configuration

```bash
kubectl get pods -n calico-system
calicoctl get ippool -o yaml
```

## Conclusion

You have configured Calico via Helm using custom values and the Tigera Operator Installation CR. This two-layer configuration approach separates Operator deployment concerns from Calico networking configuration, providing a clean and maintainable structure for production Calico deployments managed with Helm.
