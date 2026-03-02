# How to Validate Istio CRDs with Admission Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Admission Webhooks, Kubernetes, Validation, CRD

Description: How to use Istio's built-in admission webhooks and external tools to validate Istio custom resources before they are applied to your cluster.

---

Applying a broken VirtualService or DestinationRule can take down your production traffic in seconds. Istio includes admission webhooks that validate resources before they're persisted in etcd, but understanding how they work and how to extend them gives you an extra layer of safety.

## How Istio's Built-in Validation Works

When you install Istio, it registers a ValidatingWebhookConfiguration with the Kubernetes API server. Every time you create or update an Istio resource, the API server sends the resource to istiod for validation before accepting it.

Check the webhook configuration:

```bash
kubectl get validatingwebhookconfiguration istio-validator-istio-system -o yaml
```

The webhook targets the istiod service and validates resources across all Istio API groups:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: istio-validator-istio-system
webhooks:
- name: validation.istio.io
  clientConfig:
    service:
      name: istiod
      namespace: istio-system
      path: /validate
  rules:
  - apiGroups:
    - security.istio.io
    - networking.istio.io
    - telemetry.istio.io
    - extensions.istio.io
    apiVersions:
    - "*"
    operations:
    - CREATE
    - UPDATE
    resources:
    - "*"
  failurePolicy: Fail
```

The `failurePolicy: Fail` means that if the webhook is unreachable (e.g., istiod is down), resource creation will be rejected. This is the safe default for production.

## What Gets Validated

Istio's webhook validates several things:

**Schema validation**: Checks that all fields are valid and properly structured. For example, it rejects a VirtualService with an unknown field in the spec.

**Reference validation**: Checks that referenced objects exist or are valid. For example, if a VirtualService references a Gateway that doesn't match the expected format.

**Logical validation**: Catches logical errors like duplicate route matches, invalid regex patterns, or conflicting configurations.

Here's an example of a resource that would be rejected:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: bad-route
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        port:
          number: -1  # Invalid port number
```

Applying this gives you:

```
Error from server: error when creating "bad-route.yaml": admission webhook "validation.istio.io" denied the request: configuration is invalid: port number -1 is not valid
```

## Testing Validation Without Applying

You can test validation without actually creating the resource:

```bash
kubectl apply -f my-config.yaml --dry-run=server
```

The `--dry-run=server` flag sends the request through the webhook but doesn't persist the resource. This is useful for CI/CD pipelines where you want to validate configurations before deployment.

## Using istioctl for Offline Validation

The `istioctl analyze` command provides deeper analysis than the webhook alone:

```bash
# Analyze a specific file
istioctl analyze my-virtualservice.yaml

# Analyze a namespace
istioctl analyze -n my-namespace

# Analyze the entire cluster
istioctl analyze -A
```

The analyzer checks for things the webhook can't, like:

- VirtualServices referencing gateways that don't exist
- DestinationRules with subsets that don't match any pods
- Conflicting PeerAuthentication policies
- Services without proper port naming

Example output:

```
Warning [IST0101] (VirtualService default/reviews-route) Referenced host not found: "reviews-v3"
Warning [IST0108] (DestinationRule default/reviews) No matching subsets for labels {version: v4}
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection.
```

## Adding Custom Validation with OPA/Gatekeeper

For organization-specific rules, you can add custom validation using OPA Gatekeeper. For example, you might want to enforce that all VirtualServices have timeout configurations:

First, create a ConstraintTemplate:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiovirtualservicetimeout
spec:
  crd:
    spec:
      names:
        kind: IstioVirtualServiceTimeout
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiovirtualservicetimeout

      violation[{"msg": msg}] {
        input.review.object.kind == "VirtualService"
        route := input.review.object.spec.http[_]
        not route.timeout
        msg := sprintf("VirtualService %v must have a timeout configured for each HTTP route", [input.review.object.metadata.name])
      }
```

Then create the constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioVirtualServiceTimeout
metadata:
  name: require-vs-timeout
spec:
  match:
    kinds:
    - apiGroups: ["networking.istio.io"]
      kinds: ["VirtualService"]
```

Now any VirtualService without a timeout on HTTP routes will be rejected.

## Validation with Kyverno

Kyverno is another policy engine that can validate Istio resources:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-istio-retry-policy
spec:
  validationFailureAction: Enforce
  rules:
  - name: check-retries
    match:
      any:
      - resources:
          kinds:
          - networking.istio.io/v1/VirtualService
    validate:
      message: "VirtualService must include retry configuration"
      pattern:
        spec:
          http:
          - retries:
              attempts: ">0"
```

## Handling Webhook Failures

If istiod goes down, the validation webhook can block all Istio resource operations. This can be a problem during recovery scenarios where you need to modify Istio configuration but can't because the validator is down.

To temporarily bypass validation in an emergency:

```bash
kubectl delete validatingwebhookconfiguration istio-validator-istio-system
```

This removes the webhook entirely. Recreate it after istiod is back up by reinstalling or upgrading Istio.

A less drastic option is to change the failure policy:

```bash
kubectl patch validatingwebhookconfiguration istio-validator-istio-system \
  --type='json' -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Ignore"}]'
```

With `failurePolicy: Ignore`, the webhook failure won't block operations. But be careful since this means invalid resources can slip through.

## Integrating Validation in CI/CD

A solid CI/CD pipeline should validate Istio resources at multiple stages:

**Pre-commit**: Use `istioctl analyze` on local files:

```bash
# In a pre-commit hook or Makefile
istioctl analyze manifests/istio/ --use-kube=false
```

The `--use-kube=false` flag validates against the file contents without connecting to a cluster.

**Pull request checks**: Run validation in your CI system:

```bash
# GitHub Actions example
- name: Validate Istio configs
  run: |
    istioctl analyze manifests/istio/ --use-kube=false
    if [ $? -ne 0 ]; then
      echo "Istio configuration validation failed"
      exit 1
    fi
```

**Pre-deployment**: Use dry-run against the target cluster:

```bash
kubectl apply -f manifests/istio/ --dry-run=server
```

## Monitoring Webhook Performance

The admission webhook adds latency to resource creation. Monitor this to ensure it doesn't become a bottleneck:

```bash
kubectl get --raw /metrics | grep apiserver_admission_webhook_admission_duration_seconds
```

If the webhook is consistently slow, it usually means istiod is under pressure. Check its resource usage and consider scaling it.

A well-configured validation pipeline catches misconfigurations before they impact your mesh. Use the built-in webhook for schema validation, `istioctl analyze` for deeper analysis, and policy engines like Gatekeeper or Kyverno for organization-specific rules. Together, they form a solid defense against bad configurations reaching your cluster.
