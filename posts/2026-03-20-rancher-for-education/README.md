# How to Set Up Rancher for Education - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Education, Kubernetes, Multi-Tenant, FERPA, Self-Service, Jupyter

Description: Configure Rancher for educational institutions with multi-tenant namespaces for departments and courses, Jupyter notebook deployments, FERPA compliance, student self-service access, and...

## Introduction

Educational institutions use Kubernetes for research computing, data science courses, LMS infrastructure, and administrative systems. Rancher's multi-tenancy model-with Projects grouping namespaces and supporting RBAC and resource quotas-maps naturally to the departmental structure of universities. FERPA compliance requires data isolation, and SSO integration with campus identity systems (Shibboleth, Azure AD) is essential.

## Education Architecture

```text
Rancher Management
├── Research HPC Cluster (GPU nodes)
│   ├── Project: CS Department
│   ├── Project: Biology Department
│   └── Project: Physics Department
├── Teaching Cluster
│   ├── Project: CS101 Course
│   ├── Project: Data Science Course
│   └── Project: Web Dev Course
└── Administration Cluster
    ├── LMS (Canvas/Moodle)
    ├── Student Information System
    └── Email/Collaboration
```

## Step 1: Configure Multi-Tenant Projects

```yaml
# Rancher Projects group namespaces; apply quotas inside the namespaces they contain

# Via Rancher UI: Cluster > Projects/Namespaces

# Research computing quota per department
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cs-department-quota
  namespace: cs-department
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    requests.nvidia.com/gpu: "8"
    persistentvolumeclaims: "50"
    services: "20"
    limits.cpu: "200"
    limits.memory: 400Gi

---
# Course namespace quota (smaller)
apiVersion: v1
kind: LimitRange
metadata:
  name: course-limits
  namespace: cs101-spring-2026
spec:
  limits:
    - type: Pod
      max:
        cpu: "2"
        memory: 4Gi
    - type: Container
      default:
        cpu: "500m"
        memory: 512Mi
      defaultRequest:
        cpu: "100m"
        memory: 128Mi
```

## Step 2: Student Self-Service Jupyter Notebooks

```bash
# Deploy JupyterHub for course namespaces
helm repo add jupyterhub https://jupyterhub.github.io/helm-chart/
helm install jupyterhub jupyterhub/jupyterhub \
  --namespace data-science-course \
  --create-namespace \
  --values jupyterhub-values.yaml
```

```yaml
# jupyterhub-values.yaml
hub:
  config:
    Authenticator:
      admin_users:
        - professor@university.edu
    JupyterHub:
      authenticator_class: generic-oauth
    # Integrate with campus SSO via OIDC
    GenericOAuthenticator:
      client_id: jupyterhub
      client_secret: "<set-in-secret>"
      oauth_callback_url: "https://jupyterhub.cs.university.edu/hub/oauth_callback"
      authorize_url: "https://sso.university.edu/idp/profile/oidc/authorize"
      token_url: "https://sso.university.edu/idp/profile/oidc/token"
      userdata_url: "https://sso.university.edu/idp/profile/oidc/userinfo"
      username_claim: email
      login_service: "Campus SSO"
      scope:
        - openid
        - profile
        - email

singleuser:
  storage:
    capacity: 5Gi
    dynamic:
      storageClass: longhorn
  memory:
    limit: 2Gi
  cpu:
    limit: 1
  cmd: null
  image:
    name: jupyter/datascience-notebook
    tag: latest
  profileList:
    - display_name: "Standard (CPU)"
      description: "Standard notebook environment"
    - display_name: "GPU Accelerated"
      description: "Notebook with GPU access (limited availability)"
      kubespawner_override:
        extra_resource_limits:
          nvidia.com/gpu: "1"
```

## Step 3: Campus SSO Integration

```bash
# Configure Rancher with Shibboleth/SAML
# Rancher UI: Main menu > Users & Authentication > Auth Provider > Shibboleth

# For Azure AD (common in universities):
# Rancher UI: Main menu > Users & Authentication > Auth Provider > AzureAD

# Key configuration:
# Redirect URI: https://<rancher-server>/verify-auth-azure
# Application ID: from Azure AD app registration
# Application Secret: from Azure AD client secret
# Tenant ID: from Azure AD

# Map AD groups to Rancher roles:
# IT-K8s-Admins → Cluster Owner
# Dept-CS-Faculty → CS Department Project Owner
# Dept-CS-Students → CS Department Project Member (read + deploy)
```

## Step 4: FERPA Compliance

```yaml
# FERPA requires protecting student educational records
# Isolation between course namespaces is critical

# Network policy preventing cross-namespace access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: namespace-isolation
  namespace: cs101-spring-2026
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: cs101-spring-2026
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: cs101-spring-2026
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Step 5: Research GPU Workloads

```yaml
# GPU-accelerated research job with NVIDIA device plugin
apiVersion: batch/v1
kind: Job
metadata:
  name: deep-learning-training
  namespace: cs-research
spec:
  template:
    spec:
      containers:
        - name: trainer
          image: pytorch/pytorch:2.1.0-cuda11.8-cudnn8-devel
          command: ["python", "train.py", "--epochs", "100"]
          resources:
            limits:
              nvidia.com/gpu: "4"    # Request 4 GPUs
              memory: "32Gi"
          volumeMounts:
            - name: dataset
              mountPath: /data
            - name: results
              mountPath: /results
      volumes:
        - name: dataset
          persistentVolumeClaim:
            claimName: research-dataset
        - name: results
          persistentVolumeClaim:
            claimName: training-results
      restartPolicy: OnFailure
```

## Step 6: Automated Namespace Lifecycle

```bash
# Auto-create/delete course namespaces each semester
# Python script called from CI/CD pipeline

# Create namespace for new semester in the correct Rancher Project
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cs101-fall-2026
  annotations:
    field.cattle.io/projectId: c-m-abcde:p-12345
  labels:
    course: cs101
    semester: fall-2026
    expires: "2027-01-31"
EOF

# Apply standard policies
kubectl apply -f course-network-policies.yaml -n cs101-fall-2026
kubectl apply -f course-resource-quotas.yaml -n cs101-fall-2026

# Clean up at semester end (after data export)
kubectl delete namespace cs101-spring-2026
```

## Conclusion

Rancher's Project-based multi-tenancy aligns perfectly with university organizational structures-departments and courses can map cleanly to Projects and their namespaces. JupyterHub on Rancher provides self-service data science notebooks for students, while GPU job scheduling supports research computing. SSO integration with campus identity systems (Shibboleth, Azure AD) provides seamless access management, and namespace isolation enforces FERPA data protection. The Rancher Projects' resource quota system prevents any single course or department from monopolizing cluster resources.
