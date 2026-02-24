# How to Debug Automatic Sidecar Injection Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Kubernetes, Debugging, Service Mesh

Description: Step-by-step guide to diagnosing and fixing issues with automatic sidecar injection in Istio when pods do not get the Envoy proxy.

---

Automatic sidecar injection is one of Istio's most convenient features. You label a namespace, and every new pod automatically gets an Envoy sidecar. Until it does not. When injection fails silently, pods run without the mesh and you lose mTLS, observability, and traffic management for those workloads.

Here is a systematic approach to debugging injection issues.

## Check 1: Is the Namespace Labeled?

The most basic check. Sidecar injection only happens in namespaces that are labeled for it.

```bash
# Check namespace labels
kubectl get namespace my-namespace --show-labels

# Look specifically for the injection label
kubectl get namespace my-namespace -o jsonpath='{.metadata.labels.istio-injection}'
```

If you are using revision-based injection:

```bash
kubectl get namespace my-namespace -o jsonpath='{.metadata.labels.istio\.io/rev}'
```

You should see either `istio-injection=enabled` or `istio.io/rev=<revision-name>`. If neither is present, label the namespace:

```bash
# Standard injection
kubectl label namespace my-namespace istio-injection=enabled

# Revision-based injection
kubectl label namespace my-namespace istio.io/rev=stable
```

Important: if both labels are present, it can cause confusion. Remove the one you are not using:

```bash
# If using revision-based, remove the old label
kubectl label namespace my-namespace istio-injection-
```

## Check 2: Is the Webhook Configured?

Sidecar injection works through a Kubernetes mutating admission webhook. If the webhook is missing or misconfigured, injection will not happen.

```bash
# List mutating webhooks
kubectl get mutatingwebhookconfiguration

# Look for istio-sidecar-injector or istio-revision-tag-*
kubectl get mutatingwebhookconfiguration -o name | grep istio
```

Check the webhook details:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Key things to verify:

```bash
# Check that the webhook service exists
kubectl get svc istiod -n istio-system

# Check that istiod is running
kubectl get pods -n istio-system -l app=istiod

# Check webhook CA bundle is valid
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -text -noout 2>/dev/null | grep "Not After"
```

If the CA bundle has expired, the webhook calls will fail silently. Restart istiod to regenerate certificates:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

## Check 3: Is Injection Being Blocked at the Pod Level?

Individual pods can opt out of injection with annotations:

```bash
# Check if the pod or its template has injection disabled
kubectl get deployment my-app -o yaml | grep "sidecar.istio.io/inject"
```

If you see `sidecar.istio.io/inject: "false"`, that pod will never get a sidecar regardless of namespace labels.

Also check if the pod uses `hostNetwork`:

```bash
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.hostNetwork}'
```

Pods with `hostNetwork: true` are automatically excluded from injection.

## Check 4: Webhook Failure Policy

The webhook configuration has a `failurePolicy` setting that determines what happens when the webhook itself fails (for example, if istiod is down):

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].failurePolicy}'
```

- `Fail`: Pods will not be created if the webhook fails. Safer for security but can block deployments.
- `Ignore`: Pods are created without sidecars if the webhook fails. Less disruptive but can lead to unprotected pods.

The default is usually `Fail`. If istiod is down and pods are not being created at all, this is likely why.

## Check 5: Try Manual Injection

If automatic injection is not working, try manual injection to see if the configuration itself is valid:

```bash
# Manually inject sidecar into a deployment manifest
istioctl kube-inject -f my-deployment.yaml | kubectl apply -f -

# Or inject into a running deployment's output
kubectl get deployment my-app -o yaml | istioctl kube-inject -f - | kubectl apply -f -
```

If manual injection works but automatic does not, the problem is specifically with the webhook mechanism, not with the injection configuration itself.

## Check 6: Examine istiod Logs

istiod handles the webhook requests. Check its logs for injection-related errors:

```bash
# Look for injection logs
kubectl logs -n istio-system -l app=istiod --tail=100 | grep -i "inject\|webhook"

# Look for errors
kubectl logs -n istio-system -l app=istiod --tail=200 | grep -i "error\|fail"
```

Common errors you might see:

- Certificate errors: The TLS certificate for the webhook endpoint is invalid
- Timeout errors: istiod is overloaded and cannot respond to webhook requests in time
- Configuration errors: The injection template has a syntax error

## Check 7: Injection Template Issues

Istio uses a configmap to store the injection template. If someone modified it incorrectly, injection can break:

```bash
# View the injection configmap
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml

# Check for custom injection templates
kubectl get configmap istio-sidecar-injector -n istio-system \
  -o jsonpath='{.data.config}' | head -50
```

If you suspect the template is corrupted, reinstall Istio to restore the default:

```bash
# Reinstall Istio to restore default injection template
istioctl install --set profile=default -y
```

## Check 8: Resource Quotas Blocking Injection

If the namespace has resource quotas and the sidecar would push the pod over the quota, the pod creation fails:

```bash
# Check resource quotas
kubectl get resourcequota -n my-namespace

# Check events for quota-related failures
kubectl get events -n my-namespace --sort-by='.lastTimestamp' | grep -i "quota\|forbidden"
```

Update the resource quota to account for sidecar overhead:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "20"      # Increase to account for sidecars
    requests.memory: 40Gi   # Increase to account for sidecars
    limits.cpu: "40"
    limits.memory: 80Gi
```

## Check 9: Pod Security Standards

If your cluster enforces Pod Security Standards (or the older PodSecurityPolicies), the sidecar init container needs specific capabilities:

```bash
# Check namespace enforcement level
kubectl get namespace my-namespace -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}'
```

The `istio-init` container needs `NET_ADMIN` and `NET_RAW` capabilities. If the namespace enforces `restricted` or `baseline` pod security standards, sidecar injection will fail.

Options:
1. Set the namespace to `privileged` enforcement
2. Use Istio CNI plugin to avoid needing init container privileges

```bash
# Install Istio with CNI plugin (removes need for NET_ADMIN)
istioctl install --set components.cni.enabled=true -y
```

## Debugging Workflow Summary

When sidecar injection is not working, go through these checks in order:

```bash
# 1. Namespace label
kubectl get ns my-namespace --show-labels | grep istio

# 2. Webhook exists
kubectl get mutatingwebhookconfiguration | grep istio

# 3. istiod is running
kubectl get pods -n istio-system -l app=istiod

# 4. Pod-level opt-out
kubectl get deploy my-app -o yaml | grep "sidecar.istio.io"

# 5. Try manual injection
kubectl get deploy my-app -o yaml | istioctl kube-inject -f - > /dev/null && echo "OK"

# 6. Check istiod logs
kubectl logs -n istio-system -l app=istiod --tail=50 | grep error

# 7. Check events
kubectl get events -n my-namespace --sort-by='.lastTimestamp' | tail -20

# 8. Run analysis
istioctl analyze -n my-namespace
```

Most injection issues fall into one of these categories. Work through them methodically and you will find the root cause.
