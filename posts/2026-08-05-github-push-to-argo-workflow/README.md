# From GitHub Push to Argo Workflow with Argo Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Argo Workflows, GitHub Webhooks, Kubernetes, EventSource, EventBus, Sensor, Ingress

Description: Wire a GitHub push through an Argo Events EventSource, EventBus, Sensor, Service, and Ingress into a reusable Argo WorkflowTemplate.

---

A GitHub-to-Argo pipeline has two distinct traffic paths. GitHub sends HTTPS to an `EventSource` pod through an Ingress and Service. Inside the cluster, that EventSource publishes a normalized CloudEvent to an `EventBus`; a `Sensor` consumes it and creates a Workflow.

Treat each hop as an independently testable contract:

```text
GitHub
  -> HTTPS Ingress
  -> Service
  -> GitHub EventSource
  -> EventBus
  -> Sensor
  -> Kubernetes API
  -> Workflow referencing WorkflowTemplate
```

This guide uses the Argo-managed GitHub EventSource. It can register the repository webhook when given GitHub API credentials, or receive a manually configured webhook without an API token. The webhook secret is separate from the API credential: the API credential authorizes webhook management, while `webhookSecret` validates incoming GitHub signatures.

## Establish Namespaces and Prerequisites

Assume Argo Events and Argo Workflows are installed, their CRDs exist, and both controllers are configured to watch resources in the `argo-events` namespace. Check the relevant resources:

```bash
kubectl api-resources | grep -E 'eventbus|eventsources|sensors|workflowtemplates|workflows|workflowtaskresults'
kubectl -n argo-events get deploy
kubectl -n argo get deploy
```

The exact installation manifests are versioned release assets. Pin versions in production rather than applying a moving `stable` or `latest` URL without review.

Create the EventBus before EventSources and Sensors depend on it. This minimal JetStream resource asks the Argo Events controller to create a three-replica NATS JetStream deployment by default:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventBus
metadata:
  name: default
  namespace: argo-events
spec:
  jetstream:
    version: 2.10.29
    persistence:
      storageClassName: standard
      accessMode: ReadWriteOnce
      volumeSize: 10Gi
```

`version` is a NATS Server version allowed by the `argo-events-controller-config` ConfigMap. The value above is an example, not a universal recommendation. Select a version supported by the controller release you installed:

```bash
kubectl -n argo-events get configmap argo-events-controller-config -o yaml
kubectl -n argo-events apply -f eventbus.yaml
kubectl -n argo-events wait --for=condition=Deployed eventbus/default --timeout=180s
kubectl -n argo-events rollout status statefulset/eventbus-default-js --timeout=180s
```

The current CRD has a `Deployed` condition, but the controller sets it after creating the JetStream resources, not after proving that every NATS replica is ready. That is why the StatefulSet rollout check is separate. The exact condition and generated workload name can vary with installed versions, so inspect `kubectl describe eventbus default` and `kubectl get statefulset` if either command does not match your release.

## Store GitHub Credentials Separately

Generate a high-entropy webhook secret and store it with `stringData` or `kubectl create secret`; Kubernetes encodes `data`, it does not encrypt it by itself.

```bash
kubectl -n argo-events create secret generic github-hook \
  --from-literal=secret='replace-with-a-high-entropy-random-value'
```

If Argo Events should create and maintain the repository webhook, also provide either an appropriately scoped GitHub token through `apiToken` or GitHub App credentials through `githubApp`. Do not put that credential in the same Git manifest. If the hook is created manually in GitHub, omit both `apiToken` and `githubApp`; the EventSource can still validate deliveries using `webhookSecret`.

## Define the GitHub EventSource

The following resource listens on `/push`, declares `push` for an Argo-managed hook, and references the validation secret:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: github
  namespace: argo-events
spec:
  eventBusName: default
  service:
    ports:
      - name: github
        port: 12000
        targetPort: 12000
  github:
    push:
      repositories:
        - owner: example-org
          names:
            - example-repo
      webhook:
        endpoint: /push
        port: "12000"
        method: POST
        url: https://events.example.com
      events:
        - push
      webhookSecret:
        name: github-hook
        key: secret
      contentType: json
      insecure: false
```

