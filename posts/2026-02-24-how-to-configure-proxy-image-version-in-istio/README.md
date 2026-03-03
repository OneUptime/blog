# How to Configure Proxy Image Version in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy Image, Envoy, Version Management, Kubernetes

Description: How to configure and override the sidecar proxy image version in Istio for canary testing, version pinning, and controlled upgrades across your mesh.

---

Istio's sidecar proxy runs the Envoy-based `proxyv2` image. By default, every sidecar uses the same image version that matches the Istio control plane version. But there are legitimate reasons to override this: canary testing a new proxy version on specific workloads, pinning a version during a phased upgrade, or using a custom-built proxy image with additional filters. Istio gives you several ways to control which proxy image each workload uses.

## Default Proxy Image Behavior

When you install Istio, the sidecar injector is configured with a default proxy image. Every injected pod gets this image unless you override it. The image is typically:

```text
docker.io/istio/proxyv2:<istio-version>
```

You can check the current default:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.values}' | jq '.global.proxy.image'
```

Or check what a running pod uses:

```bash
kubectl get pod -l app=my-service -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].image}'
```

## Overriding the Image Per Pod

Use the `sidecar.istio.io/proxyImage` annotation to override the proxy image for a specific workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: canary-service
  template:
    metadata:
      labels:
        app: canary-service
      annotations:
        sidecar.istio.io/proxyImage: "docker.io/istio/proxyv2:1.21.0"
    spec:
      containers:
      - name: canary-service
        image: my-app:1.0
        ports:
        - containerPort: 8080
```

```bash
kubectl apply -f canary-service.yaml
```

Verify the image:

```bash
kubectl get pod -l app=canary-service -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].image}'
```

## Setting the Default Image Version

To change the default proxy image for all new sidecars, update the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        image: proxyv2
      tag: "1.20.0"
      hub: "docker.io/istio"
```

The proxy image is constructed from `hub/image:tag`. So the example above produces `docker.io/istio/proxyv2:1.20.0`.

```bash
istioctl install -f istio-config.yaml
```

After changing the default, existing pods keep their current image until they are restarted.

## Using a Custom Proxy Image

If you build a custom Envoy image with additional filters or patches, you can point Istio to use it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      hub: "my-registry.example.com/istio"
      tag: "1.20.0-custom"
```

Or per workload:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyImage: "my-registry.example.com/istio/proxyv2:1.20.0-custom"
```

Make sure your custom image is based on the same Envoy version that Istio expects, otherwise configuration incompatibilities can cause the proxy to crash or behave unpredictably.

## Canary Testing a New Proxy Version

When upgrading Istio, it's smart to test the new proxy version on a small number of workloads before rolling it out to the entire mesh. Here is a phased approach:

**Step 1: Upgrade the control plane to the new version**

```bash
istioctl upgrade -f istio-new-version.yaml
```

The control plane now runs the new version, but existing sidecars still run the old version.

**Step 2: Pin a test workload to the new proxy version**

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyImage: "docker.io/istio/proxyv2:1.21.0"
```

Restart the test workload to pick up the new proxy:

```bash
kubectl rollout restart deployment canary-service
```

**Step 3: Monitor the test workload**

```bash
# Check proxy version
kubectl exec -l app=canary-service -c istio-proxy -- pilot-agent request GET /server_info | jq '.version'

# Watch for errors in proxy logs
kubectl logs -l app=canary-service -c istio-proxy --tail=100

# Check Envoy stats
kubectl exec -l app=canary-service -c istio-proxy -- pilot-agent request GET /stats | grep -E "upstream_cx_connect_fail|upstream_rq_5xx"
```

**Step 4: Gradually roll out to more workloads**

Once confident, restart workloads namespace by namespace:

```bash
kubectl rollout restart deployment -n default
kubectl rollout restart deployment -n production
```

## Version Compatibility

The Istio proxy version should be compatible with the control plane version. Istio supports a version skew of +/- 1 minor version. So if your control plane is version 1.20, your proxies can be 1.19, 1.20, or 1.21.

Check version compatibility:

```bash
# Control plane version
istioctl version

# Proxy versions across the mesh
istioctl proxy-status
```

The `istioctl proxy-status` output shows each proxy's version and whether it's in sync with the control plane.

## Checking for Mixed Versions

In a cluster with mixed proxy versions, verify what versions are running:

```bash
# List all proxy versions
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.spec.containers[?(@.name=="istio-proxy")].image}{"\n"}{end}' | sort | uniq -c
```

This gives you a count of each proxy image version across the cluster.

## Init Container Image

The init container (`istio-init`) also uses the proxy image. When you override the proxy image, the init container image is not automatically updated. To keep them in sync:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyImage: "docker.io/istio/proxyv2:1.21.0"
```

The init container uses the same `proxyv2` image but runs the `istio-iptables` binary instead of `pilot-agent`. If you are using a custom image, make sure both binaries are present.

## Image Pull Policies

Control how Kubernetes pulls the proxy image:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      imagePullPolicy: IfNotPresent
```

Options are:
- `Always` - pull the image every time a pod starts (good for mutable tags like `latest`)
- `IfNotPresent` - use the cached image if available (good for immutable version tags)
- `Never` - never pull, only use cached images

For production, use `IfNotPresent` with specific version tags. Avoid `latest` tags.

## Private Registry Configuration

If your proxy images are in a private registry, configure image pull secrets:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      hub: "my-private-registry.example.com/istio"
      imagePullSecrets:
      - my-registry-secret
```

Make sure the secret exists in the namespace where pods are deployed:

```bash
kubectl create secret docker-registry my-registry-secret \
  --docker-server=my-private-registry.example.com \
  --docker-username=user \
  --docker-password=pass \
  -n default
```

Or use a ServiceAccount with the pull secret attached:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
imagePullSecrets:
- name: my-registry-secret
```

## Rollback Strategy

If a new proxy version causes issues, rollback is straightforward:

```yaml
# Pin the workload back to the old version
metadata:
  annotations:
    sidecar.istio.io/proxyImage: "docker.io/istio/proxyv2:1.20.0"
```

```bash
kubectl rollout restart deployment problematic-service
```

For mesh-wide rollback, revert the IstioOperator and restart all workloads:

```bash
istioctl install -f istio-old-config.yaml
kubectl rollout restart deployment --all -n default
```

## Troubleshooting Image Issues

Common problems with proxy images:

```bash
# Image pull failures
kubectl describe pod <pod-name> | grep -A 5 "Failed"

# Check if the image exists
docker pull docker.io/istio/proxyv2:1.21.0

# Verify image digest
kubectl get pod -l app=my-service -o jsonpath='{.items[0].status.containerStatuses[?(@.name=="istio-proxy")].imageID}'
```

If you see `ImagePullBackOff`:
- Verify the image tag exists
- Check registry authentication
- Ensure the node can reach the registry
- Check for rate limiting (Docker Hub has pull rate limits)

Managing proxy image versions gives you control over the upgrade process and the ability to test new versions safely. The key is to always keep proxy versions within the supported skew of the control plane, and to test thoroughly before rolling out changes mesh-wide.
