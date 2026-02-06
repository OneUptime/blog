# How to Fix OpenTelemetry Operator Auto-Instrumentation Injection Failing Because the Pod Started Before the Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, Auto-Instrumentation, Kubernetes

Description: Fix auto-instrumentation injection failures caused by pods starting before the OpenTelemetry Operator is ready.

The OpenTelemetry Operator uses a Kubernetes mutating webhook to inject auto-instrumentation into pods at creation time. If your application pods start before the Operator webhook is ready, the injection simply does not happen. The pods run without instrumentation, and there are no obvious error messages to tell you why.

## Understanding the Race Condition

The sequence of events matters:

```
1. Cluster starts / Operator deploys
2. Operator webhook server starts up
3. Operator registers MutatingWebhookConfiguration
4. Application pods are created
5. Kubernetes API server calls the webhook
6. Webhook injects the init container for auto-instrumentation
```

If step 4 happens before step 3, the webhook does not exist yet, so Kubernetes creates the pod without calling it. The pod runs normally but without any instrumentation.

## How to Detect the Problem

Check if the instrumentation init container is present:

```bash
# List init containers for your application pod
kubectl get pod my-app-pod -o jsonpath='{.spec.initContainers[*].name}'

# If auto-instrumentation is working, you should see something like:
# opentelemetry-auto-instrumentation

# If the output is empty (or missing the OTel init container), injection failed
```

Check if the webhook is registered:

```bash
# Check for the mutating webhook
kubectl get mutatingwebhookconfiguration | grep opentelemetry

# Check if the webhook service endpoint is ready
kubectl get endpoints -n opentelemetry-operator-system opentelemetry-operator-webhook-service
```

## Fix 1: Add a Dependency on the Operator

Use an init container in your application that waits for the Operator webhook to be ready:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-java: "true"
    spec:
      initContainers:
        - name: wait-for-operator
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              echo "Waiting for OpenTelemetry Operator webhook..."
              until kubectl get mutatingwebhookconfiguration \
                opentelemetry-operator-mutating-webhook-configuration \
                2>/dev/null; do
                echo "Webhook not found, waiting..."
                sleep 5
              done
              echo "Operator webhook is registered"
      containers:
        - name: my-app
          image: my-app:latest
```

## Fix 2: Use failurePolicy on the Webhook

Configure the webhook with `failurePolicy: Fail` so that if the webhook is not available, pod creation fails rather than silently proceeding without instrumentation:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: opentelemetry-operator-mutating-webhook-configuration
webhooks:
  - name: mpod.kb.io
    failurePolicy: Fail  # Reject pod creation if webhook is unavailable
    # This means pods will fail to create until the Operator is ready
    # which is safer than silently skipping instrumentation
```

The downside is that all pod creation in annotated namespaces will be blocked until the Operator is up. This is usually acceptable in production but can cause issues during initial cluster bootstrapping.

## Fix 3: Use Helm Chart Hooks for Ordering

If you deploy with Helm, use chart hooks to ensure the Operator is ready before applications:

```yaml
# In your application Helm chart values
# Add a pre-install hook that waits for the Operator
apiVersion: batch/v1
kind: Job
metadata:
  name: wait-for-otel-operator
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: wait
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              echo "Waiting for OTel Operator deployment to be ready..."
              kubectl rollout status deployment/opentelemetry-operator-controller-manager \
                -n opentelemetry-operator-system --timeout=300s
              echo "Operator is ready"
      restartPolicy: OnFailure
```

## Fix 4: Restart Pods After Operator Is Ready

If the Operator was installed after pods were already running, the simplest fix is to restart the affected pods:

```bash
# Restart all deployments in the namespace that need instrumentation
kubectl rollout restart deployment -n my-app-namespace

# Or restart specific deployments
kubectl rollout restart deployment/my-app -n my-app-namespace

# Verify that the init container appears after restart
kubectl get pod -n my-app-namespace -l app=my-app \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.initContainers[*].name}{"\n"}{end}'
```

## Fix 5: Use ArgoCD Sync Waves

If you use ArgoCD for GitOps deployments, use sync waves to enforce ordering:

```yaml
# Operator deployment - sync wave 0 (deploys first)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: otel-operator
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Application deployment - sync wave 2 (deploys after operator)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "2"
```

## Prevention

The best approach is to treat the Operator as critical infrastructure that must be running before any application workloads. Install it as part of your cluster bootstrapping process, alongside components like CoreDNS and the CNI plugin. This way, it is always ready before application pods are created.
