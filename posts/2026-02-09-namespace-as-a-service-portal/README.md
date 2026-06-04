# How to Implement Namespace-as-a-Service Self-Service Portals on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Self-Service, Platform-Engineering

Description: Learn how to build self-service namespace provisioning portals that enable developers to request and manage Kubernetes namespaces with automated approval workflows, quotas, and governance policies.

---

Namespace-as-a-Service (NaaS) portals empower development teams to provision and manage their own Kubernetes namespaces without requiring direct cluster access or platform team intervention. By implementing self-service workflows with automated governance, organizations can accelerate development while maintaining control over cluster resources.

This guide covers building a production-ready NaaS portal using open-source tools and custom automation.

## Architecture Overview

A complete NaaS solution includes:

- Web portal for namespace requests
- Approval workflow engine
- Automated namespace provisioning
- Resource quota management
- RBAC configuration
- Cost tracking and showback
- Audit logging

## Building the Portal Backend

Create a FastAPI backend for namespace management:

```python
# namespace_api.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from kubernetes import client, config
from kubernetes.config.config_exception import ConfigException
from typing import Optional
import uuid

app = FastAPI()

class NamespaceRequest(BaseModel):
    name: str
    team: str
    environment: str
    contact_email: str
    cpu_quota: str
    memory_quota: str
    storage_quota: str
    justification: str

class NamespaceStatus(BaseModel):
    id: str
    name: str
    status: str
    created_at: str
    approved_by: Optional[str]

try:
    config.load_incluster_config()
except ConfigException:
    config.load_kube_config()

v1 = client.CoreV1Api()
rbac_v1 = client.RbacAuthorizationV1Api()

def get_namespace_name(request: NamespaceRequest):
    return request.name or f"{request.team}-{request.environment}"

@app.post("/api/namespaces/request")
async def request_namespace(request: NamespaceRequest):
    # Create request in database
    request_id = str(uuid.uuid4())

    # Store in pending requests
    store_request(request_id, request)

    # Send notification to approvers
    notify_approvers(request)

    return {
        "request_id": request_id,
        "status": "pending_approval",
        "message": "Namespace request submitted for approval"
    }

@app.post("/api/namespaces/approve/{request_id}")
async def approve_namespace(request_id: str, approver: str):
    # Get request details
    request = get_request(request_id)

    # Create namespace
    namespace = client.V1Namespace(
        metadata=client.V1ObjectMeta(
            name=get_namespace_name(request),
            labels={
                "team": request.team,
                "environment": request.environment,
                "managed-by": "naas-portal"
            },
            annotations={
                "contact-email": request.contact_email,
                "approved-by": approver,
                "request-id": request_id
            }
        )
    )
    v1.create_namespace(namespace)

    # Create resource quota
    create_resource_quota(request)

    # Create RBAC
    create_rbac_bindings(request)

    # Create network policies
    create_network_policies(request)

    return {
        "namespace": get_namespace_name(request),
        "status": "created",
        "kubeconfig": generate_kubeconfig(request)
    }

@app.get("/api/namespaces")
async def list_namespaces(team: Optional[str] = None):
    label_selector = f"team={team}" if team else "managed-by=naas-portal"
    namespaces = v1.list_namespace(label_selector=label_selector)

    return [
        {
            "name": ns.metadata.name,
            "team": ns.metadata.labels.get("team"),
            "environment": ns.metadata.labels.get("environment"),
            "created_at": ns.metadata.creation_timestamp
        }
        for ns in namespaces.items
    ]

@app.get("/api/namespaces/{namespace}/usage")
async def get_namespace_usage(namespace: str):
    # Get resource quota usage
    try:
        quota = v1.read_namespaced_resource_quota("tenant-quota", namespace)
        return {
            "namespace": namespace,
            "cpu": {
                "used": quota.status.used.get("requests.cpu", "0"),
                "hard": quota.status.hard.get("requests.cpu", "0")
            },
            "memory": {
                "used": quota.status.used.get("requests.memory", "0"),
                "hard": quota.status.hard.get("requests.memory", "0")
            },
            "pods": {
                "used": quota.status.used.get("pods", "0"),
                "hard": quota.status.hard.get("pods", "0")
            }
        }
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=404, detail="Namespace not found")

def create_resource_quota(request: NamespaceRequest):
    namespace = get_namespace_name(request)
    quota = client.V1ResourceQuota(
        metadata=client.V1ObjectMeta(name="tenant-quota"),
        spec=client.V1ResourceQuotaSpec(
            hard={
                "requests.cpu": request.cpu_quota,
                "requests.memory": request.memory_quota,
                "requests.storage": request.storage_quota,
                "pods": "100"
            }
        )
    )
    v1.create_namespaced_resource_quota(namespace, quota)

def create_rbac_bindings(request: NamespaceRequest):
    namespace = get_namespace_name(request)

    # Create admin role binding
    role_binding = client.V1RoleBinding(
        metadata=client.V1ObjectMeta(name=f"{request.team}-admin"),
        subjects=[
            client.V1Subject(
                kind="Group",
                name=f"{request.team}-admins",
                api_group="rbac.authorization.k8s.io"
            )
        ],
        role_ref=client.V1RoleRef(
            kind="ClusterRole",
            name="admin",
            api_group="rbac.authorization.k8s.io"
        )
    )
    rbac_v1.create_namespaced_role_binding(namespace, role_binding)
```

