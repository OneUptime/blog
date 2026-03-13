# How to Understand Istio's Sidecar Injection Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Webhooks, Kubernetes, Admission Controller

Description: A thorough explanation of how Istio's sidecar injection webhook works, how it modifies pod specs, and how to troubleshoot injection issues.

---

Sidecar injection is how Istio adds the Envoy proxy to your pods. Without it, your pods would not be part of the mesh. The injection happens automatically through a Kubernetes mutating admission webhook, which modifies pod specs before they are created. Understanding this mechanism is critical because injection problems are one of the most common issues people run into with Istio.

## How the Webhook Works

Kubernetes has a feature called admission webhooks. These are HTTP callbacks that the API server calls when certain resources are created, updated, or deleted. Istio registers a mutating admission webhook that intercepts pod creation requests.

```bash
kubectl get mutatingwebhookconfiguration
```

```text
NAME                         WEBHOOKS   AGE
istio-sidecar-injector       1          30d
```

Look at the webhook details:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Key parts:

```yaml
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  clientConfig:
    service:
      name: istiod
      namespace: istio-system
      path: /inject
      port: 443
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE"]
    resources: ["pods"]
  namespaceSelector:
    matchLabels:
      istio-injection: enabled
  failurePolicy: Fail
```

This tells Kubernetes: "Whenever a pod is created in a namespace with the `istio-injection=enabled` label, send the pod spec to istiod at `/inject` before creating it."

## What Gets Injected

When the webhook modifies a pod, it adds several things:

### 1. The Init Container

```yaml
initContainers:
- name: istio-init
  image: docker.io/istio/proxyv2:1.20.0
  args:
  - istio-iptables
  - -p
  - "15001"
  - -z
  - "15006"
  - -u
  - "1337"
  - -m
  - REDIRECT
  - -i
  - '*'
  - -x
  - ""
  - -b
  - '*'
  - -d
  - 15090,15021,15020
  securityContext:
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
```

### 2. The Sidecar Container

```yaml
containers:
- name: istio-proxy
  image: docker.io/istio/proxyv2:1.20.0
  args:
  - proxy
  - sidecar
  - --domain
  - $(POD_NAMESPACE).svc.cluster.local
  - --proxyLogLevel=warning
  ports:
  - containerPort: 15090
    name: http-envoy-prom
    protocol: TCP
  env:
  - name: ISTIO_META_POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: ISTIO_META_POD_PORTS
    value: '[{"containerPort":8080}]'
  readinessProbe:
    httpGet:
      path: /healthz/ready
      port: 15021
    initialDelaySeconds: 1
    periodSeconds: 2
  resources:
    limits:
      cpu: 2000m
      memory: 1024Mi
    requests:
      cpu: 10m
      memory: 40Mi
  securityContext:
    runAsUser: 1337
    runAsGroup: 1337
```

### 3. Volumes

```yaml
volumes:
- name: istio-envoy
  emptyDir:
    medium: Memory
- name: istio-data
  emptyDir: {}
- name: istio-token
  projected:
    sources:
    - serviceAccountToken:
        audience: istio-ca
        expirationSeconds: 43200
        path: istio-token
```

## Injection Methods

There are three ways to get sidecar injection:

### Namespace-Level Label

The most common approach. Label the namespace and all new pods get injected:

```bash
kubectl label namespace default istio-injection=enabled
```

### Pod-Level Annotation

Override injection at the pod level:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/inject: "true"
```

Or disable injection for a specific pod in an injected namespace:

```yaml
metadata:
  annotations:
    sidecar.istio.io/inject: "false"
```

### Revision-Based Injection

For canary upgrades, use revision labels:

```bash
kubectl label namespace default istio.io/rev=1-20-0
```

This targets a specific istiod revision, which is useful when running multiple Istio versions side by side.

## The Injection Template

The sidecar injection webhook uses a template to generate the containers and volumes it adds. You can view the template:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.config}' | head -50
```

