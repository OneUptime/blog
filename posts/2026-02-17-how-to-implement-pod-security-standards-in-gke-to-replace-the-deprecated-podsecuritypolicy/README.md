# How to Implement Pod Security Standards in GKE to Replace the Deprecated PodSecurityPolicy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Pod Security, Kubernetes, Security, PodSecurityPolicy

Description: Learn how to implement Kubernetes Pod Security Standards on GKE as a replacement for the deprecated PodSecurityPolicy using Pod Security Admission.

---

PodSecurityPolicy (PSP) was removed in Kubernetes 1.25. If you were relying on PSP to enforce security constraints on your pods, you need a replacement. The official successor is Pod Security Admission (PSA), which implements the Pod Security Standards defined by the Kubernetes project.

The good news is that Pod Security Admission is simpler than PSP. Instead of creating and managing multiple policy objects with complex RBAC bindings, you just label your namespaces with the security level you want. The bad news is that it is less flexible - but for most teams, the simplicity trade-off is worth it.

## Understanding Pod Security Standards

Pod Security Standards define three security levels:

**Privileged**: No restrictions at all. Pods can do anything. Use this for system-level workloads like CNI plugins, storage drivers, and monitoring agents.

**Baseline**: Prevents known privilege escalations. Blocks things like host networking, host PID, privileged containers, and certain dangerous volume types. This is a good default for most workloads.

**Restricted**: Heavily locked down. Requires pods to run as non-root, drop all capabilities, use a read-only root filesystem, and set a seccomp profile. This is the target for security-sensitive applications.

Each level can operate in three modes:

- **enforce**: Blocks pods that violate the policy
- **audit**: Allows pods but records violations in the audit log
- **warn**: Allows pods but shows warnings to the user deploying them

## Checking Your Current State

Before enforcing any policies, audit your existing workloads to see what would break:

```bash
# Dry-run check: see which pods in a namespace would violate baseline policy
kubectl label --dry-run=server --overwrite ns default \
  pod-security.kubernetes.io/enforce=baseline
```

For a more thorough audit, apply the labels in warn and audit mode first:

```bash
# Enable audit and warn modes for baseline level on the default namespace
kubectl label ns default \
  pod-security.kubernetes.io/audit=baseline \
  pod-security.kubernetes.io/warn=baseline
```

Now deploy your workloads and check for warnings. Any pods that would be blocked under enforcement will generate warnings during deployment and audit log entries.

## Applying Pod Security Standards Per Namespace

The simplest migration path is to apply policies namespace by namespace, starting with your least sensitive namespaces.

Apply restricted policy to a new or clean namespace:

```bash
# Apply restricted security standard with enforcement
kubectl label ns secure-apps \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

Apply baseline policy to namespaces with general-purpose workloads:

```bash
# Apply baseline security standard with enforcement
kubectl label ns default \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

Notice the pattern: enforce baseline, but audit and warn on restricted. This way you enforce a reasonable minimum while getting visibility into what would break if you tightened the policy further.

Leave system namespaces as privileged:

```bash
# Keep kube-system privileged since it runs system components
kubectl label ns kube-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/enforce-version=latest
```

## Adapting Workloads for Restricted Policy

Most application pods need changes to comply with the restricted level. Here is a deployment that meets all restricted requirements:

```yaml
# restricted-deployment.yaml - Deployment compliant with restricted security standard
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: secure-apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      securityContext:
        # Run as non-root user
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        # Set seccomp profile to RuntimeDefault
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: us-docker.pkg.dev/my-project/my-repo/app:v1.0
          securityContext:
            # Do not allow privilege escalation
            allowPrivilegeEscalation: false
            # Drop all capabilities
            capabilities:
              drop:
                - ALL
            # Read-only root filesystem
            readOnlyRootFilesystem: true
          # Writable directories via emptyDir volumes
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        # Provide writable directories through emptyDir
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

The key requirements for restricted are:

- `runAsNonRoot: true`
- `allowPrivilegeEscalation: false`
- `capabilities.drop: ALL`
- `seccompProfile.type: RuntimeDefault`

If your application needs to write to specific directories, mount emptyDir volumes at those paths since the root filesystem should be read-only.

## Migration Strategy from PSP to PSA

Here is a practical migration path:

### Phase 1: Audit

Apply warn and audit labels to all namespaces using the level that matches your current PSP:

```bash
# Apply audit and warn to all application namespaces
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  kubectl label ns "$ns" \
    pod-security.kubernetes.io/audit=baseline \
    pod-security.kubernetes.io/warn=baseline \
    --overwrite 2>/dev/null
done
```

Deploy normally for a week and review the audit logs to find violations.

### Phase 2: Fix Violations

Update your workloads to comply with the target policy level. The most common changes are:

```yaml
# Common fix: add security context to existing deployments
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
```

### Phase 3: Enforce

Once your workloads are compliant, switch to enforcement:

```bash
# Enable enforcement after verifying no violations
kubectl label ns default \
  pod-security.kubernetes.io/enforce=baseline \
  --overwrite
```

### Phase 4: Tighten

Gradually move namespaces from baseline to restricted as workloads are updated:

```bash
# Upgrade a namespace from baseline to restricted enforcement
kubectl label ns secure-apps \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Using GKE Policy Controller as a Complement

If you need more granular policies than Pod Security Admission provides (for example, requiring specific image registries or blocking specific labels), use GKE Policy Controller alongside PSA:

```yaml
# allowed-repos.yaml - Policy Controller constraint for image source
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces: ["kube-system"]
  parameters:
    repos:
      - "us-docker.pkg.dev/my-project/"
      - "gcr.io/my-project/"
```

This gives you the best of both worlds: Pod Security Admission for standard security policies, and Policy Controller for custom organizational policies.

## Monitoring and Alerting

Set up alerting for pod security violations. In GKE, audit logs capture policy violations:

```bash
# View pod security audit events
gcloud logging read \
  'resource.type="k8s_cluster" AND protoPayload.response.metadata.annotations."pod-security.kubernetes.io/audit-violations" != ""' \
  --limit=20 \
  --project=my-project
```

The transition from PSP to Pod Security Admission is one of those migrations that feels daunting but is actually straightforward if you take it one namespace at a time. Start with audit mode, fix your workloads, then enforce. The result is a simpler, more maintainable security posture for your GKE clusters.