## Creating the Frontend Portal

Build a React frontend for the portal:

```javascript
// NamespaceRequestForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const NamespaceRequestForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    environment: 'development',
    contact_email: '',
    cpu_quota: '10',
    memory_quota: '20Gi',
    storage_quota: '100Gi',
    justification: ''
  });

  const [requestStatus, setRequestStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/namespaces/request', formData);
      setRequestStatus({
        success: true,
        message: `Request submitted successfully. Request ID: ${response.data.request_id}`
      });
    } catch (error) {
      setRequestStatus({
        success: false,
        message: `Error: ${error.response?.data?.detail || error.message}`
      });
    }
  };

  return (
    <div className="namespace-request-form">
      <h2>Request New Namespace</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Namespace Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Team Name</label>
          <input
            type="text"
            value={formData.team}
            onChange={(e) => setFormData({...formData, team: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Environment</label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({...formData, environment: e.target.value})}
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>

        <div className="form-group">
          <label>Contact Email</label>
          <input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
            required
          />
        </div>

        <div className="resource-quotas">
          <h3>Resource Quotas</h3>
          <div className="form-group">
            <label>CPU Quota (cores)</label>
            <input
              type="number"
              value={formData.cpu_quota}
              onChange={(e) => setFormData({...formData, cpu_quota: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Memory Quota (e.g., 20Gi)</label>
            <input
              type="text"
              value={formData.memory_quota}
              onChange={(e) => setFormData({...formData, memory_quota: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Storage Quota (e.g., 100Gi)</label>
            <input
              type="text"
              value={formData.storage_quota}
              onChange={(e) => setFormData({...formData, storage_quota: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Justification</label>
          <textarea
            value={formData.justification}
            onChange={(e) => setFormData({...formData, justification: e.target.value})}
            rows="4"
            required
          />
        </div>

        <button type="submit">Submit Request</button>
      </form>

      {requestStatus && (
        <div className={`alert ${requestStatus.success ? 'success' : 'error'}`}>
          {requestStatus.message}
        </div>
      )}
    </div>
  );
};

export default NamespaceRequestForm;
```

## Implementing Approval Workflows

Create an approval workflow using Argo Workflows:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: namespace-approval-workflow
  namespace: naas-system
spec:
  entrypoint: approve-namespace
  arguments:
    parameters:
    - name: request-id
    - name: namespace-name
    - name: team
    - name: cpu-quota
    - name: memory-quota

  templates:
  - name: approve-namespace
    steps:
    - - name: notify-approvers
        template: send-notification
    - - name: wait-for-approval
        template: approval-gate
    - - name: create-namespace
        template: provision-namespace
        when: "{{steps.wait-for-approval.outputs.parameters.approval}} == approved"
    - - name: configure-resources
        template: setup-resources
        when: "{{steps.wait-for-approval.outputs.parameters.approval}} == approved"

  - name: send-notification
    container:
      image: curlimages/curl:8.4.0
      command: [sh, -c]
      args:
        - |
          curl -X POST https://slack.com/api/chat.postMessage \
            -H "Authorization: Bearer $SLACK_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
              "channel": "#namespace-approvals",
              "text": "New namespace request: {{workflow.parameters.namespace-name}}"
            }'

  - name: approval-gate
    suspend: {}
    inputs:
      parameters:
      - name: approval
        default: rejected
        enum:
        - approved
        - rejected
        description: Select approved to provision the namespace
    outputs:
      parameters:
      - name: approval
        valueFrom:
          supplied: {}

  - name: provision-namespace
    script:
      image: bitnami/kubectl:latest
      command: [bash]
      source: |
        kubectl create namespace {{workflow.parameters.namespace-name}}
        kubectl label namespace {{workflow.parameters.namespace-name}} \
          team={{workflow.parameters.team}} \
          managed-by=naas-portal

  - name: setup-resources
    script:
      image: bitnami/kubectl:latest
      command: [bash]
      source: |
        # Create resource quota
        kubectl apply -f - <<EOF
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: tenant-quota
          namespace: {{workflow.parameters.namespace-name}}
        spec:
          hard:
            requests.cpu: "{{workflow.parameters.cpu-quota}}"
            requests.memory: "{{workflow.parameters.memory-quota}}"
        EOF
