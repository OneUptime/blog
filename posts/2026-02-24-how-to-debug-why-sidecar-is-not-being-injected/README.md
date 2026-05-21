# How to Debug Why Sidecar is Not Being Injected

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Debugging, Kubernetes, Service Mesh

Description: Troubleshooting guide for when Istio sidecar proxy is not being automatically injected into your Kubernetes pods.

---

You labeled the namespace, deployed your app, and the pods come up with only one container instead of two. The Istio sidecar didn't get injected. This is a common issue and it almost always comes down to one of a handful of causes. Here's how to figure out which one.

## How Sidecar Injection Works

Istio uses a Kubernetes mutating admission webhook to inject the sidecar. When a pod is created, the API server sends the pod spec to Istio's webhook, which modifies it to add the istio-proxy container. For this to work:

1. The webhook must be registered and healthy
2. The namespace or pod must be labeled for injection
3. The pod must not be excluded from injection
4. The webhook must be reachable from the API server

## Step 1: Check the Namespace Label

The simplest cause: the namespace isn't labeled for injection.

```bash
kubectl get namespace production --show-labels
```

Look for `istio-injection=enabled`. If it's missing:

```bash
kubectl label namespace production istio-injection=enabled
```

Note that Istio also supports revision-based labeling for canary upgrades:

```bash
kubectl get namespace production --show-labels | grep istio.io/rev
```

If you're using revisions, the label is `istio.io/rev=<revision>` instead of `istio-injection=enabled`. If both `istio-injection` and `istio.io/rev` are present on a namespace, Istio gives `istio-injection` precedence, so remove the label you don't intend to use.

## Step 2: Check Pod-Level Labels and Deprecated Annotations

Even if the namespace is labeled, individual pods can opt out of injection:

```bash
kubectl get pod my-pod -n production -o jsonpath='{.metadata.labels}' | python3 -m json.tool
```

Look for:

- `sidecar.istio.io/inject: "false"` - Explicitly disables injection
- This can be set on the pod template in a Deployment, StatefulSet, etc.
- The older `sidecar.istio.io/inject` annotation is deprecated in favor of the label, but it may still appear in older manifests.

If you have older manifests, check annotations too:

```bash
kubectl get pod my-pod -n production -o jsonpath='{.metadata.annotations}' | python3 -m json.tool
```

Check the Deployment template:

```bash
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.metadata.labels}'
```

## Step 3: Verify the Webhook is Registered

Check that the mutating webhook configuration exists:

```bash
kubectl get mutatingwebhookconfiguration | grep istio
```

You should see `istio-sidecar-injector`, `istio-sidecar-injector-<revision>`, or `istio-revision-tag-<tag>`. If it's missing, Istio isn't properly installed.

Look at the webhook configuration:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Check the `namespaceSelector` to understand which namespaces the webhook applies to:

```yaml
namespaceSelector:
  matchExpressions:
    - key: istio-injection
      operator: In
      values:
        - enabled
```

This confirms that only namespaces with `istio-injection=enabled` will get injection.

## Step 4: Check if the Webhook is Reachable

The webhook runs inside istiod. If istiod is down or the API server can't reach it, pod creation usually fails and Kubernetes records the webhook error in the Deployment status and namespace events:

```bash
# Check istiod is running

kubectl get pods -n istio-system -l app=istiod

# Check istiod has endpoints, including the webhook port
kubectl get endpoints istiod -n istio-system
```

On cloud providers, the API server runs outside the cluster and needs firewall rules to reach the webhook. Check for failed injection attempts:

```bash
kubectl get events -n production | grep -i inject
```

On GKE private clusters with an in-cluster control plane, make sure port 15017 is open from the control plane to the nodes (see the Cloud Service Mesh private cluster guide for firewall rule details).

## Step 5: Check for Host Network Pods

Pods running with `hostNetwork: true` skip sidecar injection by default because injecting a sidecar would affect the host's network stack:

```bash
kubectl get pod my-pod -n production -o jsonpath='{.spec.hostNetwork}'
```

