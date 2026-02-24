# How to Configure Custom Sidecar Injection Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar Injection, Custom Templates, Envoy

Description: Learn how to create and apply custom sidecar injection templates in Istio to tailor the Envoy proxy configuration for specific workload requirements.

---

Istio's default sidecar injection template works well for most cases, but there are situations where you need to customize what gets injected. Maybe you need to add extra volumes, set specific environment variables, modify security contexts, or add additional containers alongside the sidecar. Custom injection templates give you that flexibility without forking the Istio codebase.

This guide shows you how to create, test, and deploy custom injection templates.

## How Injection Templates Work

The sidecar injection template is a Go template stored in the `istio-sidecar-injector` ConfigMap in the `istio-system` namespace. When a pod is created, the webhook renders this template using the pod's metadata and the Istio configuration as input, producing a JSON patch that modifies the pod spec.

The template has access to:
- Pod metadata (labels, annotations, namespace)
- Istio mesh configuration
- Proxy configuration (from annotations or global defaults)
- Values from the Istio installation

## Viewing the Default Template

Start by looking at the existing template:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.templates}'
```

This is long and complex. The key section is the `sidecar` template which defines the istio-proxy container, init container, and volumes.

## Using Custom Templates via IstioOperator

The recommended way to customize injection is through the IstioOperator's `sidecarInjectorWebhook` configuration. You can define custom templates that extend or override the default:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        custom-logging: |
          spec:
            containers:
            - name: istio-proxy
              env:
              - name: ISTIO_META_CUSTOM_LOG_LEVEL
                value: "debug"
              volumeMounts:
              - name: custom-log-config
                mountPath: /etc/istio/custom-log
            volumes:
            - name: custom-log-config
              configMap:
                name: envoy-log-config
```

To use this custom template on specific pods, add the `inject.istio.io/templates` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-service
spec:
  template:
    metadata:
      annotations:
        inject.istio.io/templates: sidecar,custom-logging
    spec:
      containers:
      - name: app
        image: my-app:latest
```

The value `sidecar,custom-logging` means "apply the default sidecar template, then overlay the custom-logging template on top."

## Adding Extra Volumes to the Sidecar

A common customization is mounting additional volumes into the sidecar. For example, mounting custom certificates:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        custom-certs: |
          spec:
            containers:
            - name: istio-proxy
              volumeMounts:
              - name: custom-certs
                mountPath: /etc/custom-certs
                readOnly: true
            volumes:
            - name: custom-certs
              secret:
                secretName: my-custom-certs
```

Then on your deployment:

```yaml
metadata:
  annotations:
    inject.istio.io/templates: sidecar,custom-certs
```

## Modifying the Security Context

Some environments have strict security requirements. You can customize the sidecar's security context:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        restricted-security: |
          spec:
            containers:
            - name: istio-proxy
              securityContext:
                runAsNonRoot: true
                runAsUser: 1337
                runAsGroup: 1337
                allowPrivilegeEscalation: false
                capabilities:
                  drop:
                  - ALL
                seccompProfile:
                  type: RuntimeDefault
                readOnlyRootFilesystem: true
```

## Adding Sidecar Environment Variables

You can inject environment variables into the Envoy sidecar for various configuration purposes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        debug-envoy: |
          spec:
            containers:
            - name: istio-proxy
              env:
              - name: ENVOY_LOG_LEVEL
                value: "debug"
              - name: ISTIO_META_DNS_CAPTURE
                value: "true"
              - name: ISTIO_META_DNS_AUTO_ALLOCATE
                value: "true"
```

## Conditional Templates Using Go Template Syntax

The injection template supports Go template syntax, so you can add conditional logic based on pod labels or annotations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        conditional-resources: |
          spec:
            containers:
            - name: istio-proxy
            {{- if index .ObjectMeta.Labels "high-traffic" }}
              resources:
                requests:
                  cpu: 500m
                  memory: 512Mi
                limits:
                  cpu: 2000m
                  memory: 1Gi
            {{- else }}
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi
            {{- end }}
```

Then label your high-traffic pods:

```yaml
metadata:
  labels:
    high-traffic: "true"
```

## Adding Init Containers

You can add custom init containers that run alongside the default istio-init container:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      templates:
        custom-init: |
          spec:
            initContainers:
            - name: custom-setup
              image: busybox:latest
              command:
              - /bin/sh
              - -c
              - "echo 'Custom initialization complete'"
              securityContext:
                runAsUser: 0
```

## Testing Custom Templates

Before deploying custom templates to production, test them locally:

```bash
# Create a test pod YAML
cat <<EOF > test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-injection
  namespace: my-namespace
  labels:
    app: test
  annotations:
    inject.istio.io/templates: sidecar,custom-logging
spec:
  containers:
  - name: app
    image: nginx:latest
EOF

# Test injection
istioctl kube-inject -f test-pod.yaml -o yaml | kubectl diff -f -
```

This shows you exactly what the injection will produce without actually creating the pod.

## Debugging Template Rendering

If your custom template isn't producing the expected result, enable debug logging on istiod:

```bash
istioctl admin log --level injection:debug
```

Then create a test pod and check istiod logs:

```bash
kubectl logs -n istio-system -l app=istiod | grep -i inject
```

Common template issues:
- **YAML indentation errors**: Templates are sensitive to indentation. A single space off and the rendered YAML is invalid.
- **Missing template variables**: Using a variable that doesn't exist produces empty output.
- **Merge conflicts**: When combining multiple templates, later templates override earlier ones. Container-level fields are merged by container name.

## Reverting to Default Templates

If a custom template causes problems, you can quickly revert to the default by removing the annotation from your pods:

```bash
kubectl patch deployment my-app -n my-namespace --type=json -p='[{"op":"remove","path":"/spec/template/metadata/annotations/inject.istio.io~1templates"}]'
```

Then trigger a rollout:

```bash
kubectl rollout restart deployment my-app -n my-namespace
```

## Template Best Practices

Keep custom templates minimal. Only include the fields you need to override. The merge behavior combines your template with the default sidecar template, so you don't need to duplicate everything.

Version control your templates alongside your IstioOperator configuration. When you upgrade Istio, review your custom templates against the new default template to make sure they're still compatible.

Test template changes in a non-production namespace first. A broken injection template can prevent all pods in affected namespaces from starting, which is a quick path to an outage.

Name your templates descriptively. Using names like `custom-logging`, `high-perf-proxy`, or `restricted-security` makes it clear what each template does when you see the annotation on a deployment.
