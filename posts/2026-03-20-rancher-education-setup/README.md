# How to Set Up Rancher for Education

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Education, Kubernetes, Multi-Tenant, Student-environments

Description: A guide to deploying Rancher for educational institutions, covering multi-tenant student environments, course-based namespace management, and cost-effective cluster operations.

## Overview

Educational institutions face unique Kubernetes challenges: hundreds of students and faculty needing isolated environments, seasonal workload spikes around exams, and tight budget constraints. Rancher's multi-tenant capabilities, project-based isolation, and support for self-service user environments make it an excellent choice for universities and educational platforms. This guide covers the key configurations for educational deployments.

## Architecture

```text
University Rancher Platform
├── Faculty Cluster (production course deployments)
│   ├── Project: Computer Science
│   ├── Project: Data Science
│   └── Project: Software Engineering
├── Student Lab Cluster (per-student environments)
│   ├── Student Namespace: student-001
│   ├── Student Namespace: student-002
│   └── ... (hundreds of namespaces)
└── Research Cluster (GPU workloads, HPC)
    ├── Project: AI Research Lab
    └── Project: Bioinformatics
```

## Step 1: Multi-Tenant Project Structure

Create Rancher Projects to isolate courses and departments:

```text
Rancher UI → Cluster Management → [cluster] → Explore → Cluster → Projects/Namespaces → Create Project

Project: cs-101-intro-programming
  - Namespace: cs101-fall2026
  - Resource Quota:
    - CPU: 10 cores
    - Memory: 20Gi
    - Persistent Storage: 100Gi

Project: ds-301-machine-learning
  - Namespace: ds301-fall2026
  - Resource Quota:
    - CPU: 20 cores (GPU workloads)
    - Memory: 40Gi
    - GPU: 2
```

## Step 2: Student Namespace Automation

Automate student namespace creation with a script:

```bash
#!/bin/bash
# create-student-namespaces.sh

# Creates a namespace for each student in the roster

STUDENTS_FILE="students.txt"
COURSE="cs101"
PROJECT_ID="c-m-abcde:p-xyz12"   # Rancher project ID for the course

while IFS= read -r student_id; do
  # Create namespace in the Rancher project so project quotas and membership apply
  kubectl apply -f - << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${COURSE}-${student_id}
  annotations:
    field.cattle.io/projectId: "${PROJECT_ID}"
EOF

  # Apply resource quota
  kubectl apply -f - << EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: student-quota
  namespace: ${COURSE}-${student_id}
spec:
  hard:
    requests.cpu: "500m"
    requests.memory: "512Mi"
    limits.cpu: "2"
    limits.memory: "2Gi"
    persistentvolumeclaims: "3"
    pods: "10"
EOF

  # Apply LimitRange for default resource limits
  kubectl apply -f - << EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: student-limits
  namespace: ${COURSE}-${student_id}
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
EOF

  echo "Created namespace for student: $student_id"
done < "$STUDENTS_FILE"
```

## Step 3: Student RBAC

```yaml
# RBAC: Grant student edit access to their own namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: student-admin
  namespace: cs101-student-001
subjects:
  - kind: User
    name: student-001@university.edu   # Must match the username seen by the downstream cluster
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: edit
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Self-Service Jupyter Environments

Install JupyterHub for data science courses using the official Helm chart:

```yaml
# config.yaml for the JupyterHub Helm chart
singleuser:
  cpu:
    guarantee: 0.1
    limit: 2
  memory:
    guarantee: 512Mi
    limit: 2Gi
  storage:
    dynamic:
      storageClass: longhorn
```

```bash
helm repo add jupyterhub https://hub.jupyter.org/helm-chart/
helm repo update
helm upgrade --cleanup-on-fail \
  --install ds301-hub jupyterhub/jupyterhub \
  --namespace ds301-fall2026 \
  --create-namespace \
  --values config.yaml
```

## Step 5: Development Environment Templates

Provide course-specific development environments using Rancher Apps:

```yaml
# values.yaml for the code-server Helm chart
# existingSecret must contain a `password` key
existingSecret: code-server-auth

persistence:
  enabled: true
  size: 5Gi
  storageClass: longhorn

extraInitContainers: |
  - name: install-extensions
    image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
    imagePullPolicy: IfNotPresent
    command:
      - sh
      - -c
      - |
        code-server --install-extension ms-python.python
        code-server --install-extension ms-toolsai.jupyter
    volumeMounts:
      - name: data
        mountPath: /home/coder
```

## Step 6: Seasonal Auto-Scaling

Handle exam periods and project deadlines with horizontal pod autoscaling:

Requires `metrics-server` or another `metrics.k8s.io` provider in the cluster.

```yaml
# Horizontal Pod Autoscaler for shared lab services
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lab-services-hpa
  namespace: lab-shared
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lab-ide-service
  minReplicas: 2
  maxReplicas: 50    # Scale up to 50 during peak exam times
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 7: LDAP Integration for University SSO

```text
Rancher UI → Users & Authentication → Auth Provider → OpenLDAP
- Server: ldaps://ldap.university.edu:636
- Service Account DN: cn=rancher-svc,ou=service,dc=university,dc=edu
- User Search Base: ou=people,dc=university,dc=edu
- Group Search Base: ou=groups,dc=university,dc=edu
- User Object Class: person
- User Search Attribute: uid
- Required Group: cn=kubernetes-users,ou=groups,dc=university,dc=edu
```

## Step 8: GPU Scheduling for Research

Install the GPU drivers and the vendor device plugin on the research nodes first so `nvidia.com/gpu` is advertised as a schedulable resource.

```yaml
# Research namespace with GPU quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: research-gpu-quota
  namespace: ai-research-lab
spec:
  hard:
    requests.nvidia.com/gpu: "4"
---
# Example ML training job
apiVersion: batch/v1
kind: Job
metadata:
  name: model-training
  namespace: ai-research-lab
spec:
  template:
    spec:
      containers:
        - name: trainer
          image: registry.university.edu/ml-training:latest
          resources:
            limits:
              nvidia.com/gpu: 2
      restartPolicy: Never
```

## Step 9: Cost Management for Education Budgets

```yaml
# Apply spending labels for chargeback
apiVersion: v1
kind: Namespace
metadata:
  name: cs101-fall2026
  labels:
    department: computer-science
    course: cs101
    semester: fall-2026
    budget-owner: prof-smith
```

Use Rancher's project resource quotas to enforce department budgets and prevent runaway workloads from impacting the shared platform.

## Conclusion

Rancher provides an excellent platform for educational institutions with its multi-tenant project isolation, resource quotas, and LDAP integration. The ability to programmatically create student namespaces, apply resource limits, and provide self-service development environments reduces administrative overhead significantly. GPU sharing policies and seasonal autoscaling help manage costs during peak periods. Universities benefit from Rancher's open-source model, which aligns with academic values around open and accessible software.
