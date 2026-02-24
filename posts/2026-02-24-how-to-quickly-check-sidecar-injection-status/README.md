# How to Quickly Check Sidecar Injection Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Kubernetes, Troubleshooting, Service Mesh

Description: Practical commands and techniques to verify Istio sidecar proxy injection status for pods, deployments, and namespaces.

---

Sidecar injection is one of the most fundamental parts of Istio. If a pod does not have the Istio sidecar (envoy proxy), it cannot participate in the mesh, which means no mTLS, no traffic management, and no telemetry. When something is not working right, checking sidecar injection status is usually one of the first things to do.

Here are the quick and effective ways to verify that sidecars are being injected where they should be.

## Check if a Namespace Has Injection Enabled

Istio uses namespace labels to control automatic sidecar injection. Check the label on a namespace:

```bash
kubectl get namespace default --show-labels
```

Look for `istio-injection=enabled` in the labels. If it is there, all new pods created in that namespace will get a sidecar automatically.

To check all namespaces at once:

```bash
kubectl get namespaces -L istio-injection
```

This adds an `ISTIO-INJECTION` column to the output:

```
NAME              STATUS   AGE   ISTIO-INJECTION
default           Active   30d   enabled
kube-system       Active   30d
istio-system      Active   30d
backend           Active   15d   enabled
frontend          Active   15d   enabled
```

Namespaces without the label in that column do not have automatic injection enabled.

## Check Using the Revision Label

If you are using Istio revision labels (common with canary upgrades), the label is different:

```bash
kubectl get namespaces -L istio.io/rev
```

This shows which revision each namespace is using:

```
NAME              STATUS   AGE   REV
default           Active   30d   1-22
backend           Active   15d   1-22
staging           Active   10d   1-21
```

A namespace with a revision label gets injection from that specific Istio control plane revision.

## Check if a Specific Pod Has a Sidecar

The simplest way to check if a pod has the sidecar is to look at the container count:

```bash
kubectl get pods -n default
```

```
NAME                      READY   STATUS    RESTARTS   AGE
my-app-7f8c9d6b5-abc12   2/2     Running   0          1h
db-client-5c8b7d-def34   1/1     Running   0          1h
```

A pod showing `2/2` in the READY column has two containers (your app plus the istio-proxy sidecar). A pod showing `1/1` has only one container and is missing the sidecar.

For a more explicit check, list the containers in a pod:

```bash
kubectl get pod my-app-7f8c9d6b5-abc12 -n default -o jsonpath='{.spec.containers[*].name}'
```

If the sidecar is injected, you will see `istio-proxy` in the list:

```
my-app istio-proxy
```

## Check Sidecar Status for All Pods in a Namespace

To quickly find pods that are missing sidecars in a namespace:

```bash
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}' | grep -v istio-proxy
```

This lists all pods and their containers, then filters for those that do not have `istio-proxy`. Any pods that show up are missing the sidecar.

A cleaner approach:

```bash
kubectl get pods -n default -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for pod in data['items']:
    containers = [c['name'] for c in pod['spec']['containers']]
    has_sidecar = 'istio-proxy' in containers
    name = pod['metadata']['name']
    if not has_sidecar:
        print(f'MISSING SIDECAR: {name}')
"
```

## Use istioctl to Check Injection

The `istioctl` tool has built-in commands for checking injection status:

```bash
istioctl analyze -n default
```

This will report any pods that should have sidecars but do not:

```
Warning [IST0103] (Pod my-app-abc123.default) The pod is missing the Istio proxy.
```

For a more targeted check:

```bash
istioctl proxy-status
```

This lists every sidecar proxy that is connected to the control plane. If a pod is not in this list, it either does not have a sidecar or the sidecar is not connecting to istiod.

## Check the Injection Webhook

Sidecar injection is done by a mutating admission webhook. Verify it is configured:

```bash
kubectl get mutatingwebhookconfiguration -l app=sidecar-injector
```

If this returns nothing, the injection webhook is not installed, and no automatic injection will happen.

Check the webhook details:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Look at the `namespaceSelector` to see which namespaces the webhook applies to. It typically matches on the `istio-injection=enabled` label.

## Check Why Injection Failed

If a pod should have a sidecar but does not, check the pod's annotations for clues:

```bash
kubectl get pod my-app-abc123 -n default -o jsonpath='{.metadata.annotations}' | python3 -m json.tool
```

Look for the `sidecar.istio.io/status` annotation. If injection succeeded, it contains JSON with details about the injected containers. If it is absent, injection did not happen.

Common reasons injection fails:

1. **Namespace not labeled**: The most common cause. Add the label:
   ```bash
   kubectl label namespace default istio-injection=enabled
   ```

2. **Pod created before labeling**: Existing pods do not get retroactive injection. You need to restart them:
   ```bash
   kubectl rollout restart deployment my-app -n default
   ```

3. **Pod has injection disabled**: Check for the annotation `sidecar.istio.io/inject: "false"` on the pod or deployment:
   ```bash
   kubectl get deploy my-app -n default -o jsonpath='{.spec.template.metadata.annotations}'
   ```

4. **Host networking**: Pods using `hostNetwork: true` cannot have sidecars because the network namespace is shared with the host.

5. **Init containers conflict**: In rare cases, init containers can interfere with the sidecar init container.

## Check the Sidecar Proxy Version

Once you confirm a sidecar exists, check what version it is running:

```bash
kubectl get pod my-app-abc123 -n default -o jsonpath='{.metadata.annotations.sidecar\.istio\.io/status}' | python3 -m json.tool
```

Or directly check the container image:

```bash
kubectl get pod my-app-abc123 -n default -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].image}'
```

This returns something like `docker.io/istio/proxyv2:1.22.0`.

## Check Sidecar Resource Usage

While you are checking injection status, it is a good idea to also verify the sidecar resource limits:

```bash
kubectl get pod my-app-abc123 -n default -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}' | python3 -m json.tool
```

If resources are not set properly, the sidecar might be OOMKilled or throttled, which causes mesh connectivity problems.

## Quick Status Script

Here is a script that gives you a complete injection status overview for a namespace:

```bash
#!/bin/bash
NS=${1:-default}

echo "=== Namespace injection label ==="
kubectl get namespace $NS --show-labels | grep -o 'istio-injection=[a-z]*' || echo "NOT SET"

echo ""
echo "=== Pod sidecar status ==="
kubectl get pods -n $NS -o custom-columns=\
NAME:.metadata.name,\
READY:.status.containerStatuses[*].ready,\
CONTAINERS:.spec.containers[*].name,\
STATUS:.status.phase

echo ""
echo "=== Pods missing sidecar ==="
for pod in $(kubectl get pods -n $NS -o jsonpath='{.items[*].metadata.name}'); do
  containers=$(kubectl get pod $pod -n $NS -o jsonpath='{.spec.containers[*].name}')
  if [[ ! "$containers" == *"istio-proxy"* ]]; then
    echo "  $pod"
  fi
done
```

Run it with `./check-injection.sh default` and you get a clear picture of which pods have sidecars and which ones do not. This saves a lot of back-and-forth when troubleshooting injection issues.
