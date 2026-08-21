# How to Sleep and Wake an Idle vCluster Without Breaking Ingress Wakeups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Cost Optimization, Ingress, Gateway API

Description: Configure vCluster 0.36 auto sleep while keeping application ingress or Gateway API traffic able to wake an idle tenant cluster.

---

Sleeping an idle vCluster saves compute only if users can wake it reliably. Kubernetes API access through vCluster Platform can trigger a wake, but application ingress needs a live routing path and Gateway API needs request-mirroring support. Treat wakeup as part of endpoint design, not as an incidental side effect of scaling Pods down.

This guide targets vCluster **0.36** and vCluster Platform **4.11** with a containerized control plane on Shared Nodes. Automatic sleep is an **Enterprise-only** feature and the v0.36 documentation says it is intended for pre-production. Manual Platform sleep is free, but it does not provide inactivity detection and manual sleep does not wake automatically from activity.

## Configure Auto Sleep in `vcluster.yaml`

Start with an inactivity period long enough to distinguish idle clusters from normal quiet intervals:

```yaml
sleep:
  auto:
    afterInactivity: 30m
    exclude:
      selector:
        labels:
          sleep: no-thanks

sync:
  toHost:
    ingresses:
      enabled: true
```

Apply it through the deployment source that owns the cluster:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

`afterInactivity` uses a Go-style duration; the largest unit is hours. The `exclude` selector keeps matching Deployments or StatefulSets running. Do not label ordinary application backends `sleep: no-thanks`, or they defeat the main cost-saving purpose.

Platform-connected and standalone auto-sleep behavior differs. Without the Platform agent, the control plane remains active to observe activity and wake workloads. With the agent, Platform can shut the control plane down as well for greater savings.

## Choose a Wake-Capable Routing Path

There are two common Ingress layouts:

### A Host-Side Ingress Controller

This is the simpler sleep topology. The controller runs outside the tenant and remains available while tenant workloads sleep. Enable `sync.toHost.ingresses` so the tenant Ingress becomes a host object that Platform can manage for wakeup. Ensure the shared controller is constrained by namespace, class, and hostname ownership; Ingress synchronization alone is not tenant isolation.

### An In-Tenant Ingress Controller

If the controller itself is deployed through the vCluster, exclude its Deployment from sleep:

```bash
kubectl --context tenant -n ingress-system label deployment edge-controller \
  sleep=no-thanks
```

The label must be on the Deployment metadata because that is what the configured selector evaluates. Keeping only its current Pod alive is fragile: a rollout creates a replacement from the Deployment template. Confirm the controller can still resolve and route to the Platform-managed wake target from the network and DNS mode in which it runs.

For new routing, prefer an actively maintained Ingress controller or Gateway API implementation. The current vCluster documentation marks its ingress-nginx demonstration as deprecated.

## Keep the Wakeup Annotations Compatible

Check the Platform `VirtualClusterInstance` and host namespace before testing:

```bash
kubectl --context host get virtualclusterinstance team-a \
  -n loft-p-PROJECT -o yaml

kubectl --context host get namespace team-a-vcluster -o yaml
```

The following user-configurable annotations change sleep behavior:

- `sleepmode.loft.sh/disable-ingress-wakeup: "true"` explicitly prevents ingress traffic from waking the tenant. Remove it for an ingress-driven wake path.
- `sleepmode.loft.sh/ignore-ingresses: "true"` prevents ingress requests from counting as activity. Use it only when health checks would otherwise keep a cluster awake and you have separately tested the desired wake behavior.
- `sleepmode.loft.sh/sleep-after` configures an inactivity timeout in seconds on a Platform object. Avoid conflicting ownership between this annotation, a Platform template, and `sleep.auto.afterInactivity`.
- `sleepmode.loft.sh/exclude: "true"` can exclude individual controller workloads when managed through Platform annotations; the label-selector approach above keeps the desired state in `vcluster.yaml`.

Treat Platform-added rules, filters, and annotations on synchronized Ingress or HTTPRoute objects as controller-owned state. Do not continuously replace them with another reconciler without confirming that the wake rule survives.

