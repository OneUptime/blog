# How to Troubleshoot Source Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Source Controller, Pod Crashes, CrashLoopBackOff

Description: Learn how to diagnose and fix Source Controller pod crashes in Flux, including CrashLoopBackOff errors, OOMKilled events, and startup failures.

---

The Source Controller is one of the most critical components in a Flux deployment. It is responsible for fetching artifacts from external sources such as Git repositories, Helm repositories, OCI registries, and S3-compatible buckets. When this controller crashes, your entire GitOps pipeline stalls. This guide walks you through diagnosing and resolving Source Controller pod crashes.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Sufficient permissions to view pods, logs, and events in the flux-system namespace

## Step 1: Check Pod Status

Start by checking the current state of the Source Controller pod:

```bash
kubectl get pods -n flux-system -l app=source-controller
```

Look for statuses like `CrashLoopBackOff`, `OOMKilled`, `Error`, or `ImagePullBackOff`. Each of these indicates a different underlying issue.

To get more detail on the pod state:

```bash
kubectl describe pod -n flux-system -l app=source-controller
```

Pay close attention to the `State`, `Last State`, `Reason`, and `Exit Code` fields in the output.

## Step 2: Review Pod Logs

Examine the controller logs for error messages:

```bash
kubectl logs -n flux-system deploy/source-controller --previous
```

The `--previous` flag shows logs from the last crashed container instance. If the pod is currently running but restarting frequently, you can also check current logs:

```bash
kubectl logs -n flux-system deploy/source-controller --tail=100
```

## Step 3: Identify Common Crash Causes

### OOMKilled (Out of Memory)

If the pod is being killed due to memory limits, you will see `OOMKilled` in the pod description:

```bash
kubectl get pod -n flux-system -l app=source-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

To fix OOMKilled errors, increase the memory limits for the Source Controller:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
      - name: manager
        resources:
          limits:
            memory: 1Gi
          requests:
            memory: 256Mi
```

Apply this patch using kustomize or directly:

```bash
kubectl patch deployment source-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"}]'
```

### Storage Volume Issues

The Source Controller stores fetched artifacts on a persistent volume. If the volume is full or cannot be mounted, the pod will crash:

```bash
kubectl get pvc -n flux-system
kubectl describe pvc -n flux-system source-controller
```

Check if the volume is bound and has available space. If the volume is full, you can either increase its size or clean up old artifacts.

### Image Pull Failures

If the controller image cannot be pulled, the pod will enter `ImagePullBackOff`:

```bash
kubectl describe pod -n flux-system -l app=source-controller | grep -A 5 "Events"
```

Verify that your cluster can access the container registry hosting the Flux images. For air-gapped environments, ensure you have mirrored the images and configured the appropriate image pull secrets.

### TLS and Certificate Errors

The Source Controller often connects to Git repositories and Helm registries over TLS. If custom CA certificates are not properly mounted, the pod may crash during startup:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "tls\|certificate\|x509"
```

Ensure any custom CA bundles are properly configured in the controller deployment.

## Step 4: Check Kubernetes Events

Cluster-level events can reveal scheduling and resource issues:

```bash
kubectl get events -n flux-system --sort-by=.metadata.creationTimestamp --field-selector involvedObject.name=source-controller
```

Look for events related to failed scheduling, node pressure, or resource quota violations.

## Step 5: Verify Resource Quotas and Limit Ranges

If your namespace has resource quotas or limit ranges, they may prevent the pod from starting:

```bash
kubectl get resourcequota -n flux-system
kubectl get limitrange -n flux-system
```

Ensure the Source Controller resource requests and limits fall within the allowed ranges.

## Step 6: Restart the Controller

After making configuration changes, restart the Source Controller:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
kubectl rollout status deployment/source-controller -n flux-system
```

## Prevention Tips

- Monitor Source Controller memory and CPU usage with Prometheus metrics exposed at the `/metrics` endpoint
- Set up alerts for pod restart counts using a query like `kube_pod_container_status_restarts_total{namespace="flux-system", container="manager"}`
- Use Flux's built-in health checks by running `flux check` regularly
- Keep Flux components updated to benefit from bug fixes and performance improvements
- Configure appropriate resource requests and limits based on the number and size of sources being reconciled

## Summary

Source Controller pod crashes are typically caused by memory exhaustion, storage issues, image pull failures, or TLS misconfigurations. By systematically checking pod status, reviewing logs, and examining events, you can quickly identify and resolve the root cause. Proactive monitoring and proper resource allocation will help prevent future crashes.
