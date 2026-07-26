# How to Deliver Knative Events Across Kubernetes Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Kubernetes, Namespace, Broker, Trigger, RBAC, NetworkPolicy

Description: Route Knative events to cross-namespace sinks and distinguish that stable pattern from alpha cross-namespace Broker and Channel subscriptions.

---

There are two different cross-namespace requirements in Knative Eventing:

1. a Trigger stays beside its Broker but delivers to a sink in another namespace
2. the Trigger itself lives in another namespace and subscribes to a remote Broker

The first uses a normal `Destination.ref.namespace`. The second uses the alpha `cross-namespace-event-links` feature and additional RBAC. Treating them as the same feature leads to unnecessary cluster-wide changes.

## Prefer a Trigger Beside the Broker

Keep the Broker and Trigger in `event-hub`, then name the subscriber namespace explicitly:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: invoice-created-to-ledger
  namespace: event-hub
spec:
  broker: shared
  filter:
    attributes:
      type: com.example.invoice.created.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: ledger
      namespace: finance
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: event-dead-letter
        namespace: operations
```

Knative resolves the Addressable object and records the destination:

```bash
kubectl get broker shared -n event-hub
kubectl get trigger invoice-created-to-ledger -n event-hub \
  -o jsonpath='{.status.subscriberUri}{"\n"}'
kubectl get ksvc ledger -n finance \
  -o jsonpath='{.status.address.url}{"\n"}'
```

Require the Trigger to be Ready and verify that `status.subscriberUri` names the intended namespace. Omitting `ref.namespace` defaults the reference to the namespace of the Trigger.

This layout centralizes routing ownership. It also avoids enabling the alpha event-link feature merely to reach a remote subscriber.

## Allow the Data Plane Through NetworkPolicy

Kubernetes object resolution does not grant network reachability. A default-deny policy must admit every data-plane hop that reaches protected Pods. For a Kubernetes Service subscriber, that can be the Eventing dispatcher. For the Knative Service shown here, requests first pass through the configured Knative Serving ingress or HTTP router and can pass through the Activator before reaching the workload's queue-proxy. A policy selecting the `ledger` workload Pods must therefore allow the applicable Serving components; allowing only the Eventing dispatcher is insufficient.

The Eventing component that sends the request toward the subscriber depends on the Broker class:

- shared Kafka Broker dispatchers normally run in `knative-eventing`
- `KafkaNamespaced` dispatchers run in the Broker namespace
- `MTChannelBasedBroker` traffic comes through its backing Channel and Broker components

Identify the real Pods before writing selectors:

```bash
kubectl get broker shared -n event-hub -o yaml
kubectl get pods -A \
  -l app.kubernetes.io/part-of=knative-eventing \
  --show-labels
kubectl get pods -n knative-eventing --show-labels
kubectl get pods -n knative-serving --show-labels
```

Use namespace and Pod selectors that match your installed release, and inspect the namespace used by the installed Serving networking layer. Do not copy guessed labels into a production NetworkPolicy. If egress is isolated, also allow DNS and any service-mesh identity path required by the cluster.

## Put a Trigger in a Different Namespace Only When Needed

Current Knative documentation marks cross-namespace event links as alpha and disabled by default. An administrator must enable:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-features
  namespace: knative-eventing
data:
  cross-namespace-event-links: enabled
```

The upstream `brokerRef` path is currently implemented for `MTChannelBasedBroker`. The Knative Kafka Broker controllers still resolve `spec.broker` in the Trigger's own namespace and do not support remote `brokerRef` Triggers. For a supported Broker, the remote Trigger uses `brokerRef` rather than the same-namespace `broker` string:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: shared-invoices
  namespace: finance
spec:
  brokerRef:
    apiVersion: eventing.knative.dev/v1
    kind: Broker
    name: shared
    namespace: event-hub
  filter:
    attributes:
      type: com.example.invoice.created.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: ledger
```

The identity creating that Trigger needs the special `knsubscribe` verb on the Broker in `event-hub`, in addition to permission to create Triggers in `finance`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: subscribe-to-shared-broker
  namespace: event-hub
rules:
  - apiGroups:
      - eventing.knative.dev
    resources:
      - brokers
    resourceNames:
      - shared
    verbs:
      - knsubscribe
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: finance-event-admins-subscribe
  namespace: event-hub
subjects:
  - kind: Group
    name: finance-event-admins
    apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: subscribe-to-shared-broker
```

Test whether an identity has both permissions:

```bash
kubectl auth can-i create triggers.eventing.knative.dev \
  -n finance --as=finance-operator@example.com \
  --as-group=finance-event-admins
kubectl auth can-i knsubscribe brokers.eventing.knative.dev/shared \
  -n event-hub --as=finance-operator@example.com \
  --as-group=finance-event-admins
```

Because this API is alpha, confirm the field names, supported Broker and Channel implementations, and upgrade behavior against the exact installed Knative release before adopting it.

## Secure the Namespace Boundary

Namespaces are administrative boundaries, not automatic event authorization. Establish:

- who may publish to the shared Broker
- who may create or modify its Triggers
- which event types and data classifications may cross the boundary
- whether sender identity or service-mesh authorization is required
- per-team quotas and backpressure limits
- dead-letter ownership and replay authorization

CloudEvent context attributes can be logged and inspected by intermediaries. Do not place secrets or sensitive payload fields in attributes just because they are convenient for filtering.

## Troubleshoot Cross-Namespace Delivery

```bash
kubectl describe trigger invoice-created-to-ledger -n event-hub
kubectl get events -n event-hub --sort-by=.lastTimestamp
kubectl get ksvc ledger -n finance
kubectl get service ledger -n finance -o yaml
kubectl get revision -n finance
kubectl get networkpolicy -n finance
```

Interpret common symptoms:

- reference resolution failure: check `apiVersion`, `kind`, name, namespace, and Addressable readiness
- admission denial for `brokerRef`: enable the alpha feature and grant `knsubscribe`
- Trigger Ready but delivery times out: inspect NetworkPolicy, mesh authorization, DNS, and subscriber readiness
- `403` from subscriber path: fix workload or mesh authorization; changing the CloudEvent does not grant access
- unexpected remote target: inspect the resolved `status.subscriberUri`, not only the desired manifest

Use one Broker per namespace unless shared routing has a concrete governance benefit. Fewer objects are not worth weakening tenant boundaries.

## Official Documentation

- [Knative sinks and Destination namespace behavior](https://knative.dev/docs/eventing/sinks/)
- [Knative cross-namespace event links](https://knative.dev/docs/eventing/features/cross-namespace-event-links/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Kafka Broker data-plane modes](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
