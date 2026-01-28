# How to Configure OpenShift Security Context Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Security, Security Context Constraints, Kubernetes, RBAC

Description: Learn how OpenShift Security Context Constraints (SCC) work, how to grant them safely, and how to troubleshoot common pod admission failures.

---

Security Context Constraints (SCC) are OpenShift's admission controls for pods. They define what a pod is allowed to do, such as running as root, using host networking, or mounting privileged volumes. This guide explains how SCCs work and how to configure them safely.

## Why SCCs Matter

In OpenShift, pod security is enforced at the API level. If your pod spec violates SCC rules, the API server rejects it. This means your deployments fail early and consistently, which is good for security but can be confusing if you are new to OpenShift.

## Key Concepts

- **SCC**: Defines the allowed security settings for a pod.
- **Service Account**: SCCs are assigned to service accounts, not directly to pods.
- **RBAC**: SCC access is controlled via RBAC rules and group membership.
- **Admission**: The API server selects the first SCC that the service account can use which satisfies the pod spec.

## Common SCCs

OpenShift ships with defaults like:

- `restricted`: The safest default. No privileged access, no host networking, random UID.
- `anyuid`: Allows containers to run with a fixed user ID.
- `privileged`: Full access. Avoid unless required.

## Step 1: Inspect Available SCCs

```bash
oc get scc
```

## Step 2: Find Which SCC a Pod Used

```bash
oc describe pod my-app-7f8d4c6f9c-abcde
```

Look for the `openshift.io/scc` annotation.

## Step 3: Grant an SCC to a Service Account

The command below grants the `anyuid` SCC to the `default` service account in a namespace. Use dedicated service accounts in real environments.

```bash
oc adm policy add-scc-to-user anyuid -z default -n my-namespace
```

## Step 4: Create a Dedicated Service Account

The example below creates a service account and grants it a specific SCC. Then you can reference it in your Deployment.

```bash
# Create a dedicated service account
oc create serviceaccount web-sa -n my-namespace

# Allow it to use the anyuid SCC
oc adm policy add-scc-to-user anyuid -z web-sa -n my-namespace
```

## Step 5: Reference the Service Account in a Deployment

This deployment uses the `web-sa` service account so the SCC applies to the pod.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      serviceAccountName: web-sa
      containers:
        - name: web
          image: registry.example.com/web:1.0.0
          ports:
            - containerPort: 8080
```

## Troubleshooting Admission Failures

If your pod is rejected, look for errors like:

- `pod rejected: unable to validate against any security context constraint`
- `runAsUser requires UID` or `must be in the range`
- `hostNetwork is not allowed`

Useful commands:

```bash
# Show why admission failed
oc get events -n my-namespace --sort-by=.lastTimestamp | tail -n 20

# See pod status and errors
oc describe pod my-app-7f8d4c6f9c-abcde -n my-namespace
```

## Best Practices

- Start with `restricted` and only loosen when required.
- Use dedicated service accounts for apps that need special privileges.
- Avoid `privileged` unless you are running node-level agents.
- Keep SCC grants minimal and review them regularly.

## Conclusion

OpenShift SCCs are your guardrails. When you understand how they map to service accounts and pod specs, you can safely run workloads without compromising cluster security.
