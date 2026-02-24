# How to Fix Istio Sidecar Not Injecting Automatically

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Automation, Troubleshooting, Kubernetes

Description: Fix automatic sidecar injection failures in Istio when the Envoy proxy is not being added to pods despite having injection enabled.

---

You enabled sidecar injection for your namespace, deployed your application, and the pods came up without the istio-proxy container. No error, no warning, just pods running without the mesh. Automatic injection is supposed to be seamless, but there are several reasons it can silently fail.

This guide covers every reason Istio sidecar injection might not work and how to fix each one.

## Verify the Namespace Label

The most common reason for injection not happening is a missing or incorrect namespace label:

```bash
# Check namespace labels
kubectl get namespace production --show-labels
```

You need one of these labels:

```bash
# Standard injection
istio-injection=enabled

# Revision-based injection
istio.io/rev=<revision-name>
```

If the label is missing:

```bash
# Add the injection label
kubectl label namespace production istio-injection=enabled

# For revision-based
kubectl label namespace production istio.io/rev=1-20
```

If both labels are present, remove one:

```bash
# When switching to revision-based, remove the old label
kubectl label namespace production istio-injection-
kubectl label namespace production istio.io/rev=1-20
```

Having both labels simultaneously can cause the webhook to behave unpredictably.

## Check the Mutating Webhook

The sidecar injection webhook must be configured and functioning:

```bash
# List all mutating webhooks
kubectl get mutatingwebhookconfiguration

# Check the Istio webhook details
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Look at the `namespaceSelector` in the webhook configuration:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o jsonpath='{.webhooks[0].namespaceSelector}' | jq .
```

The namespace selector must match your namespace labels. If you see something like:

```json
{
  "matchExpressions": [
    {
      "key": "istio-injection",
      "operator": "In",
      "values": ["enabled"]
    }
  ]
}
```

This means the webhook only applies to namespaces with `istio-injection=enabled`. If your namespace has a different label (like `istio.io/rev`), this webhook will not trigger.

For revision-based injection, look for a webhook like `istio-revision-tag-default` or `istio-sidecar-injector-<revision>`.

## Check if istiod is Running

The webhook needs to call istiod to perform the injection. If istiod is down:

```bash
# Check istiod pods
kubectl get pods -n istio-system -l app=istiod

# If istiod is down, check why
kubectl describe pods -n istio-system -l app=istiod
kubectl logs -n istio-system deployment/istiod --previous
```

If istiod is not running and the webhook failure policy is `Fail`, pod creation will fail entirely. If the failure policy is `Ignore`, pods will be created without sidecars.

Check the failure policy:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o jsonpath='{.webhooks[0].failurePolicy}'
```

## Pod-Level Opt-Out

Individual pods can opt out of injection:

```bash
# Check for the injection annotation on the deployment
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.metadata.annotations}' | jq .
```

If you see `sidecar.istio.io/inject: "false"`, the sidecar will not be injected for that pod. Remove the annotation:

```bash
kubectl patch deployment my-app -n production --type json \
  -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/sidecar.istio.io~1inject"}]'
```

Also check for labels:

```bash
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.metadata.labels}' | jq .
```

The label `sidecar.istio.io/inject: "false"` also prevents injection.

## Existing Pods Do Not Get Sidecars

Sidecar injection only happens when pods are created. If you enabled injection on a namespace that already has running pods, those pods will not automatically get sidecars. You need to restart them:

```bash
# Restart all deployments in the namespace
kubectl rollout restart deployment -n production

# Restart a specific deployment
kubectl rollout restart deployment my-app -n production
```

After the restart, verify the sidecar was injected:

```bash
# Check container count (should be 2+ if sidecar is present)
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name} {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```

## Host Network Pods

Pods that use `hostNetwork: true` cannot have sidecars injected because the iptables rules would affect the entire node:

```bash
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.hostNetwork}'
```

If this returns `true`, Istio intentionally skips injection. You cannot use the sidecar with host networking. Consider redesigning the pod to not use host networking if you need mesh features.

## Job and CronJob Issues

Jobs and CronJobs with sidecars can be problematic because the sidecar keeps running after the job completes, preventing the pod from terminating:

Istio might skip injection for certain workload types. Check if there is a `neverInjectSelector` in the webhook configuration:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.config}' | grep -A 10 "neverInject"
```

For Jobs that do need sidecars, configure the sidecar to exit when the main container exits:

```yaml
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
        - name: my-job
          command:
            - /bin/sh
            - -c
            - |
              # Do the job work
              my-job-command
              # Signal the sidecar to exit
              curl -sf -XPOST http://localhost:15020/quitquitquit
```

## Testing Injection Manually

If automatic injection is not working, you can test manual injection to isolate the problem:

```bash
# Test with istioctl kube-inject
istioctl kube-inject -f my-deployment.yaml | kubectl apply -f -

# Or pipe through kubectl
kubectl get deployment my-app -n production -o yaml | istioctl kube-inject -f - | kubectl apply -f -
```

If manual injection works but automatic does not, the problem is with the webhook, not with the injection logic.

## Checking the Injection Template

The injection behavior is controlled by a ConfigMap:

```bash
# Check the injection configuration
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml
```

Look for the `policy` field:

```yaml
data:
  config: |
    policy: enabled  # Can be "enabled", "disabled", or "always_inject"
```

If policy is `disabled`, injection is off by default and only pods with `sidecar.istio.io/inject: "true"` get sidecars.

## Debugging with Webhook Audit Logs

If you still cannot figure out why injection is not happening, check if the webhook is even being called:

```bash
# Check Kubernetes audit logs (if enabled)
# Look for the injection webhook being called
kubectl logs -n kube-system -l component=kube-apiserver | grep "sidecar-injector"
```

You can also check istiod logs for injection requests:

```bash
kubectl logs -n istio-system deployment/istiod | grep "inject\|skip" | tail -20
```

This shows you whether istiod is receiving injection requests and whether it is deciding to inject or skip.

## Quick Checklist

```bash
# 1. Namespace label correct?
kubectl get ns production --show-labels | grep istio

# 2. Webhook exists?
kubectl get mutatingwebhookconfiguration | grep istio

# 3. istiod running?
kubectl get pods -n istio-system -l app=istiod

# 4. Pod opt-out annotation?
kubectl get deploy my-app -n production -o yaml | grep "sidecar.istio.io"

# 5. Host networking?
kubectl get pod <pod> -n production -o jsonpath='{.spec.hostNetwork}'

# 6. Did you restart the pods after labeling?
kubectl rollout restart deployment -n production
```

Automatic sidecar injection is reliable once everything is set up correctly. The key is making sure the namespace label matches the webhook selector, istiod is healthy, and pods do not have opt-out annotations. After enabling injection, always remember to restart existing pods since injection only happens at pod creation time.