The template is a Go template that uses pod metadata (labels, annotations, service account) to customize the injected sidecar configuration.

## Customizing Injection

You can customize the injected sidecar using pod annotations:

```yaml
metadata:
  annotations:
    # Set resource limits
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyCPULimit: "500m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"

    # Set log level
    sidecar.istio.io/logLevel: "debug"

    # Exclude specific ports from redirection
    traffic.sidecar.istio.io/excludeInboundPorts: "9090"
    traffic.sidecar.istio.io/excludeOutboundPorts: "3306"

    # Include specific IPs
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.0.0.0/8"
```

Port exclusion is particularly useful for services that need direct connections without going through the sidecar:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "3306,5432,6379"
```

This excludes MySQL (3306), PostgreSQL (5432), and Redis (6379) from the Envoy proxy.

## Verifying Injection

Check if a pod has the sidecar:

```bash
# Look for 2/2 in the READY column (app + sidecar)
kubectl get pods -n default
# NAME         READY   STATUS
# my-app-xyz   2/2     Running

# Verify the containers
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[*].name}'
# my-app istio-proxy

# Check if the init container ran
kubectl get pod my-app-xyz -o jsonpath='{.spec.initContainers[*].name}'
# istio-init
```

## Troubleshooting Injection Issues

### Pod Not Getting Sidecar

If pods are running with only 1/1 containers:

```bash
# Check namespace label
kubectl get namespace default --show-labels | grep istio

# Check if the webhook is active
kubectl get mutatingwebhookconfiguration

# Check for injection-disable annotations on the pod
kubectl get pod my-app-xyz -o jsonpath='{.metadata.annotations}' | python3 -m json.tool
```

Also check if the pod's service account has the annotation to skip injection.

### Injection Webhook Failing

If pod creation fails with webhook errors:

```bash
# Check istiod is running
kubectl get pods -n istio-system -l app=istiod

# Check istiod logs for injection errors
kubectl logs -n istio-system deploy/istiod | grep -i "inject\|webhook"

# Check if istiod's service has endpoints
kubectl get endpoints istiod -n istio-system
```

### Webhook Blocking Pod Creation

If istiod is down and the webhook has `failurePolicy: Fail`, all pod creation in injected namespaces will fail. Emergency fix:

```bash
# Remove the injection label (allows pods to create without sidecar)
kubectl label namespace default istio-injection-

# Or temporarily change the failure policy (not recommended for production)
```

### Using istioctl to Check Injection

```bash
# Check what would be injected for a specific deployment
istioctl kube-inject -f my-deployment.yaml --meshConfigMapName=istio \
    --injectConfigMapName=istio-sidecar-injector -n istio-system
```

This shows the pod spec after injection without actually creating the pod. Useful for debugging.

## Manual Injection

If you cannot use the automatic webhook, you can manually inject sidecars:

```bash
# Inject into a deployment YAML
istioctl kube-inject -f deployment.yaml | kubectl apply -f -

# Or inject from stdin
kubectl get deployment my-app -o yaml | istioctl kube-inject -f - | kubectl apply -f -
```

Manual injection bakes the sidecar into the manifest, so it does not depend on the webhook being available.

## Webhook and Upgrades

During Istio upgrades, the webhook configuration gets updated. If you are doing a canary upgrade with revisions, you will have multiple webhooks active:

```bash
kubectl get mutatingwebhookconfiguration
# istio-sidecar-injector-1-19   1   30d
# istio-sidecar-injector-1-20   1   1d
```

Namespaces with `istio.io/rev=1-19-0` get the old sidecar, and namespaces with `istio.io/rev=1-20-0` get the new one. This is the safest way to upgrade the data plane.

The sidecar injection webhook is the entry point for pods joining the mesh. Understanding what it injects, how to customize it, and how to troubleshoot it will save you a lot of time. Most "Istio is not working" issues trace back to sidecars not being injected or not being configured correctly, and the webhook is always the place to start investigating.