## Account for Platform Activity Detection

Requests proxied through Platform count as cluster activity, including `kubectl`, API, and UI requests. Direct access to the tenant Kubernetes API through a separately exposed ingress bypasses that proxy and is not tracked by Platform inactivity detection. Prefer the Platform endpoint or `vcluster connect` when an API request is expected to wake the cluster.

Application HTTP traffic is a different path. With a supported Ingress or integration, Platform can redirect or observe the request, wake the cluster, and restore the backend. The first request may fail or receive a temporary response while Pods start, so clients should retry safe requests with bounded backoff. Do not promise zero cold-start latency.

## Verify Gateway API Before Depending on It

Gateway API `HTTPRoute` wakeup depends on the selected Gateway controller supporting the `RequestMirror` filter. A controller may serve an HTTPRoute perfectly while lacking request mirroring; in that case the endpoint can work when awake but cannot automatically wake the sleeping tenant from HTTP traffic.

Inspect the GatewayClass feature status and use a controller that advertises request mirroring. If a capable controller does not advertise it, Platform 4.11 supports an explicit allowlist on the connected `Cluster` object:

```yaml
metadata:
  annotations:
    sleepmode.loft.sh/request-mirror-controller-allowlist: >-
      gateway.example.com/controller
```

Use the exact `GatewayClass.spec.controllerName`, and add it only after verifying the implementation really supports request mirroring. If Gateway API CRDs were installed after Platform started, restart Platform so it discovers and starts the sleep-mode controllers:

```bash
kubectl --context host rollout restart deployment/loft \
  -n vcluster-platform
```

Platform manages a request-mirror rule while the tenant sleeps. Check the host HTTPRoute for Platform's sleep annotations and preserved rule rather than evaluating only the tenant view.

## Run an End-to-End Sleep Test

Use a short timeout in a disposable cluster, then restore the production value:

1. Send an application request and record a successful response.
2. Stop synthetic health checks that should not count as activity, or configure the documented ignore settings deliberately.
3. Wait beyond the inactivity window. Inspect Platform sleep status and confirm ordinary application Deployments scale down while any intentionally excluded routing controller stays ready.
4. Send an external request to the real hostname. Expect a cold-start response or transient `503`, then retry until the application answers.
5. Confirm the original replica counts return and readiness probes pass.
6. Repeat with Kubernetes API activity through Platform, then repeat after restarting the ingress or Gateway controller.

Manual commands are useful for validating scale-down and restoration separately from inactivity detection:

```bash
vcluster platform sleep vcluster team-a --project PROJECT_NAME
vcluster platform wakeup vcluster team-a --project PROJECT_NAME
```

Manual sleep does not detect activity or wake automatically, so it cannot prove the ingress-driven path. A positive manual sleep/wakeup test proves restoration; let auto sleep trigger naturally for a separate ingress or HTTPRoute wakeup test. The optional `--prevent-wakeup 0` flag forces indefinite manual sleep and is useful only when that is explicitly intended.

Monitor time-to-ready, failed first requests, replica restoration, and any controller reconciliation that removes Platform-managed rules. Run the test after upgrades to Platform, vCluster, the ingress or Gateway controller, and Gateway API CRDs.

## Official Documentation

- [vCluster: Auto Sleep configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sleep)
- [vCluster: Manual sleep and wakeup](https://www.vcluster.com/docs/vcluster/manage/sleep-wakeup)
- [vCluster Platform: Auto sleep for tenant clusters](https://www.vcluster.com/docs/platform/use-platform/virtual-clusters/key-features/sleep-mode)
- [vCluster Platform: Annotations and labels reference](https://www.vcluster.com/docs/platform/reference/platform-annotations)
- [Gateway API: HTTP request mirroring](https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/)

## Conclusion

Keep the routing controller awake, preserve Platform's managed wake path, and verify that your Gateway controller supports request mirroring before relying on HTTPRoute wakeup. Test the cold start from outside the cluster. A configured inactivity timer is useful only when the first real user can reliably bring the tenant back.
