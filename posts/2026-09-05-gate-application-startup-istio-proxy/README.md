# The Application Starts Before Istio Proxy: Gate Startup with `holdApplicationUntilProxyStarts` or Native Sidecars

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Envoy, Sidecar Containers, Pod Lifecycle, Startup, Troubleshooting

Description: Prevent startup races between an application and its Istio proxy by choosing an Istio hold hook or Kubernetes native sidecar ordering.

---

A normal Kubernetes Pod does not guarantee that one regular container becomes ready before another starts. An application can therefore open database connections, fetch configuration, or publish a leader-election lease while `istio-proxy` is still bootstrapping. Because an injected Pod's CNI or `istio-init` capture setup precedes regular containers, those first calls are normally redirected to an unready Envoy and may reset or time out. Missing capture is a separate CNI/init failure; startup gating does not repair it.

There are two distinct controls for this race:

- Istio's `holdApplicationUntilProxyStarts` adds a blocking `postStart` hook to the legacy proxy container, delaying later application startup while it waits for the proxy's status endpoint to become ready, subject to the hook's timeout.
- Kubernetes native sidecars model a long-running sidecar as a restartable init container, giving kubelet an ordered startup lifecycle.

Neither option means all remote dependencies are healthy. The goal is narrower: do not let the application race ahead of its local proxy.

## Prove It Is a Startup Race

Before changing lifecycle behavior, align timestamps from the application, proxy, Pod events, and the first failed request:

```bash
kubectl -n orders describe pod orders-api-66bd54c9f7-j8xrn
kubectl -n orders logs orders-api-66bd54c9f7-j8xrn \
  -c orders-api --timestamps --since=15m
kubectl -n orders logs orders-api-66bd54c9f7-j8xrn \
  -c istio-proxy --timestamps --since=15m
```

Inspect declared container types, probes, and injected metadata:

```bash
kubectl -n orders get pod orders-api-66bd54c9f7-j8xrn -o json |
  jq '{initContainers: [.spec.initContainers[]? | {name,restartPolicy}],
       containers: [.spec.containers[] | {name,readinessProbe,startupProbe}],
       annotations: .metadata.annotations}'
```

A failure only in the first few seconds, followed by stable traffic without a restart, supports the race hypothesis. Continuous failures, an absent proxy in `istioctl proxy-status`, or empty clusters point instead to xDS, routing, or policy. Do not hide those failures with a long application sleep.

Also establish which part is racing:

1. Istio traffic-capture rules must exist.
2. `pilot-agent` and Envoy must start.
3. Envoy must obtain enough configuration to be ready.
4. The application must begin dependency traffic.

Istio CNI installs capture during Pod network setup; without it, `istio-init` installs rules before regular containers. Startup gating controls steps 2 through 4, not whether the node's CNI is correctly installed.

## Option 1: Hold Application Containers Until Proxy Startup

The mesh-wide option is part of the default proxy configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Use the installation method supported by your Istio distribution to apply that value. A change to injected Pod shape or bootstrap affects newly created Pods; it does not rewrite existing Pods. Render and review the install manifest before a fleet-wide rollout, then restart workloads gradually.

For a narrow canary, the proxy configuration can be supplied on the Pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: orders
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

Merge this into the existing Deployment rather than applying the incomplete fragment. Pod-template annotations belong under `spec.template.metadata`; an annotation on the Deployment object's own metadata does not configure injected Pods.

The official mesh option defaults to `false`. In the current legacy-sidecar injection template, enabling it adds `pilot-agent wait` as the proxy container's `postStart` hook; that command polls `http://localhost:15021/healthz/ready`. This is useful for long-running services on Kubernetes versions or Istio releases where native sidecars are not selected.

Understand its limits:

- proxy readiness means the local proxy can accept traffic, not that every EDS endpoint or external database is healthy;
- the hold increases rollout latency when Istiod is slow or unavailable;
- `pilot-agent wait` times out after 60 seconds by default. A failed `postStart` hook causes kubelet to kill the proxy container, but kubelet can proceed to start the remaining regular containers; this is not an indefinite fail-closed gate; and
- lifecycle hooks can interact with custom hooks, unusual entrypoints, or strict admission policy, so inspect the fully injected Pod.

Do not combine this with an arbitrary fixed `sleep 30`. Fixed sleeps make fast starts slower and still fail when the control plane takes 31 seconds.

## Option 2: Use Kubernetes Native Sidecars

Kubernetes native sidecars are containers in `spec.initContainers` with `restartPolicy: Always`. Kubelet starts init containers in order, but keeps these sidecars running for the Pod lifetime. Native sidecars do not block Job completion after the regular containers finish, and their shutdown ordering is designed for the sidecar pattern.

Kubernetes first exposed this model behind an alpha gate in 1.28, enabled it by default as beta in 1.29, and made it stable in 1.33. Kubernetes documents different termination behavior in 1.28, so prefer 1.29 or newer and verify every node pool. Istio added the per-Pod `sidecar.istio.io/nativeSidecar` selector in 1.24; the current annotation catalog still marks it alpha.

