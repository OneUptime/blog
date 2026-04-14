# How to Fix Dapr Sidecar Injection Issues on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Troubleshooting, Sidecar Injection, Webhook

Description: Diagnose and fix Dapr sidecar injection failures caused by namespace labels, webhook configuration, and annotation typos on Kubernetes.

---

## How Sidecar Injection Works

Dapr uses a Kubernetes MutatingAdmissionWebhook to inject the daprd sidecar. When a pod is created with `dapr.io/enabled: "true"`, the webhook intercepts the request and adds the sidecar container. If injection fails silently, the pod runs without the sidecar.

## Verify the Webhook Is Running

```bash
# Check the sidecar injector pod
kubectl get pods -n dapr-system -l app=dapr-sidecar-injector

# Check the webhook configuration
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector -o yaml

# View injector logs
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=50
```

## Check Namespace Label

Dapr's default installation does not require namespace labels for sidecar injection — the pod annotation `dapr.io/enabled: "true"` is sufficient. However, if the webhook is configured with a namespace selector (for example, via Helm values), injection only occurs in namespaces matching the selector:

```bash
# Check your namespace labels
kubectl get namespace default --show-labels

# Add a label if your webhook requires it
kubectl label namespace default dapr-enabled=true

# Or check what selector the webhook uses
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector \
  -o jsonpath='{.webhooks[0].namespaceSelector}'
```

## Verify Pod Annotations

A common cause of missing injection is annotation typos:

```bash
# Check the pod's annotations
kubectl get pod myapp-xxxxxxxxx -o jsonpath='{.metadata.annotations}'

# Correct annotation format:
# dapr.io/enabled: "true"  (case-insensitive, but "1" does not work)
# dapr.io/app-id: "myapp"  (no spaces, valid DNS name recommended)
# dapr.io/app-port: "8080" (quoting is recommended YAML practice)
```

## Debug with a Test Pod

```yaml
# test-injection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-injection
  namespace: default
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "test-app"
    dapr.io/app-port: "80"
spec:
  containers:
  - name: nginx
    image: nginx:alpine
```

```bash
kubectl apply -f test-injection.yaml
kubectl get pod test-injection
# Should show 2/2 READY if injection works

kubectl describe pod test-injection | grep -E "daprd|sidecar|dapr"
```

## Check for Webhook TLS Issues

```bash
# Check webhook certificate expiry
kubectl get secret dapr-sidecar-injector-cert -n dapr-system -o yaml | \
  grep "tls.crt" | awk '{print $2}' | base64 -d | openssl x509 -noout -dates

# If expired, renew certificates first, then restart to pick up new certs
dapr mtls renew-certificate -k
kubectl rollout restart deployment/dapr-sidecar-injector -n dapr-system
```

## Check Admission Controller Logs

```bash
# Look for injection errors in API server container logs
kubectl logs -n kube-system -l component=kube-apiserver --tail=100 | \
  grep -i "dapr\|webhook\|admission"
```

## Summary

Dapr sidecar injection failures are most commonly caused by annotation typos, webhook namespace selector misconfiguration, or webhook TLS certificate expiry. Always verify the sidecar injector pod is running, check whether a namespace selector is configured, and confirm annotations use correct values. When TLS certificates expire, renew them with `dapr mtls renew-certificate` and restart the sidecar injector to pick up the new certificates.
