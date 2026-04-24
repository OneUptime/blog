# How to Configure Rancher with Aqua Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Aqua-security, Container-security, Kubernetes, Vulnerability-Scanning

Description: A step-by-step guide to deploying and configuring Aqua Security on Rancher-managed Kubernetes clusters for container image scanning, runtime protection, and compliance.

## Overview

Aqua Security is a comprehensive Cloud-Native Application Protection Platform (CNAPP) that provides container image scanning, Kubernetes runtime security, network policies, and compliance reporting. This guide covers deploying the Aqua Platform on Rancher-managed clusters, configuring image scanning, and setting up runtime enforcement.

## Prerequisites

- Aqua Security license and account at https://portal.aquasec.com
- Rancher-managed RKE2 or K3s cluster
- External PostgreSQL database for production deployments (the chart can also deploy the bundled database for POCs and testing)
- TLS certificate for Aqua web UI if you plan to expose it over HTTPS

## Step 1: Deploy Aqua Server

```bash
# Add Aqua Helm repository

helm repo add aqua-helm https://helm.aquasec.com
helm repo update

# Create namespace and registry secret
kubectl create namespace aqua
kubectl create secret docker-registry aqua-registry-secret \
  --namespace aqua \
  --docker-server=registry.aquasec.com \
  --docker-username="${AQUA_REGISTRY_USERNAME}" \
  --docker-password="${AQUA_REGISTRY_PASSWORD}"
```

```yaml
# aqua-server-values.yaml
imageCredentials:
  create: false
  name: aqua-registry-secret

admin:
  token: "${AQUA_LICENSE_TOKEN}"
  password: "${AQUA_ADMIN_PASSWORD}"

global:
  platform: rancher
  db:
    external:
      enabled: true
      name: aqua
      host: postgres.aqua.svc
      port: 5432
      user: aqua
      password: "${AQUA_DB_PASSWORD}"

web:
  image:
    repository: console
    tag: "2022.4"
  service:
    type: LoadBalancer

gateway:
  service:
    type: LoadBalancer
```

```bash
helm upgrade --install aqua aqua-helm/server \
  --namespace aqua \
  --values aqua-server-values.yaml
```

## Step 2: Deploy Aqua Enforcers on Each Cluster

On each protected cluster, create the `aqua` namespace and the same `aqua-registry-secret` image pull secret, then install the enforcer chart. The Aqua Enforcer runs as a DaemonSet and provides runtime security:

```bash
# Create an enforcer token in the Aqua UI first.
# Use aqua-gateway-svc.aqua for same-cluster installs, or an externally reachable
# gateway DNS name / load balancer address for remote Rancher-managed clusters.

helm upgrade --install aqua-enforcer aqua-helm/enforcer \
  --namespace aqua \
  --set global.platform=rancher \
  --set enforcerToken="${AQUA_ENFORCER_TOKEN}" \
  --set global.gateway.address="${AQUA_GATEWAY_ADDRESS}" \
  --set global.gateway.port=8443
```

```bash
# Enforcer DaemonSet verification
kubectl get daemonset aqua-enforcer-ds -n aqua
kubectl get pods -n aqua -l aqua.component=enforcer
```

## Step 3: Configure Image Scanning

### Registry Integration

Deploy Aqua Scanner if you want Aqua to scan images and registries from within the platform:

```bash
helm upgrade --install scanner aqua-helm/scanner \
  --namespace aqua \
  --set platform=rancher \
  --set imageCredentials.create=false \
  --set imageCredentials.name=aqua-registry-secret \
  --set user="${AQUA_SCANNER_USERNAME}" \
  --set password="${AQUA_SCANNER_PASSWORD}"
```

### CI/CD Pipeline Integration

```yaml
# GitHub Actions: Scan image with Trivy before push
name: Build and Security Scan
on: [push]

jobs:
  build-and-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t docker.io/my-organization/myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@0.35.0
        with:
          image-ref: docker.io/my-organization/myapp:${{ github.sha }}
          format: table
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: os,library
          severity: CRITICAL,HIGH
```

## Step 4: Configure Runtime Policies

```yaml
# Configure a runtime policy in the Aqua UI:
# Policies → Runtime Policies
#
# Recommended production controls:
# - Runtime mode: Enforce
# - Block privileged containers
# - Block containers running as root
# - Allow only approved registries/images
# - Enable drift prevention where appropriate
# - Restrict access to the cloud metadata service when not required
```

## Step 5: Kubernetes Assurance Policies

```bash
# KubeEnforcer is the component that enforces Kubernetes Assurance policies.
# Use aqua-gateway-svc.aqua for same-cluster installs, or an externally reachable
# gateway DNS name / load balancer address for remote Rancher-managed clusters.
helm upgrade --install kube-enforcer aqua-helm/kube-enforcer \
  --namespace aqua \
  --set global.platform=rancher \
  --set aquaSecret.kubeEnforcerToken="${AQUA_KUBEENFORCER_TOKEN}" \
  --set global.gateway.address="${AQUA_GATEWAY_ADDRESS}" \
  --set global.gateway.port=8443 \
  --set certsSecret.autoGenerate=true
```

```yaml
# Configure the assurance policy in the Aqua UI after KubeEnforcer is deployed.
# Example checks:
# - Pod Security Admission level: restricted
# - Container runs as non-root
# - No host namespace sharing
# - Resource limits required
# - Image from approved registry only
# - No latest tag
```

## Step 6: Configure NVD/CVE Feeds

Aqua continuously updates its vulnerability data. Verify feed health and last update time in the Aqua UI under the administration settings for the deployment.

## Step 7: Compliance Reporting

Generate CIS Docker or Kubernetes benchmark reports from the Aqua UI after Scanner and KubeEnforcer data is available, then export the report for sharing or audit evidence.

## Step 8: Alert Integration

Configure Aqua alert integrations from the Aqua UI under Administration → Integrations. Common targets include webhook endpoints, Slack, SIEMs, and ticketing systems.

## Conclusion

Integrating Aqua Security with Rancher provides enterprise-grade container security across the full application lifecycle. Image scanning in CI/CD pipelines catches vulnerabilities before deployment, Aqua Enforcers on Rancher-managed clusters provide runtime protection, and compliance reporting keeps your security posture visible. For organizations using Rancher without the SUSE stack (NeuVector), Aqua Security is a strong commercial alternative that covers both container and cloud security requirements.
