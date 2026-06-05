# How to Fix cert-manager Not Being Installed Before the OpenTelemetry Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cert-Manager, Operator, Webhook

Description: Fix webhook TLS errors caused by installing the OpenTelemetry Operator before cert-manager is properly configured.

The OpenTelemetry Operator relies on cert-manager to provision TLS certificates for its webhook server by default. If you install the Operator before cert-manager is running, the webhook certificates or CA bundles may not be created correctly, and pod creation in your cluster can start failing with webhook errors.

## The Error

When cert-manager is missing or not ready, you will see errors like this when trying to create pods:

```text
Error from server (InternalError): Internal error occurred: failed calling webhook
"mpod.kb.io": failed to call webhook: Post
"https://opentelemetry-operator-webhook.opentelemetry-operator-system.svc:443/mutate-v1-pod":
x509: certificate signed by unknown authority
```

Or:

```text
Error from server (InternalError): Internal error occurred: failed calling webhook
"mpod.kb.io": failed to call webhook: Post
"https://opentelemetry-operator-webhook.opentelemetry-operator-system.svc:443/mutate-v1-pod":
dial tcp 10.96.x.x:443: connect: connection refused
```

This is not just an OTel problem. It can block ALL pod creation in your cluster if the webhook's `failurePolicy` is set to `Fail`.

## Step 1: Check cert-manager Status

```bash
# Is cert-manager installed?

kubectl get pods -n cert-manager

# Are the cert-manager CRDs installed?
kubectl get crd | grep cert-manager

# Check if cert-manager is issuing certificates successfully
kubectl get certificates -A
kubectl get certificaterequests -A
```

## Step 2: Install cert-manager First

If cert-manager is not installed, install it before the Operator:

```bash
# Install cert-manager using Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait  # Wait until cert-manager is fully ready
```

The `--wait` flag is important. It ensures Helm does not return until cert-manager pods are running and ready.

```bash
# Verify cert-manager is ready
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-cainjector -n cert-manager --timeout=120s
```

## Step 3: Install the OpenTelemetry Operator

Now install the Operator:

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --wait
```

## Fixing an Existing Broken Installation

If you already installed the Operator without cert-manager, follow these steps:

```bash
# 1. Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait

# 2. Re-apply the Operator release so its Certificate and webhook resources are present
helm upgrade --install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --wait

# 3. Restart the Operator
kubectl rollout restart deployment/opentelemetry-operator \
  -n opentelemetry-operator-system

# 4. Wait for the webhook certificate to be issued
kubectl wait --for=condition=Ready certificate/opentelemetry-operator-serving-cert \
  -n opentelemetry-operator-system --timeout=120s

# 5. Verify the webhook is working
kubectl get mutatingwebhookconfiguration opentelemetry-operator-mutation -o yaml | \
  grep caBundle | head -1 | awk '{print length($2)}'
# Should return a number > 0 (the CA bundle should be populated)
```

## Emergency Recovery: Disable the Webhook

If the broken webhook is blocking all pod creation and you need to recover immediately:

```bash
# Option 1: Change the webhook failure policy to Ignore
kubectl patch mutatingwebhookconfiguration \
  opentelemetry-operator-mutation \
  --type='json' -p='[{"op": "replace", "path": "/webhooks/2/failurePolicy", "value": "Ignore"}]'

# Option 2: Delete the webhook configuration entirely (auto-instrumentation will stop working)
kubectl delete mutatingwebhookconfiguration \
  opentelemetry-operator-mutation
```

After recovery, fix the root cause (install cert-manager) and then reinstall the Operator.

## Using the Operator Without cert-manager

If you cannot use cert-manager, the Operator supports self-signed certificates. Configure this in the Helm values:

```yaml
# values.yaml for the Operator Helm chart
admissionWebhooks:
  certManager:
    enabled: false
  autoGenerateCert:
    enabled: true  # Use self-managed certificates instead of cert-manager
```

```bash
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  -f values.yaml \
  --wait
```

## Automating the Order with Helm

If you manage your cluster with Helm, install cert-manager as its own release before installing the Operator:

```bash
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait

helm upgrade --install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system \
  --create-namespace \
  --wait
```

Do not embed cert-manager as a subchart of your application chart. cert-manager installs cluster-scoped resources and should be installed exactly once in the cluster. Combining separate releases with `--wait` gives you a reliable deployment order.

The key lesson: always check the prerequisites before installing the Operator. The cert-manager dependency is well-documented but easy to miss, especially when copying installation commands from blog posts or tutorials.
