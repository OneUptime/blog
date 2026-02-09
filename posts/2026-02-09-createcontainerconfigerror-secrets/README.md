# How to Fix CreateContainerConfigError from Misconfigured Secrets and ConfigMap References

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Configuration Management

Description: Learn how to diagnose and fix CreateContainerConfigError caused by misconfigured Secrets and ConfigMap references in Kubernetes pod specifications.

---

CreateContainerConfigError prevents pods from starting by blocking container creation before the runtime even attempts to pull images. This error typically indicates problems with how containers reference Secrets, ConfigMaps, or volumes. The pod reaches the phase where Kubernetes tries to configure the container runtime, but validation fails due to missing or misconfigured references.

Understanding the specific causes and implementing proper validation prevents these configuration errors from reaching production environments.

## Understanding CreateContainerConfigError

CreateContainerConfigError occurs during the container configuration phase, after scheduling but before image pulling. Kubernetes validates that all referenced configuration objects exist and that references use correct syntax. When validation fails, the container never starts and the pod shows CreateContainerConfigError status.

Common causes include referencing nonexistent Secrets or ConfigMaps, using incorrect keys within those objects, misconfigured volume mounts, and syntax errors in environment variable definitions. Unlike runtime errors that might be transient, CreateContainerConfigError indicates a configuration problem that won't resolve without intervention.

## Identifying CreateContainerConfigError Issues

Check pod status to confirm the error.

```bash
# List pods showing errors
kubectl get pods

# Output:
# NAME                    READY   STATUS                       RESTARTS   AGE
# myapp-6f8d9c7b5-x4k2h   0/1     CreateContainerConfigError   0          2m

# Get detailed error information
kubectl describe pod myapp-6f8d9c7b5-x4k2h
```

The Events section shows the specific configuration problem.

```bash
# Example events:
# Events:
#   Warning  Failed  1m  kubelet  Error: secret "app-secrets" not found
#   Warning  Failed  1m  kubelet  Error: couldn't find key api-key in Secret default/app-secrets
#   Warning  Failed  1m  kubelet  Error: configmap "app-config" not found
```

View container status for additional details.

```bash
kubectl get pod myapp-6f8d9c7b5-x4k2h -o jsonpath='{.status.containerStatuses[0].state.waiting}' | jq

# Output:
# {
#   "message": "secret \"app-secrets\" not found",
#   "reason": "CreateContainerConfigError"
# }
```

## Fixing Missing Secret References

When pods reference Secrets that don't exist, create the Secret before the pod can start.

```bash
# Check if Secret exists
kubectl get secret app-secrets -n default

# If not found, check the pod specification for what's needed
kubectl get pod myapp-6f8d9c7b5-x4k2h -o yaml | grep -A 10 secretRef

# Create the missing Secret
kubectl create secret generic app-secrets \
  --from-literal=database-password=secretpass123 \
  --from-literal=api-key=key_abc123xyz \
  -n default
```

For Secrets referenced in environment variables, verify the exact key names match.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    env:
    # This must match an actual key in the Secret
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-password  # Must exist in Secret
          optional: false  # Fail if missing (default behavior)
```

Check that the Secret contains the referenced key.

```bash
# List keys in Secret
kubectl get secret app-secrets -n default -o jsonpath='{.data}' | jq keys

# Output should include: ["api-key", "database-password"]

# If key is missing, update the Secret
kubectl create secret generic app-secrets \
  --from-literal=database-password=secretpass123 \
  --from-literal=api-key=key_abc123xyz \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Resolving ConfigMap Reference Errors

ConfigMap errors follow similar patterns to Secret errors. Verify ConfigMaps exist and contain referenced keys.

```bash
# Check for ConfigMap
kubectl get configmap app-config -n default

# View ConfigMap keys
kubectl get configmap app-config -n default -o jsonpath='{.data}' | jq keys

# Create missing ConfigMap
kubectl create configmap app-config \
  --from-literal=log-level=info \
  --from-file=config.yaml=./config.yaml \
  -n default
```

For environment variables from ConfigMaps, verify key names.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log-level  # Must match key in ConfigMap
```

When mounting ConfigMaps as volumes, ensure referenced ConfigMaps exist.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: app-config  # ConfigMap must exist
      items:
      - key: config.yaml  # Key must exist in ConfigMap
        path: app-config.yaml
```

## Handling Optional vs Required Configuration

