# How to Set Up Multi-Tenant SaaS Platform on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Tenant, SaaS, Kubernetes, Isolation, Namespace

Description: A guide to building a multi-tenant SaaS platform on Rancher, covering tenant isolation, resource quotas, network policies, and self-service provisioning.

## Overview

Building a multi-tenant SaaS platform on Kubernetes requires robust isolation between tenants, self-service provisioning, resource governance, and scalability. Rancher's Projects, namespace-based isolation, RBAC, and resource quotas provide the foundation for multi-tenancy. This guide covers designing and implementing a production-grade multi-tenant SaaS platform on Rancher.

## Multi-Tenancy Architecture

```text
Rancher Multi-Tenant SaaS Platform
├── Shared Infrastructure Cluster
│   ├── Ingress Controller (nginx)
│   ├── Cert Manager
│   └── Monitoring Stack

├── Per-Tier Application Clusters
│   ├── Starter Tier Cluster
│   ├── Professional Tier Cluster
│   └── Enterprise Tier Cluster

└── Per-Tenant Isolation
    ├── Tenant A: Namespace isolation
    ├── Tenant B: Namespace isolation
    └── Tenant C: Dedicated cluster (enterprise tier)
```

## Tenant Isolation Models

### Model 1: Namespace Isolation (Starter/Pro)

```yaml
# Create tenant namespace with labels

apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    tenant: acme-corp
    tier: professional
    billing-plan: pro-2026
---
# Resource quota per tenant
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme-corp
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    persistentvolumeclaims: "10"
    services.loadbalancers: "1"
    pods: "50"
---
# LimitRange for default limits
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limits
  namespace: tenant-acme-corp
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
```

### Network Isolation Between Tenants

```yaml
# Default deny all - with a NetworkPolicy-capable CNI, tenants cannot communicate with each other
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only accept traffic from the ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
    # Internal communication within namespace
    - from:
        - podSelector: {}
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    # Allow access to shared services (monitoring, logging)
    - to:
        - namespaceSelector:
            matchLabels:
              zone: shared-services
    # Allow internal namespace communication
    - to:
        - podSelector: {}
```

## Self-Service Tenant Provisioning API