On a supported combination, select it on the Pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: orders
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/nativeSidecar: "true"
```

Kubernetes annotation values must be strings, so the quoted YAML boolean is intentional here. It takes precedence over the injector's `ENABLE_NATIVE_SIDECARS` setting. Current Istio documents that setting's default as `auto`, but check release-matched command documentation and every node version before enabling it; do not hand-edit webhook templates.

After injection, verify the actual Pod rather than assuming the annotation was honored:

```bash
kubectl -n orders get pod orders-api-66bd54c9f7-j8xrn -o json |
  jq '.spec.initContainers[]? |
      select(.name == "istio-proxy") |
      {name, restartPolicy, startupProbe, readinessProbe}'
```

The important evidence is that `istio-proxy` is represented as a restartable init container. Native sidecar ordering considers a sidecar started according to Kubernetes lifecycle rules; when a startup probe exists, subsequent init progress waits for that probe to succeed. Istio 1.31 enables a startup probe against `/healthz/ready` on port `15021` by default. Verify that it is present: without a startup probe, process startup alone can release the ordering gate, and a readiness probe does not delay application startup. Do not manually move the injected proxy between `containers` and `initContainers`, because Istio also manages mounts, security context, ports, and shutdown behavior.

Native sidecars are especially valuable for Jobs. A legacy always-running regular sidecar can prevent a Job Pod from reaching completion, whereas a native sidecar does not extend the Pod's completion condition. Test Jobs separately from Deployments because startup and termination semantics both matter.

## Choose One Primary Mechanism

Use `holdApplicationUntilProxyStarts` when:

- the cluster or Istio version does not support native proxy sidecars;
- the workload is a conventional long-running Deployment; or
- a low-risk, workload-scoped canary is needed before a platform migration.

Prefer native sidecars when the deployed Kubernetes and Istio releases support them and:

- deterministic kubelet-native ordering is desired;
- Jobs must finish cleanly with a proxy; or
- the platform wants one lifecycle model for proxies and other long-running helpers.

Avoid turning on both mechanisms blindly. In the Istio 1.31 injection template, selecting a native sidecar suppresses the legacy `holdApplicationUntilProxyStarts` post-start hook; older releases can differ. Render the injected result for the exact versions in use:

```bash
istioctl kube-inject -f deployment.yaml -o /tmp/deployment-injected.yaml
kubectl apply --dry-run=server -f /tmp/deployment-injected.yaml
```

Review the temporary file for secrets before sharing it. Server-side dry run validates admission but does not prove runtime ordering on each node version.

## Keep Application-Level Resilience

Startup ordering removes one local race; it is not a substitute for retry-safe initialization. Applications should still:

- retry idempotent dependency calls with bounded exponential backoff and jitter;
- distinguish readiness from liveness so a dependency outage does not cause a restart storm;
- set explicit connect and request deadlines;
- avoid retrying non-idempotent writes unless an idempotency mechanism exists; and
- expose a readiness signal only after essential initialization completes.

If the application performs database migrations or leader election, make the operation concurrency-safe. Delaying it until Envoy starts does not guarantee only one replica performs it.

Do not make the application liveness probe depend on Istiod or on every downstream service. A control-plane outage should not automatically restart an otherwise functional data plane using its last accepted configuration.

## Roll Out and Verify Safely

Start with one workload and preserve old replicas while the canary becomes ready:

```bash
kubectl -n orders rollout status deployment/orders-api --timeout=5m
kubectl -n orders get pods -l app=orders-api -w
```

For the new Pod, verify the actual `15021` status endpoint used by the hold hook and kubelet. Run the port-forward in one terminal and the remaining commands in another:

```bash
kubectl -n orders port-forward pod/orders-api-NEW-POD 15021:15021
curl -i http://127.0.0.1:15021/healthz/ready
istioctl proxy-status orders-api-NEW-POD.orders
kubectl -n orders logs orders-api-NEW-POD -c orders-api --timestamps
```

`pilot-agent request GET ready` is not interchangeable here: it queries Envoy's raw admin `/ready`, not the full agent handler used by `pilot-agent wait`. Correlate the first application log and first outbound request with the `15021` transition. Run a controlled restart during an Istiod disruption test only in a non-production environment or approved resilience exercise. The intended failure mode should be explicit: native sidecar startup probing can keep the application waiting because it requires the mesh, whereas the legacy hold hook can fail after its timeout and allow application startup. Test that the application handles the resulting dependency failures as intended.

Watch rollout duration, unready Pod counts, Job completion time, startup failure rate, and proxy connection errors. If startup latency grows, fix the control-plane or xDS bottleneck rather than weakening the gate without analysis.

## Conclusion

Regular containers have no readiness-based startup ordering, so an Istio proxy and its application can race. `holdApplicationUntilProxyStarts` supplies an Istio-managed gate for conventional Pods, while Kubernetes native sidecars provide ordered, kubelet-native lifecycle semantics and better Job completion behavior. Select the mechanism supported by the deployed versions, inspect the injected Pod, and retain bounded application retries for dependencies beyond the local proxy.

## Official Documentation

- [Istio: Global Mesh Options](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/)
- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio: Install the Istio CNI Node Agent](https://istio.io/latest/docs/setup/additional-setup/cni/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Adopting Sidecar Containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Istio source: injected proxy lifecycle](https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml)
- [Istio source: `pilot-agent wait`](https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/app/wait.go)
