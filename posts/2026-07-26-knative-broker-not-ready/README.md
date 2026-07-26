# Knative Broker Not Ready: Diagnose Channel and Data-Plane Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Kubernetes, Broker, Troubleshooting, CloudEvent, Kafka

Description: Diagnose a Knative Broker that is not Ready by following status conditions through class configuration, backing resources, and data-plane health.

---

A Knative Broker becomes `Ready=True` only after its controller has reconciled the selected Broker implementation and published an address. A `Ready=False` or `Ready=Unknown` Broker means that at least one implementation-specific readiness dependency is unresolved. Start with the Broker's status and configuration before sending test events.

Broker internals differ substantially between the `MTChannelBasedBroker`, `Kafka` or `KafkaNamespaced`, `RabbitMQBroker`, and vendor-specific classes. First identify the class, then inspect resources owned by that implementation.

## Capture the Broker Status Without Editing It

Begin with the full resource:

```bash
namespace=production
broker=commerce

kubectl -n "$namespace" get broker "$broker" -o yaml
kubectl -n "$namespace" describe broker "$broker"
kubectl -n "$namespace" events --for "broker/$broker"
```

Record:

- `metadata.generation`;
- `status.observedGeneration`;
- every condition's `type`, `status`, `reason`, and `message`;
- the complete `status.address`, including `url`, `audience`, and `CACerts` when present;
- the `eventing.knative.dev/broker.class` annotation;
- `spec.config`;
- recent Kubernetes events.

The Eventing API documents `observedGeneration`, conditions, and address as Broker status. If `observedGeneration` is behind `metadata.generation`, the controller has not processed the latest specification. Wait briefly only if a rollout is in progress; otherwise investigate controller health and logs.

If `Ready=True` but delivery fails, skip to data-plane testing. If `Ready=False`, the failing condition and its message are the shortest path to the responsible layer.

## Resolve the Effective Broker Class and Configuration

Inspect the class annotation directly:

```bash
kubectl -n "$namespace" get broker "$broker" \
  -o jsonpath='{.metadata.annotations.eventing\.knative\.dev/broker\.class}{"\n"}'

kubectl -n "$namespace" get broker "$broker" \
  -o jsonpath='{.spec.config}{"\n"}'
```

If the class or configuration is absent, inspect the defaults:

```bash
kubectl -n knative-eventing get configmap config-br-defaults -o yaml
```

The `config-br-defaults` ConfigMap can define cluster and namespace defaults for Broker class and configuration. Defaults are applied when a Broker is created; changing them does not automatically migrate existing resources.

Verify that:

- the selected Broker implementation is installed;
- the class string uses the exact spelling expected by that implementation;
- the referenced configuration object exists at the stated namespace and name;
- its `apiVersion` and `kind` are correct;
- the Broker controller can read it;
- secrets, bootstrap addresses, and backing-system credentials referenced by that configuration exist.

Do not replace `spec.config` with an arbitrary configuration object from another Broker class. Different classes require different kinds and schemas; for example, `MTChannelBasedBroker` and the `Kafka` class use ConfigMaps, while `RabbitMQBroker` uses a `RabbitmqBrokerConfig` custom resource.

## Diagnose an MTChannelBasedBroker

An MTChannelBasedBroker needs a Channel implementation. Its referenced configuration ConfigMap must contain `channel-template-spec`, for example:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: broker-channel
  namespace: production
data:
  channel-template-spec: |
    apiVersion: messaging.knative.dev/v1beta1
    kind: KafkaChannel
    spec:
      numPartitions: 6
      replicationFactor: 3
```

Check that the specified Channel CRD and controller exist:

```bash
kubectl api-resources | grep -i channel
kubectl get crd | grep -i channel
kubectl -n knative-eventing get deployment,pod
```

Then find the Channel owned by the Broker and the relevant shared Services. Set `channel_resource` to the exact plural resource name reported by `kubectl api-resources` for the kind in `channel-template-spec`; for the example above, it is `kafkachannels.messaging.knative.dev`:

```bash
channel_resource=kafkachannels.messaging.knative.dev
kubectl -n "$namespace" get "$channel_resource" -o yaml
kubectl get service,endpointslices.discovery.k8s.io -A
```

For each candidate Channel, inspect `metadata.ownerReferences`, status conditions, address, and events. Use the Broker's published hostname and the implementation documentation to identify shared Services and their EndpointSlices, which can live in `knative-eventing` rather than the Broker's namespace. A missing CRD, an unavailable Channel controller, an invalid channel template, or a backing Channel that is not Ready prevents Broker reconciliation.

The default MTChannelBasedBroker is commonly backed by InMemoryChannel. Knative explicitly says InMemoryChannel should not be used in production. Replacing it is an architectural migration, not an incident-time one-line patch; plan and test the production Broker implementation beforehand.

## Diagnose a Native Broker

For a native Kafka or RabbitMQ Broker, inspect that implementation's configuration resources, controller, ingress or receiver, dispatcher, and backing cluster. Names and labels vary by release, so discover them:

```bash
kubectl api-resources | grep -Ei 'broker|kafka|rabbit'
kubectl -n knative-eventing get deployment,pod
kubectl -n "$namespace" get broker,trigger -o yaml
```

Query any implementation-specific resource names returned by `kubectl api-resources` explicitly. `kubectl get all` only includes resource types assigned to the `all` category; it is not a complete inventory of custom resources.

Common readiness blockers include:

- controller image or CRD versions do not match;
- a configuration or secret reference is missing;
- the backing cluster hostname cannot resolve;
- TLS trust, SASL credentials, or access-control rules fail;
- a Kafka topic cannot be created or described;
- replication factor exceeds available brokers;
- ingress, receiver, or dispatcher pods cannot schedule;
- an admission webhook rejects the implementation's generated resources.

Use the implementation's official documentation for its exact resource names and logs. A healthy generic Eventing controller does not prove that a separately installed Kafka controller is healthy.

## Check the Eventing Control Plane

Inspect controllers and webhook before debugging the subscriber:

```bash
kubectl -n knative-eventing get deployment,pod
kubectl -n knative-eventing events
kubectl -n knative-eventing logs -l app=eventing-controller \
  --since=30m --tail=-1 --all-containers=true
