# Integrating Rancher with Aqua Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Aqua security, Kubernetes, Container Security, DevSecOps

Description: Learn how to integrate Aqua Security with Rancher-managed Kubernetes clusters to enforce container image scanning, runtime protection, and compliance policies.

## What is Aqua Security?

Aqua Security is a cloud-native security platform that provides:

- **Image scanning** - Detect vulnerabilities in container images before deployment
- **Runtime protection** - Monitor and block suspicious container behavior
- **Compliance** - Enforce CIS benchmarks and custom security policies
- **Network policies** - Micro-segmentation and firewall rules for containers

## Architecture Overview

```text
Rancher → Kubernetes Cluster → Aqua Server (Console/Gateway)
                              ├→ Aqua Enforcer DaemonSet
                              ├→ Aqua KubeEnforcer
                              └→ Image Registry → Aqua Scanner
```

## Prerequisites

- Rancher 2.6+ with a managed Kubernetes cluster
- Aqua Security self-hosted platform or an existing Aqua SaaS tenant
- `kubectl` access to the cluster
- Aqua license and credentials

## Step 1: Create an Aqua Namespace

```bash
kubectl create namespace aqua
```

## Step 2: Create Aqua Credentials Secret

```bash
kubectl create secret docker-registry aqua-registry-secret \
  --docker-server=registry.aquasec.com \
  --docker-username=your-aqua-username \
  --docker-password=your-aqua-password \
  --namespace aqua
```

## Step 3: Deploy Aqua Server via Helm (Self-Hosted Only)

If you use Aqua SaaS, skip this step. In Rancher, navigate to **Apps** or use Helm directly:

```bash
helm repo add aqua-helm https://helm.aquasec.com
helm repo update

helm upgrade --install aqua aqua-helm/server \
  --namespace aqua \
  --set imageCredentials.create=false \
  --set global.platform=rancher \
  --set global.db.external.enabled=true \
  --set global.db.external.host=your-postgres-host \
  --set global.db.external.port=5432 \
  --set global.db.external.name=aqua \
  --set global.db.external.user=aqua \
  --set global.db.external.password=your-db-password \
  --set global.db.external.auditHost=your-postgres-host \
  --set global.db.external.auditPort=5432 \
  --set global.db.external.auditName=slk_audit \
  --set global.db.external.auditUser=aqua \
  --set global.db.external.auditPassword=your-db-password
```

## Step 4: Deploy Aqua Enforcers

Enforcers run as DaemonSets on every node to provide runtime protection:

```bash
helm upgrade --install aqua-enforcer aqua-helm/enforcer \
  --namespace aqua \
  --set global.platform=rancher \
  --set enforcerToken=your-enforcer-token \
  --set global.gateway.address=aqua-gateway-svc.aqua \
  --set global.gateway.port=8443
```

For Aqua SaaS, add `--set serviceAccount.create=true` and replace the gateway address and port with the SaaS gateway values provided by Aqua.

## Step 5: Configure Image Assurance Policies

In the Aqua Security console, create or update an Image Assurance policy with rules such as:

1. Block images with critical CVEs
2. Block images with no scan
3. Require specific base images

## Step 6: Deploy Aqua KubeEnforcer for Admission Control

Aqua KubeEnforcer deploys the admission webhooks that block non-compliant pods at deployment time:

```bash
helm upgrade --install kube-enforcer aqua-helm/kube-enforcer \
  --namespace aqua \
  --set global.platform=rancher \
  --set certsSecret.autoGenerate=true \
  --set aquaSecret.kubeEnforcerToken=your-kube-enforcer-token
```

For Aqua SaaS, also set `global.gateway.address` to the SaaS gateway host and `global.gateway.port=443`.

## Viewing Scan Results

After integration, review scan and policy results in the Aqua console and use Rancher to inspect the affected workloads:

1. Open the Aqua console and review the relevant image or workload findings
2. In Rancher, go to your cluster → **Workloads**
3. Correlate the affected workload with the Aqua finding or policy action

## Runtime Policies

Create a runtime policy in the Aqua console:

1. Go to **Workload Protection → Policies → Runtime Policies**
2. Add a **Container Runtime Policy**
3. Enable controls such as **Block Container Exec**, **Drift Prevention**, and **Block Fileless Execution**

## Monitoring and Alerting

Configure Aqua to send alerts to Slack or email:

1. Add a Slack or email integration in the Aqua console
2. Configure alert severity thresholds

## Best Practices

1. **Scan images before deployment** using Aqua scanners or registry integrations in CI/CD
2. **Enable admission control** to prevent unscanned or non-compliant images from running
3. **Use least-privilege runtime policies** - block container exec in production
4. **Use Rancher RBAC** to limit who can manage the Aqua deployment in the cluster
5. **Set up alerts** for critical CVEs and policy violations

## Conclusion

Integrating Aqua Security with Rancher provides a comprehensive security layer for your Kubernetes workloads. From image scanning in CI/CD to runtime behavioral monitoring, Aqua enforces security controls at every stage of the container lifecycle without disrupting developer workflows.