Use the `optional` field to control whether missing Secrets or ConfigMaps cause errors.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    env:
    # Required configuration (default behavior)
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-url
          optional: false  # Pod won't start if missing

    # Optional configuration
    - name: FEATURE_FLAG
      valueFrom:
        configMapKeyRef:
          name: optional-config
          key: feature-enabled
          optional: true  # Pod starts even if missing
```

For volumes, set `optional: true` to allow the pod to start even if the ConfigMap or Secret doesn't exist.

```yaml
volumes:
- name: optional-config
  configMap:
    name: app-config
    optional: true
- name: optional-secret
  secret:
    secretName: app-secrets
    optional: true
```

## Fixing Environment Variable Syntax Errors

Malformed environment variable definitions cause CreateContainerConfigError. Verify syntax matches Kubernetes specifications.

```yaml
# Correct syntax examples
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    env:
    # Direct value
    - name: ENVIRONMENT
      value: "production"

    # From Secret
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: api-key

    # From ConfigMap
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log-level

    # From field reference
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name

    # From resource field
    - name: CPU_LIMIT
      valueFrom:
        resourceFieldRef:
          containerName: app
          resource: limits.cpu
```

Common syntax errors include mixing `value` with `valueFrom`, incorrect indentation, and typos in field names.

```yaml
# WRONG - mixing value and valueFrom
env:
- name: BAD_CONFIG
  value: "something"
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: api-key

# WRONG - typo in valueFrom
env:
- name: BAD_CONFIG
  valuFrom:  # Should be valueFrom
    secretKeyRef:
      name: app-secrets
      key: api-key
```

## Validating Volume Mount Configuration

Volume mount errors prevent container configuration. Verify volume definitions and mount paths.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    volumeMounts:
    - name: config-volume  # Must match volume name below
      mountPath: /etc/config
      readOnly: true
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
  - name: secret-volume
    secret:
      secretName: app-secrets
```

Check for common mistakes:

```bash
# Verify volume names match between volumeMounts and volumes
kubectl get pod myapp -o yaml | \
  yq eval '.spec.containers[0].volumeMounts[].name' - | \
  sort > /tmp/mounts.txt

kubectl get pod myapp -o yaml | \
  yq eval '.spec.volumes[].name' - | \
  sort > /tmp/volumes.txt

diff /tmp/mounts.txt /tmp/volumes.txt
```

## Implementing Validation with Admission Webhooks

Create a validating admission webhook that checks configuration before pod creation.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-config-validator
webhooks:
- name: validate-pod-config.example.com
  clientConfig:
    service:
      name: pod-validator
      namespace: validation
      path: /validate-pod
    caBundle: <CA_BUNDLE>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

The webhook validates that:
- Referenced Secrets exist
- Referenced ConfigMaps exist
- All referenced keys exist in Secrets and ConfigMaps
- Volume mount names match volume definitions
- Environment variable syntax is correct

## Using Kustomize for Configuration Management

Kustomize helps prevent configuration errors by generating ConfigMaps and Secrets alongside pod specifications.

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

configMapGenerator:
- name: app-config
  files:
  - config.yaml
  literals:
  - log-level=info

secretGenerator:
- name: app-secrets
  literals:
  - database-password=secretpass123
  - api-key=key_abc123xyz

# Ensure Secrets and ConfigMaps are created before pods
generatorOptions:
  disableNameSuffixHash: false
```

Apply with kustomize to ensure configuration objects exist.

```bash
kubectl apply -k .

# Kustomize creates ConfigMaps and Secrets before applying deployments
```

## Monitoring CreateContainerConfigError Events

Set up alerts for configuration errors to catch issues quickly.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: pod_errors
      rules:
      - alert: CreateContainerConfigError
        expr: |
          kube_pod_container_status_waiting_reason{reason="CreateContainerConfigError"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} has config error"
          description: "Check Secret and ConfigMap references"
```

Create a dashboard tracking configuration errors over time to identify patterns and problem areas.

```bash
# Query CreateContainerConfigError events
kubectl get events -A --field-selector reason=Failed | \
  grep CreateContainerConfigError | \
  awk '{print $5, $6, $7}' | \
  sort | uniq -c | sort -rn
```

CreateContainerConfigError errors are entirely preventable through proper configuration management. By validating Secret and ConfigMap references, using optional flags appropriately, implementing admission webhooks for validation, and leveraging tools like Kustomize, you eliminate these configuration errors before they reach production. Combined with monitoring and alerting, these practices ensure containers start successfully without configuration-related failures.
