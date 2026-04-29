# How to Migrate Away from Deprecated Portainer Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Deprecation, Upgrade, Best Practice, DevOps

Description: A practical guide to migrating from deprecated Portainer features including OpenAMT, Nomad support, KaaS provisioning, and Kompose to modern alternatives.

---

As Portainer matures, features that didn't achieve wide adoption or that have better alternatives get deprecated and removed. This guide helps you plan migration paths away from deprecated and removed features so your upgrade to current Portainer versions goes smoothly.

## Inventory of Deprecated and Removed Features

| Feature | Deprecated In | Removed In | Alternative |
|---------|---------------|------------|-------------|
| OpenAMT integration | 2.36 | TBD | IPMI/BMC tools, PiKVM |
| Nomad support | 2.20 | 2.20 | Nomad UI, CLI, Levant |
| Kompose deployments | 2.15 | 2.17 | Native K8s manifests, Helm |
| KaaS cluster provisioning | 2.30 | TBD | eksctl, Terraform, Azure CLI, gcloud |

## Migration: From OpenAMT to IPMI/BMC

If you used OpenAMT for out-of-band device management:

```bash
# Test IPMI connectivity on a server

ipmitool -I lanplus -H 192.168.1.100 -U admin -P password chassis status

# Power cycle a server
ipmitool -I lanplus -H 192.168.1.100 -U admin -P password chassis power cycle

# Start a Serial-over-LAN console
ipmitool -I lanplus -H 192.168.1.100 -U admin -P password sol activate

# For modern servers, use Redfish API instead
curl -k -u admin:password \
  -X POST \
  -H 'Content-Type: application/json' \
  https://192.168.1.100/redfish/v1/Systems/1/Actions/ComputerSystem.Reset \
  -d '{"ResetType": "GracefulRestart"}'
```

## Migration: From Portainer Nomad Support to Native Nomad Tooling

If you used Portainer to manage Nomad clusters:

1. Access the Nomad web UI at `http://nomad-server:4646/ui`
2. Submit jobs via the Nomad CLI:

```bash
# Deploy a Nomad job
nomad job run nginx.nomad

# Check job status
nomad job status nginx

# View allocation logs
nomad alloc logs <alloc-id> nginx

# Stop a job
nomad job stop nginx
```

## Migration: From Kompose to Native Kubernetes Manifests

Replace Kompose-deployed workloads with proper Kubernetes resources:

```bash
# Step 1: Use Kompose to generate a starting point (external tool)
kompose convert -f docker-compose.yml

# Step 2: Add missing Kubernetes-native features to generated manifests
# - Resource requests and limits
# - Liveness and readiness probes
# - Security contexts
# - PersistentVolumeClaims for volumes

# Step 3: Deploy via Portainer's manifest feature
# Applications > Create from code > Manifest
# - Paste the manifest into the Web editor, or
# - Deploy it from a Git repository or URL
```

Example of improving a Kompose-generated Deployment:

```yaml
# Before (raw Kompose output):
spec:
  template:
    spec:
      containers:
        - name: webapp
          image: myapp:latest

# After (production-ready):
spec:
  template:
    spec:
      containers:
        - name: webapp
          image: myapp:1.2.3    # Pin version
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
```

## Migration: From KaaS Provisioning to CLI Tools

Replace Portainer KaaS provisioning with dedicated cluster creation tools:

```bash
# Amazon EKS with eksctl
eksctl create cluster \
  --name prod-cluster \
  --region us-west-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3

# Azure AKS with az CLI
az aks create \
  --resource-group my-rg \
  --name prod-cluster \
  --node-count 3 \
  --generate-ssh-keys

# Google GKE with gcloud
gcloud container clusters create prod-cluster \
  --location us-central1 \
  --num-nodes 3 \
  --machine-type e2-standard-2
```

After provisioning, add the cluster to Portainer:

1. Configure `kubectl` access for your provider:
   - AWS: `aws eks update-kubeconfig --region us-west-2 --name prod-cluster`
   - Azure: `az aks get-credentials --resource-group my-rg --name prod-cluster`
   - GKE: `gcloud container clusters get-credentials prod-cluster --location us-central1`
2. In Portainer: **Environments > Add environment > Kubernetes**
3. Select the **Agent** option and copy the generated install command
4. Run that command from a shell with cluster-admin `kubectl` access to the cluster, then complete the environment details back in Portainer

## Pre-Upgrade Checklist

Before upgrading Portainer to a release that deprecates or removes one of these features:

- [ ] Document all environments using deprecated features
- [ ] Test the migration path in a staging environment
- [ ] Verify application deployments work without the deprecated feature
- [ ] Update internal runbooks and documentation
- [ ] Schedule the upgrade during low-traffic maintenance windows

## Summary

Deprecated feature migrations require planning but are manageable with the right tooling. In most cases, the replacement tools (native Kubernetes manifests, Helm, eksctl, IPMI) are more capable than the features they replace - the deprecations represent Portainer focusing on its core strengths.