```python
#!/usr/bin/env python3
# tenant-provisioner.py - Called by your SaaS onboarding flow

import json
import subprocess
from typing import Dict

import yaml

class TenantProvisioner:
    def __init__(self, rancher_client, cluster_id: str):
        self.rancher = rancher_client
        self.cluster_id = cluster_id

    def provision_tenant(self, tenant_config: Dict) -> Dict:
        """Provision a new SaaS tenant"""
        tenant_id = tenant_config['id']
        plan = tenant_config['plan']   # starter, professional, enterprise
        namespace = f"tenant-{tenant_id}"

        print(f"Provisioning tenant: {tenant_id} on plan: {plan}")

        # Create namespace
        self._create_namespace(namespace, tenant_config)

        # Apply resource quota based on plan
        self._apply_quota(namespace, plan)

        # Apply network policies
        self._apply_network_policies(namespace)

        # Create tenant service account
        sa_token = self._create_service_account(namespace, tenant_id)

        # Create ingress for tenant
        self._create_ingress(namespace, tenant_config)

        return {
            'tenant_id': tenant_id,
            'namespace': namespace,
            'kubeconfig': self._generate_kubeconfig(namespace, sa_token, tenant_id)
        }

    def _apply_manifest(self, manifest: Dict):
        subprocess.run(
            ['kubectl', 'apply', '-f', '-'],
            input=yaml.safe_dump(manifest, sort_keys=False),
            text=True,
            check=True
        )

    def _create_namespace(self, namespace: str, tenant_config: Dict):
        manifest = {
            'apiVersion': 'v1',
            'kind': 'Namespace',
            'metadata': {
                'name': namespace,
                'labels': {
                    'tenant': tenant_config['id'],
                    'tier': tenant_config['plan'],
                    'billing-account': tenant_config.get('billing_id', '')
                }
            }
        }
        self._apply_manifest(manifest)

    def _apply_quota(self, namespace: str, plan: str):
        quotas = {
            'starter': {'cpu': '1', 'memory': '2Gi', 'pods': '10'},
            'professional': {'cpu': '4', 'memory': '8Gi', 'pods': '50'},
            'enterprise': {'cpu': '16', 'memory': '32Gi', 'pods': '200'}
        }
        quota = quotas.get(plan, quotas['starter'])

        manifest = {
            'apiVersion': 'v1',
            'kind': 'ResourceQuota',
            'metadata': {'name': 'tenant-quota', 'namespace': namespace},
            'spec': {
                'hard': {
                    'requests.cpu': quota['cpu'],
                    'requests.memory': quota['memory'],
                    'pods': quota['pods']
                }
            }
        }
        self._apply_manifest(manifest)

    def _apply_network_policies(self, namespace: str):
        manifest = {
            'apiVersion': 'networking.k8s.io/v1',
            'kind': 'NetworkPolicy',
            'metadata': {'name': 'tenant-isolation', 'namespace': namespace},
            'spec': {
                'podSelector': {},
                'policyTypes': ['Ingress', 'Egress'],
                'ingress': [
                    {
                        'from': [{
                            'namespaceSelector': {
                                'matchLabels': {
                                    'kubernetes.io/metadata.name': 'ingress-nginx'
                                }
                            },
                            'podSelector': {
                                'matchLabels': {
                                    'app.kubernetes.io/name': 'ingress-nginx'
                                }
                            }
                        }]
                    },
                    {'from': [{'podSelector': {}}]}
                ],
                'egress': [
                    {
                        'to': [{
                            'namespaceSelector': {
                                'matchLabels': {
                                    'kubernetes.io/metadata.name': 'kube-system'
                                }
                            }
                        }],
                        'ports': [
                            {'port': 53, 'protocol': 'UDP'},
                            {'port': 53, 'protocol': 'TCP'}
                        ]
                    },
                    {
                        'to': [{
                            'namespaceSelector': {
                                'matchLabels': {'zone': 'shared-services'}
                            }
                        }]
                    },
                    {'to': [{'podSelector': {}}]}
                ]
            }
        }
        self._apply_manifest(manifest)

    def _create_service_account(self, namespace: str, tenant_id: str) -> str:
        service_account_name = f"{tenant_id}-admin"

        self._apply_manifest({
            'apiVersion': 'v1',
            'kind': 'ServiceAccount',
            'metadata': {'name': service_account_name, 'namespace': namespace}
        })
        self._apply_manifest({
            'apiVersion': 'rbac.authorization.k8s.io/v1',
            'kind': 'RoleBinding',
            'metadata': {'name': f"{service_account_name}-binding", 'namespace': namespace},
            'subjects': [{
                'kind': 'ServiceAccount',
                'name': service_account_name,
                'namespace': namespace
            }],
            'roleRef': {
                'apiGroup': 'rbac.authorization.k8s.io',
                'kind': 'ClusterRole',
                'name': 'admin'
            }
        })

        token = subprocess.run(
            ['kubectl', '-n', namespace, 'create', 'token', service_account_name, '--duration', '24h'],
            capture_output=True,
            text=True,
            check=True
        )
        return token.stdout.strip()

    def _generate_kubeconfig(self, namespace: str, sa_token: str, tenant_id: str) -> str:
        current_config = subprocess.run(
            ['kubectl', 'config', 'view', '--minify', '--raw', '-o', 'json'],
            capture_output=True,
            text=True,
            check=True
        )
        config = json.loads(current_config.stdout)
        cluster_entry = config['clusters'][0]
        cluster = {'server': cluster_entry['cluster']['server']}

        if 'certificate-authority-data' in cluster_entry['cluster']:
            cluster['certificate-authority-data'] = cluster_entry['cluster']['certificate-authority-data']
        elif cluster_entry['cluster'].get('insecure-skip-tls-verify'):
            cluster['insecure-skip-tls-verify'] = True

        service_account_name = f"{tenant_id}-admin"
        kubeconfig = {
            'apiVersion': 'v1',
            'kind': 'Config',
            'clusters': [{
                'name': cluster_entry['name'],
                'cluster': cluster
            }],
            'contexts': [{
                'name': f"{tenant_id}-context",
                'context': {
                    'cluster': cluster_entry['name'],
                    'namespace': namespace,
                    'user': service_account_name
                }
            }],
            'current-context': f"{tenant_id}-context",
            'users': [{
                'name': service_account_name,
                'user': {'token': sa_token}
            }]
        }
        return yaml.safe_dump(kubeconfig, sort_keys=False)

    def _create_ingress(self, namespace: str, tenant_config: Dict):
        """Create tenant subdomain ingress"""
        tenant_id = tenant_config['id']
        manifest = {
            'apiVersion': 'networking.k8s.io/v1',
            'kind': 'Ingress',
            'metadata': {
                'name': 'tenant-ingress',
                'namespace': namespace,
                'annotations': {
                    'nginx.ingress.kubernetes.io/proxy-body-size': '50m',
                    'cert-manager.io/cluster-issuer': 'letsencrypt-prod'
                }
            },
            'spec': {
                'ingressClassName': 'nginx',
                'tls': [{
                    'hosts': [f"{tenant_id}.app.saas.example.com"],
                    'secretName': f"{namespace}-tls"
                }],
                'rules': [{
                    'host': f"{tenant_id}.app.saas.example.com",
                    'http': {
                        'paths': [{
                            'path': '/',
                            'pathType': 'Prefix',
                            'backend': {
                                'service': {
                                    'name': 'webapp',
                                    'port': {'number': 8080}
                                }
                            }
                        }]
                    }
                }]
            }
        }
        self._apply_manifest(manifest)
```

## Rancher Projects for Tenant Grouping

```bash
# Create Rancher Project for tenant tier grouping
kubectl create -f - <<EOF
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: ${CLUSTER_ID}
spec:
  clusterName: ${CLUSTER_ID}
  displayName: Professional Tenants
  resourceQuota:
    limit:
      limitsCpu: "100"
      limitsMemory: "200Gi"
  namespaceDefaultResourceQuota:
    limit:
      limitsCpu: "8"
      limitsMemory: "16Gi"
  containerDefaultResourceLimit:
    limitsCpu: "500m"
    limitsMemory: "512Mi"
    requestsCpu: "100m"
    requestsMemory: "128Mi"
EOF
```

## Billing Integration

```yaml
# Label namespaces with billing metadata for cost tracking
# These labels are read by your cost management tool (Kubecost/OpenCost)
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    billing-tenant-id: "t-12345"
    billing-plan: "professional"
    billing-cycle: "monthly"
    cost-center: "saas-platform"
```

## Conclusion

Building a multi-tenant SaaS platform on Rancher requires careful design of namespace isolation, network policies, resource quotas, and self-service provisioning workflows. Rancher's Projects provide organizational grouping, namespace-level ResourceQuotas enforce tenant limits, and NetworkPolicies enforced by a compatible CNI plugin prevent cross-tenant traffic. Automating tenant provisioning via API ensures consistent configuration and eliminates manual errors. As your SaaS platform grows, consider moving enterprise tier tenants to dedicated clusters for stronger isolation and higher resource guarantees.
