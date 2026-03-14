# Configuring Installation Validation for Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Set up automated validation checks that run after Cilium installation on K3s to verify networking, policy enforcement, and service connectivity are working correctly.

---

## Introduction

Installation validation for Cilium on K3s ensures that your CNI deployment is fully functional before workloads are scheduled. Without automated validation, subtle misconfigurations can persist until users report connectivity issues.

Configuring validation as part of your installation process means every Cilium deployment is tested consistently, whether it is a fresh install, an upgrade, or a disaster recovery scenario. This removes human error from the validation process.

This guide covers setting up automated validation using the Cilium CLI, Kubernetes Jobs, and health check endpoints that run after every Cilium installation.

## Prerequisites

- A K3s cluster with Cilium installed via Helm
- The Cilium CLI installed
- `kubectl` with cluster-admin access
- Helm v3 for managing Cilium deployment

## Configuring Cilium Health Checks

Enable built-in Cilium health checking in your Helm values:

```yaml
# cilium-validation-values.yaml
# Helm values that enable comprehensive health checking

# Enable health checking between Cilium agents
healthChecking: true

# Enable the Cilium agent health port
healthPort: 9879

# Enable Cilium agent readiness and liveness probes
agent:
  healthPort: 9879

# Enable the operator health endpoint
operator:
  replicas: 1

# Enable Hubble for flow-level validation
hubble:
  enabled: true
  relay:
    enabled: true
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - icmp
```

```bash
# Apply the validation-enabled configuration
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  -f cilium-validation-values.yaml

# Wait for all components to be ready
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s
```

## Creating a Post-Install Validation Job

Deploy a Kubernetes Job that runs validation tests after Cilium installation:

```yaml
# cilium-validation-job.yaml
# A Kubernetes Job that validates Cilium installation
apiVersion: batch/v1
kind: Job
metadata:
  name: cilium-install-validation
  namespace: kube-system
  labels:
    app: cilium-validation
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      serviceAccountName: cilium-validation
      restartPolicy: OnFailure
      containers:
        - name: validator
          image: quay.io/cilium/cilium-cli:latest
          command:
            - sh
            - -c
            - |
              echo "=== Cilium Installation Validation ==="
              echo "1. Checking Cilium status..."
              cilium status --wait --wait-duration 120s
              if [ $? -ne 0 ]; then
                echo "FAIL: Cilium status check failed"
                exit 1
              fi
              echo "2. Running connectivity tests..."
              cilium connectivity test --test pod-to-pod,pod-to-service,dns-resolution
              if [ $? -ne 0 ]; then
                echo "FAIL: Connectivity test failed"
                exit 1
              fi
              echo "=== All validation checks passed ==="
```

```bash
# Create the ServiceAccount and RBAC for the validation job
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cilium-validation
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cilium-validation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: cilium-validation
    namespace: kube-system
EOF

# Run the validation job
kubectl apply -f cilium-validation-job.yaml

# Watch job progress
kubectl logs -n kube-system -l app=cilium-validation -f
```

## Configuring Helm Post-Install Hooks

Integrate validation into the Helm installation process:

```yaml
# cilium-validation-hook.yaml
# Helm post-install hook for automatic validation
apiVersion: batch/v1
kind: Job
metadata:
  name: cilium-post-install-validation
  namespace: kube-system
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "10"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  backoffLimit: 2
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: health-check
          image: bitnami/kubectl:1.29
          command:
            - sh
            - -c
            - |
              echo "Waiting for Cilium pods to be ready..."
              kubectl rollout status daemonset/cilium -n kube-system --timeout=300s
              echo "Checking node readiness..."
              NOT_READY=$(kubectl get nodes --no-headers | grep -cv " Ready ")
              if [ "$NOT_READY" -gt 0 ]; then
                echo "FAIL: $NOT_READY nodes not Ready"
                exit 1
              fi
              echo "Validation passed"
```

## Setting Up Continuous Validation

Create a CronJob that periodically validates Cilium health:

```yaml
# cilium-continuous-validation.yaml
# Periodic health check for Cilium on K3s
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-health-check
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium-validation
          restartPolicy: OnFailure
          containers:
            - name: health-check
              image: bitnami/kubectl:1.29
              command:
                - sh
                - -c
                - |
                  # Check Cilium DaemonSet health
                  DESIRED=$(kubectl get ds cilium -n kube-system -o jsonpath='{.status.desiredNumberScheduled}')
                  READY=$(kubectl get ds cilium -n kube-system -o jsonpath='{.status.numberReady}')
                  if [ "$DESIRED" != "$READY" ]; then
                    echo "WARN: Cilium agents $READY/$DESIRED ready"
                    exit 1
                  fi
                  echo "OK: All $READY Cilium agents healthy"
```

```bash
kubectl apply -f cilium-continuous-validation.yaml
```

## Verification

Confirm validation is properly configured:

```bash
# Check that health port is accessible
kubectl exec -n kube-system ds/cilium -- curl -s http://localhost:9879/healthz

# Verify validation job ran successfully
kubectl get jobs -n kube-system -l app=cilium-validation
kubectl logs -n kube-system -l app=cilium-validation --tail=20

# Verify CronJob is scheduled
kubectl get cronjobs -n kube-system cilium-health-check
```

## Troubleshooting

- **Validation job fails with permission errors**: Ensure the ServiceAccount has the correct ClusterRoleBinding. The validation job needs broad read access and the ability to create test pods.
- **Connectivity tests timeout**: The validation job may run before Cilium is fully initialized. Add a longer wait period or use `cilium status --wait` with a generous timeout.
- **CronJob reports intermittent failures**: Transient pod scheduling during node operations can cause brief DaemonSet count mismatches. Add a retry loop or increase the allowed margin.
- **Health port not accessible**: Verify `healthChecking: true` is set in the Helm values and the Cilium agent pod has port 9879 exposed.

## Conclusion

Configuring installation validation for Cilium on K3s ensures every deployment is verified automatically. The combination of Cilium health checks, post-install validation Jobs, and periodic CronJob health checks provides continuous confidence that your CNI is operating correctly. Integrate these validation steps into your deployment pipeline to catch issues before they affect production workloads.