```

## Deploying the Portal

Deploy the NaaS portal on Kubernetes:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: naas-portal-sa
  namespace: naas-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: naas-portal
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["create", "get", "list", "watch", "patch", "update"]
- apiGroups: [""]
  resources: ["resourcequotas"]
  verbs: ["create", "get", "list", "watch", "patch", "update"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["rolebindings"]
  verbs: ["create", "get", "list", "watch", "patch", "update"]
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["create", "get", "list", "watch", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: naas-portal
subjects:
- kind: ServiceAccount
  name: naas-portal-sa
  namespace: naas-system
roleRef:
  kind: ClusterRole
  name: naas-portal
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: naas-portal
  namespace: naas-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: naas-portal
  template:
    metadata:
      labels:
        app: naas-portal
    spec:
      serviceAccountName: naas-portal-sa
      containers:
      - name: backend
        image: myorg/naas-backend:v1.0.0
        ports:
        - name: backend
          containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: naas-db-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
      - name: frontend
        image: myorg/naas-frontend:v1.0.0
        ports:
        - name: frontend
          containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: naas-portal
  namespace: naas-system
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: frontend
  - name: api
    port: 8000
    targetPort: backend
  selector:
    app: naas-portal
```

## Implementing Cost Tracking

Track namespace costs for showback:

```python
@app.get("/api/namespaces/{namespace}/cost")
async def get_namespace_cost(namespace: str, period: str = "month"):
    # Calculate cost based on resource usage
    usage = await get_namespace_usage(namespace)

    # Cost calculation (example rates)
    cpu_cost_per_core = 30  # USD per core per month
    memory_cost_per_gb = 5  # USD per GB per month

    cpu_cores = parse_cpu(usage["cpu"]["used"])
    memory_gb = parse_memory(usage["memory"]["used"])

    total_cost = (cpu_cores * cpu_cost_per_core) + (memory_gb * memory_cost_per_gb)

    return {
        "namespace": namespace,
        "period": period,
        "cost_breakdown": {
            "cpu": cpu_cores * cpu_cost_per_core,
            "memory": memory_gb * memory_cost_per_gb
        },
        "total_cost": total_cost,
        "currency": "USD"
    }

def parse_cpu(cpu_value: str) -> float:
    if cpu_value.endswith("m"):
        return float(cpu_value[:-1]) / 1000
    return float(cpu_value)

def parse_memory(memory_value: str) -> float:
    units = {"Ki": 1 / (1024 * 1024), "Mi": 1 / 1024, "Gi": 1, "Ti": 1024}
    for suffix, multiplier in units.items():
        if memory_value.endswith(suffix):
            return float(memory_value[:-len(suffix)]) * multiplier
    return float(memory_value) / (1024 * 1024 * 1024)
```

## Best Practices

Follow these practices for NaaS portals:

1. Implement approval workflows for production namespaces
2. Set default resource quotas based on environment
3. Automate RBAC configuration
4. Provide cost visibility to requesters
5. Implement quota request increases
6. Audit all namespace operations
7. Integrate with identity providers (OIDC/SAML)
8. Provide self-service kubeconfig generation
9. Implement namespace expiration for temporary environments
10. Monitor portal usage and adoption

## Conclusion

Namespace-as-a-Service portals democratize Kubernetes access while maintaining governance and control. By providing self-service provisioning with automated workflows, resource quotas, and cost tracking, platform teams can empower developers without sacrificing cluster stability or security.

Key components include web-based request portals, automated provisioning workflows, approval gates for sensitive resources, RBAC automation, cost tracking and showback, and comprehensive audit logging. With a well-designed NaaS portal, organizations can accelerate development velocity while maintaining platform reliability.