If both `apiToken` and `githubApp` are omitted, configure the payload URL (`https://events.example.com/push`), JSON content type, event selection, activation state, and the identical secret in GitHub yourself. In current Argo Events code, automatic hook creation requires either supported API credential and a nonempty `webhook.url`; `active` controls the GitHub hook created through that API and does not activate the local HTTP route. The local route is activated by the EventSource process. This manually managed example therefore omits `active`. A manually managed hook already knows its payload URL, but retaining the public base URL in `webhook.url` documents the intended endpoint and will become significant if API credentials and `active: true` are later added: Argo Events appends `webhook.endpoint` when it registers the hook.

When Argo Events manages the hook, `insecure` maps to GitHub's `insecure_ssl` hook setting. Keep it `false` so GitHub verifies the inbound endpoint's TLS certificate. It neither enables HTTPS on the EventSource nor changes TLS verification for Argo Events' GitHub API client.

Apply and observe the controller-created pod and Service:

```bash
kubectl -n argo-events apply -f github-eventsource.yaml
kubectl -n argo-events get eventsource github
kubectl -n argo-events get pods -l eventsource-name=github
kubectl -n argo-events get service github-eventsource-svc
```

The `spec.service` convenience field creates a service and is useful in straightforward installations. The Argo Events service documentation recommends managing a native Kubernetes Service yourself for external exposure. If you do that, remove `spec.service` and use selector `eventsource-name: github`.

## Expose Only the Webhook Endpoint

A generic `networking.k8s.io/v1` Ingress can route the public host to the EventSource Service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: github-events
  namespace: argo-events
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - events.example.com
      secretName: events-example-com-tls
  rules:
    - host: events.example.com
      http:
        paths:
          - path: /push
            pathType: Exact
            backend:
              service:
                name: github-eventsource-svc
                port:
                  number: 12000
```

The annotation shown is specific to ingress-nginx. Other controllers have different TLS, timeout, source-address, and body-size settings. The TLS Secret must exist in the Ingress namespace. Terminating TLS at the Ingress is common; alternatively, `WebhookContext` supports server certificate and key Secret selectors for TLS at the EventSource. Avoid accidentally encrypting twice without configuring the upstream protocol correctly.

Restrict the exposed path, apply a NetworkPolicy where supported, and use a valid publicly trusted certificate. GitHub recommends HTTPS with certificate verification enabled.

## Keep Workflow Logic in a WorkflowTemplate

Create the reusable workflow independently. Give its pods a dedicated service account; on Argo Workflows 3.4 and later, the Emissary executor needs `create` and `patch` access to `workflowtaskresults`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-build
  namespace: argo-events
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: github-build-executor
  namespace: argo-events
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflowtaskresults"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: github-build-executor
  namespace: argo-events
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: github-build-executor
subjects:
  - kind: ServiceAccount
    name: github-build
    namespace: argo-events
---
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: build-revision
  namespace: argo-events
spec:
  serviceAccountName: github-build
  entrypoint: main
  arguments:
    parameters:
      - name: repository
      - name: revision
      - name: delivery-id
  templates:
    - name: main
      container:
        image: alpine:3.24
        command: [sh, -c]
        args:
          - >-
            printf 'repo=%s revision=%s delivery=%s\n'
            '{{workflow.parameters.repository}}'
            '{{workflow.parameters.revision}}'
            '{{workflow.parameters.delivery-id}}'
```

Pin application images by digest when reproducibility matters. The command only demonstrates parameter flow.

## Grant the Sensor Narrow Permissions