```

Also collect logs from the controller for the selected Broker or Channel implementation. Filter by the Broker namespace, name, and UID where possible. Look for reconciliation errors, forbidden API calls, missing resources, invalid configuration, and repeated work-queue retries.

If status is completely absent rather than explicitly false, confirm:

```bash
kubectl get crd brokers.eventing.knative.dev
kubectl auth can-i list brokers.eventing.knative.dev \
  --as=system:serviceaccount:knative-eventing:eventing-controller \
  -n "$namespace"
kubectl auth can-i watch brokers.eventing.knative.dev \
  --as=system:serviceaccount:knative-eventing:eventing-controller \
  -n "$namespace"
kubectl auth can-i update brokers.eventing.knative.dev \
  --subresource=status \
  --as=system:serviceaccount:knative-eventing:eventing-controller \
  -n "$namespace"
```

The actual service-account name can differ for an alternative Broker controller. Retrieve it from that controller Deployment rather than assuming it uses `eventing-controller`.

Check webhook endpoints and logs if applying or updating the Broker fails:

```bash
kubectl -n knative-eventing get deployment,service,endpointslices.discovery.k8s.io \
  | grep -i webhook
```

Certificate expiry, unreachable webhook endpoints, or an API/CRD version skew can block reconciliation across many Eventing resources.

## Inspect the Published Address and Data Plane

When the Broker reaches `Ready=True`, it should expose `status.address.url`:

```bash
broker_url=$(kubectl -n "$namespace" get broker "$broker" \
  -o jsonpath='{.status.address.url}')
printf '%s\n' "$broker_url"
```

Run a test from inside the cluster because the address is often cluster-local. The simple probe below assumes the address needs neither a private CA nor sender authentication. If `status.address.CACerts` is present, pass that CA bundle to curl with `--cacert`; if `status.address.audience` is present, obtain an OIDC token for that audience from an authorized identity and send it in an `Authorization: Bearer` header.

```bash
kubectl -n "$namespace" run event-debug \
  --image=curlimages/curl:8.12.1 \
  --restart=Never --rm -i --command -- \
  curl -v --fail-with-body -X POST "$broker_url" \
    -H 'Ce-Specversion: 1.0' \
    -H 'Ce-Type: com.example.readiness.test' \
    -H 'Ce-Source: urn:debug:broker' \
    -H 'Ce-Id: broker-ready-001' \
    -H 'Content-Type: application/json' \
    --data '{"probe":true}'
```

Use an image approved and mirrored by your organization. A successful 2xx ingress response means the Broker accepted the CloudEvent; it does not prove that a Trigger matched or that a subscriber acknowledged delivery.

If DNS, connection, or TLS fails, inspect:

- the Service and EndpointSlices behind the address;
- receiver and dispatcher pod readiness;
- NetworkPolicy and service-mesh authorization;
- transport-encryption and sender-identity configuration;
- cluster DNS from the producer namespace.

Do not manually edit generated Services or addresses. Fix the owning resource or controller.

## Separate Readiness from Delivery

Use this boundary:

- **Broker not Ready or no address:** configuration, class controller, backing Channel or broker, generated resource, or control-plane problem.
- **Broker Ready, ingress request fails:** receiver, Service, DNS, policy, authentication, or backing data-plane problem.
- **Ingress accepts event, subscriber receives nothing:** Trigger filter, Trigger registration, routing, or subscriber-delivery problem.

This prevents an unrelated subscriber restart from obscuring a Broker configuration error.

## Recovery Checklist

1. Save the Broker YAML, events, generation, conditions, and class.
2. Resolve the exact default or explicit configuration.
3. Verify the chosen implementation's CRDs, controllers, and service accounts.
4. Follow owner references to the first generated resource that is not Ready.
5. Correlate controller logs using namespace, name, UID, and reconciliation time.
6. Fix one configuration or dependency issue and wait for reconciliation; if the Broker specification changed, confirm that `status.observedGeneration` catches up.
7. Confirm `Ready=True` and a non-empty address.
8. Send a known in-cluster CloudEvent, then continue through Trigger and subscriber diagnostics.

Avoid deleting and recreating a production Broker as a first response. Depending on the implementation, that can remove backing resources, change addresses, or interrupt queued events while erasing the status evidence needed to find the root cause.

## Official Documentation

- [Knative creating a Broker](https://knative.dev/docs/eventing/brokers/create-broker/)
- [Knative Eventing API](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Broker defaults](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative channel-based Broker](https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/)
- [Knative Eventing troubleshooting](https://knative.dev/docs/eventing/troubleshooting/)
- [Knative Eventing logs](https://knative.dev/docs/eventing/observability/logging/collecting-logs/)