If this returns `true`, injection is skipped. This is by design for DaemonSets that need host networking.

## Step 6: Check for Conflicting Labels

Some system pods and namespaces are excluded from injection. Check if your namespace has exclusion labels:

```bash
kubectl get namespace production -o jsonpath='{.metadata.labels}' | python3 -m json.tool
```

Look for labels like:

- `istio-injection=disabled`
- `istio.io/rev=""` (empty revision)

Also check the webhook configuration for exclusion rules:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for wh in data['webhooks']:
  print(f\"Webhook: {wh['name']}\")
  ns = wh.get('namespaceSelector', {})
  obj = wh.get('objectSelector', {})
  if ns:
    print(f'  Namespace selector: {ns}')
  if obj:
    print(f'  Object selector: {obj}')
"
```

## Step 7: Check Pod Owner References

Injection happens when pods are created. If the pod already exists, adding the namespace label won't inject the sidecar. You need to recreate the pods:

```bash
kubectl rollout restart deployment my-app -n production
```

For standalone pods (not managed by a controller), delete and recreate them:

```bash
kubectl delete pod my-pod -n production
kubectl apply -f my-pod.yaml
```

## Step 8: Manual Injection Test

Try manual injection to see if it works:

```bash
kubectl get deployment my-app -n production -o yaml | \
  istioctl kube-inject -f - | \
  kubectl apply -f -
```

If manual injection works but automatic injection doesn't, the problem is with the webhook, not the injection logic.

You can also render the injected manifest to stdout to see what the injector would do:

```bash
istioctl kube-inject -f my-deployment.yaml \
  --injectConfigFile <(kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.config}') \
  --meshConfigFile <(kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}') \
  --valuesFile <(kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.values}')
```

## Step 9: Check Injection Configuration

The injection template is stored in a ConfigMap:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system
```

Check if there are any custom injection policies that might exclude your workload:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.config}' | head -50
```

Look for `neverInjectSelector` or `alwaysInjectSelector` configurations that might match (or not match) your pods.

## Step 10: Check Resource Limits

If the cluster doesn't have enough resources to schedule the sidecar container, the pod might fail to start. Check if the pod is pending:

```bash
kubectl get pods -n production -l app=my-app

kubectl describe pod my-pod -n production | grep -A 5 Events
```

The sidecar adds resource requests (typically 100m CPU and 128Mi memory by default). If your nodes are near capacity, this could prevent scheduling.

## Step 11: Check for Init Container Issues

When the Istio CNI plugin is not installed, injection includes an `istio-init` container that requires NET_ADMIN and NET_RAW capabilities. If your cluster enforces Pod Security Standards that prohibit this:

```bash
kubectl get namespace production -o jsonpath='{.metadata.labels}' | grep "pod-security"
```

If the namespace has `pod-security.kubernetes.io/enforce: baseline` or `pod-security.kubernetes.io/enforce: restricted`, the init container can't run with those capabilities. Solutions:

1. Install the Istio CNI plugin (which eliminates the need for the init container)
2. Use a policy that explicitly allows the required capabilities, such as `privileged` for the affected namespace

## Debugging Checklist

```bash
# 1. Namespace labeled?
kubectl get ns production --show-labels

# 2. Webhook registered?
kubectl get mutatingwebhookconfiguration | grep istio

# 3. Istiod running?
kubectl get pods -n istio-system -l app=istiod

# 4. Pod labels?
kubectl get deploy my-app -n production -o jsonpath='{.spec.template.metadata.labels}'

# 5. Try manual injection
istioctl kube-inject -f my-deployment.yaml | kubectl diff -f -

# 6. Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# 7. Restart the deployment
kubectl rollout restart deployment my-app -n production
```

Sidecar injection failures are frustrating because a namespace or pod that doesn't match the injection policy can come up without a sidecar and you don't notice until something doesn't work. The most common causes are a missing namespace label, a pod label disabling injection, or a webhook connectivity issue. Work through the checklist from top to bottom and you'll find the problem quickly.