The Sensor pod needs permission to create Workflows. It also needs to get the referenced WorkflowTemplate when submission resolves it. Use a dedicated service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-workflow-trigger
  namespace: argo-events
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: github-workflow-trigger
  namespace: argo-events
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "get", "list"]
  - apiGroups: ["argoproj.io"]
    resources: ["workflowtemplates"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: github-workflow-trigger
  namespace: argo-events
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: github-workflow-trigger
subjects:
  - kind: ServiceAccount
    name: github-workflow-trigger
    namespace: argo-events
```

Argo Events' Workflow trigger uses the `argo` CLI internally and then lists the submitted Workflow by generated labels. Exact required verbs can change with operation and release. Confirm them with `kubectl auth can-i` and an audit log rather than granting `*` permanently.

## Filter Pushes and Parameterize the Workflow

GitHub EventSource data contains the request payload under `body` and headers under `headers`. A push payload includes `ref`, `after`, and repository data. This Sensor admits only pushes to the default branch and maps stable fields into template arguments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: github-push
  namespace: argo-events
spec:
  eventBusName: default
  template:
    serviceAccountName: github-workflow-trigger
  dependencies:
    - name: push
      eventSourceName: github
      eventName: push
      filters:
        data:
          - path: headers.X-Github-Event.0
            type: string
            value:
              - '^push$'
          - path: body.ref
            type: string
            value:
              - '^refs/heads/main$'
  triggers:
    - template:
        name: submit-build
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: github-build-
              spec:
                workflowTemplateRef:
                  name: build-revision
                arguments:
                  parameters:
                    - name: repository
                      value: unset
                    - name: revision
                      value: unset
                    - name: delivery-id
                      value: unset
          parameters:
            - src:
                dependencyName: push
                dataKey: body.repository.full_name
              dest: spec.arguments.parameters.0.value
            - src:
                dependencyName: push
                dataKey: body.after
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: push
                dataKey: headers.X-Github-Delivery.0
              dest: spec.arguments.parameters.2.value
```

Argo Events data paths use GJSON-style paths, and destination paths use SJSON-style paths. The GitHub EventSource serializes Go's `http.Header`, so each header value is a JSON array. The `.0` selects the first value for the event filter and delivery-ID Workflow parameter. Header spelling reflects Go's canonicalized key in the current official example. Capture one real event in a nonproduction Sensor log or a log trigger and verify paths against your installed release.

## Test One Hop at a Time

After applying the template, RBAC, and Sensor:

```bash
kubectl -n argo-events get eventbus,eventsource,sensor
kubectl -n argo-events logs -l eventsource-name=github --tail=100
kubectl -n argo-events logs -l sensor-name=github-push --tail=100
kubectl -n argo-events get workflows -l events.argoproj.io/sensor=github-push
```

Use GitHub's webhook delivery page to inspect the response code and delivery ID. A `2xx` from the EventSource proves ingress and signature acceptance, not successful Sensor matching or Workflow creation. Trace the same `X-GitHub-Delivery` value through logs and the workflow parameter.

Common boundaries are easy to distinguish:

- no GitHub delivery attempt: hook configuration or subscribed event problem;
- DNS, TLS, or timeout error: public ingress path problem;
- `400` or signature error: webhook secret mismatch or payload mutation;
- EventSource accepts but Sensor sees nothing: EventBus or dependency-name mismatch;
- Sensor logs an invalid event: header or data-filter path mismatch;
- Sensor trigger is forbidden: service account RBAC;
- Workflow exists but fails: Argo Workflows or workload logic, not ingestion.

GitHub can redeliver webhook deliveries, and ambiguous failures can produce retries elsewhere. Use `X-GitHub-Delivery` as an idempotency key in the real workflow rather than treating one observed delivery as proof of exactly-once execution.

## Official Documentation

- [Argo Events GitHub EventSource](https://argoproj.github.io/argo-events/eventsources/setup/github/)
- [Argo Events EventSource services](https://argoproj.github.io/argo-events/eventsources/services/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events data filters](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [GitHub webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitHub webhook security practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)

## Conclusion

Build the path as six explicit contracts: public HTTPS, Service routing, GitHub EventSource validation, EventBus delivery, Sensor matching, and Workflow submission. Keep workflow logic in a template, grant the Sensor only target permissions, carry GitHub's delivery ID into the workload, and test every boundary independently.
