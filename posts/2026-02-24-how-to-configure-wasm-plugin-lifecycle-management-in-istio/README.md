# How to Configure Wasm Plugin Lifecycle Management in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Wasm, WebAssembly, Service Mesh, Kubernetes, Envoy

Description: Learn how to manage the full lifecycle of Wasm plugins in Istio including deployment, updates, rollback, and cleanup strategies.

---

WebAssembly (Wasm) plugins give you a powerful way to extend Envoy proxies in Istio without rebuilding them from scratch. But deploying a Wasm plugin is just the beginning. You also need to think about how you update them, roll them back when things go wrong, and clean up old versions. That whole process is what we call lifecycle management, and getting it right matters a lot for production stability.

## Understanding Wasm Plugin Lifecycle Phases

A Wasm plugin goes through several phases during its life in an Istio mesh:

1. **Build and Package** - You compile your plugin to a `.wasm` binary and package it into an OCI image.
2. **Deploy** - You create a WasmPlugin resource that tells Istio where to fetch the binary and how to configure it.
3. **Update** - When you push a new version, Istio pulls the updated binary and applies it to the proxies.
4. **Rollback** - If something breaks, you revert to a previous known-good version.
5. **Cleanup** - You remove the plugin when it is no longer needed.

Each of these phases requires careful configuration.

## Deploying a Wasm Plugin with Version Pinning

The first thing you want to do is pin your plugin to a specific version. Never use `latest` tags in production. Here is a basic WasmPlugin resource with a pinned version:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/auth:v1.2.3
  phase: AUTHN
  pluginConfig:
    allowed_paths:
      - "/healthz"
      - "/readyz"
  imagePullPolicy: IfNotPresent
```

The `imagePullPolicy` field controls how aggressively Istio fetches the binary. For production, `IfNotPresent` is a solid default because it caches the image locally and only pulls if it is missing. During development you might want `Always` so you pick up changes faster.

## Configuring Image Pull Secrets

If your Wasm plugin is stored in a private OCI registry, you need to provide pull credentials:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/auth:v1.2.3
  phase: AUTHN
  imagePullPolicy: IfNotPresent
  imagePullSecret: registry-credentials
```

The secret should be a standard Kubernetes `docker-registry` type secret:

```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n istio-system
```

## Rolling Updates with SHA256 Pinning

Version tags can be overwritten (someone could push a different image under the same tag). For the highest level of confidence, pin to the SHA256 digest of the image:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/auth@sha256:abc123def456...
  phase: AUTHN
  imagePullPolicy: IfNotPresent
```

When you want to update, change the digest to point to the new version. This gives you an immutable reference to exactly what code is running.

## Implementing a Canary Update Strategy

You do not want to push a new Wasm plugin version to every proxy at once. A canary approach works well. Start by deploying the new version to a small subset of workloads:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin-canary
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
      track: canary
  url: oci://registry.example.com/wasm-plugins/auth:v1.3.0
  phase: AUTHN
  pluginConfig:
    allowed_paths:
      - "/healthz"
      - "/readyz"
```

Label a small number of your pods with `track: canary` and monitor their behavior. If everything looks good, update the main WasmPlugin resource to the new version and remove the canary.

## Configuring Failure Strategy

What happens when a Wasm plugin fails to load or crashes during execution? Istio lets you control this with the `failStrategy` field:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-auth-plugin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://registry.example.com/wasm-plugins/auth:v1.2.3
  phase: AUTHN
  failStrategy: FAIL_OPEN
```

The two options are:

- `FAIL_CLOSE` - Requests are rejected if the plugin cannot be loaded. This is the safer option for security plugins.
- `FAIL_OPEN` - Requests pass through even if the plugin is broken. This is better for observability or logging plugins where dropping data is acceptable but blocking traffic is not.

Choose based on what your plugin does. Authentication plugins should almost always use `FAIL_CLOSE`.

## Rolling Back a Wasm Plugin

When you need to roll back, the process depends on how you manage your configuration. If you are using GitOps (and you should be), reverting is just reverting the commit that changed the version.

For manual rollback, update the WasmPlugin resource to point to the previous version:

```bash
kubectl patch wasmplugin my-auth-plugin -n istio-system \
  --type merge \
  -p '{"spec":{"url":"oci://registry.example.com/wasm-plugins/auth:v1.2.3"}}'
```

You can verify the rollback took effect by checking the proxy configuration:

```bash
istioctl proxy-config extension my-service-pod-xyz -n default
```

This shows which Wasm extensions are loaded on a given pod.

## Monitoring Plugin Health

After any lifecycle event (deploy, update, rollback), you should check that the plugin is working correctly. Watch the Envoy access logs for errors:

```bash
kubectl logs my-service-pod-xyz -c istio-proxy | grep "wasm"
```

Also check the istiod logs for any issues pushing configuration to the proxies:

```bash
kubectl logs -l app=istiod -n istio-system | grep "wasm"
```

Envoy exposes Wasm-related metrics that you can scrape with Prometheus:

- `envoy_wasm_envoy_wasm_runtime_null_active` - Number of active Wasm VMs
- `envoy_wasm_envoy_wasm_runtime_null_created` - Total Wasm VMs created

## Cleaning Up Old Plugins

When you no longer need a Wasm plugin, remove the WasmPlugin resource:

```bash
kubectl delete wasmplugin my-auth-plugin -n istio-system
```

This tells Istio to stop loading the plugin on the affected proxies. The change propagates through the control plane and proxies will drop the extension on their next configuration update.

If you had multiple versions deployed (for canary testing), make sure to clean up all of them:

```bash
kubectl get wasmplugin -A
kubectl delete wasmplugin my-auth-plugin-canary -n istio-system
```

## Automating Lifecycle with CI/CD

The best way to manage Wasm plugin lifecycles is through automation. A typical CI/CD pipeline looks like this:

1. Build the Wasm binary in CI
2. Push the OCI image to your registry with a version tag and SHA digest
3. Update the WasmPlugin manifest in your GitOps repository
4. Let ArgoCD or Flux apply the change to the cluster
5. Run integration tests against the canary deployment
6. Promote to full rollout if tests pass

This keeps everything auditable and reversible through Git history.

## Summary

Wasm plugin lifecycle management in Istio requires attention at every stage. Pin your versions (preferably with SHA digests), use canary deployments for updates, set appropriate failure strategies, and automate the whole process through CI/CD. Monitoring plugin health after every change is not optional - it is how you catch problems before your users do. With these practices in place, you can confidently extend your Istio mesh with custom Wasm plugins without worrying about stability.
