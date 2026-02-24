# How to Route Traffic Based on Time Window in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Scheduling, EnvoyFilter, Kubernetes

Description: Implement time-based traffic routing in Istio to shift traffic between service versions based on time of day or schedule windows.

---

Time-based traffic routing is useful in several scenarios. Maybe you want to route traffic to a maintenance page during scheduled maintenance windows. Or you want to send traffic to a scaled-down version during off-peak hours. Perhaps you need to run a different version of your service during business hours vs. after hours.

Istio does not have a native "time window" match condition in VirtualService. But you can achieve time-based routing using a few practical approaches.

## The Challenge

VirtualService match conditions work on request metadata like headers, URIs, and source labels. There is no built-in `timeOfDay` field. To route based on time, you need to either:

1. Inject a time-based header using an EnvoyFilter
2. Use an external controller that updates VirtualService configs on a schedule
3. Use a CronJob to swap VirtualService resources

## Approach 1: CronJob-Based VirtualService Swapping

The simplest and most maintainable approach is to use Kubernetes CronJobs that apply different VirtualService configurations at different times.

Create two VirtualService configs. The first is for business hours:

```yaml
# vs-business-hours.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: full-featured
```

The second is for off-hours:

```yaml
# vs-off-hours.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: lightweight
```

Store these as ConfigMaps:

```bash
kubectl create configmap vs-business-hours --from-file=vs-business-hours.yaml
kubectl create configmap vs-off-hours --from-file=vs-off-hours.yaml
```

Create CronJobs to apply them:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: switch-to-business-hours
  namespace: default
spec:
  schedule: "0 8 * * 1-5"  # 8 AM, Monday-Friday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: traffic-manager
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - kubectl apply -f /config/vs-business-hours.yaml
              volumeMounts:
                - name: config
                  mountPath: /config
          volumes:
            - name: config
              configMap:
                name: vs-business-hours
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: switch-to-off-hours
  namespace: default
spec:
  schedule: "0 18 * * 1-5"  # 6 PM, Monday-Friday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: traffic-manager
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - kubectl apply -f /config/vs-off-hours.yaml
              volumeMounts:
                - name: config
                  mountPath: /config
          volumes:
            - name: config
              configMap:
                name: vs-off-hours
          restartPolicy: OnFailure
```

You need a ServiceAccount with permissions to apply VirtualService resources:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traffic-manager
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: traffic-manager-role
  namespace: default
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices"]
    verbs: ["get", "list", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: traffic-manager-binding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: traffic-manager
    namespace: default
roleRef:
  kind: Role
  name: traffic-manager-role
  apiGroup: rbac.authorization.k8s.io
```

## Approach 2: EnvoyFilter with Lua Time Check

For routing decisions within a single VirtualService based on time, you can use an EnvoyFilter with a Lua script that checks the current time and adds a header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: time-based-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local hour = tonumber(os.date("%H"))
                if hour >= 8 and hour < 18 then
                  request_handle:headers():add("x-time-window", "business")
                else
                  request_handle:headers():add("x-time-window", "offhours")
                end
              end
```

Then route based on the injected header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - headers:
            x-time-window:
              exact: "business"
      route:
        - destination:
            host: my-app
            subset: full-featured
    - route:
        - destination:
            host: my-app
            subset: lightweight
```

Be aware that the Lua `os.date` uses the container's timezone, which is typically UTC in Kubernetes. Adjust your hour ranges accordingly or set the TZ environment variable.

## Approach 3: Maintenance Window Routing

A common use case is routing to a maintenance page during planned downtime. Create a simple maintenance service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance-page
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: maintenance-page
  template:
    metadata:
      labels:
        app: maintenance-page
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: html
              mountPath: /usr/share/nginx/html
      volumes:
        - name: html
          configMap:
            name: maintenance-html
---
apiVersion: v1
kind: Service
metadata:
  name: maintenance-page
  namespace: default
spec:
  selector:
    app: maintenance-page
  ports:
    - port: 80
      targetPort: 80
```

The maintenance VirtualService:

```yaml
# vs-maintenance.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: maintenance-page
```

Your CronJob switches to this config during the maintenance window and back to the normal config when done.

## Approach 4: Weighted Shift by Schedule

For gradual traffic shifting on a schedule (like moving traffic to a new version during low-traffic hours), combine CronJobs with weighted routing:

```yaml
# Phase 1: Night shift starts - 10% to v2 (applied at 2 AM)
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: v1
          weight: 90
        - destination:
            host: my-app
            subset: v2
          weight: 10
```

```yaml
# Phase 2: Night shift progresses - 50% to v2 (applied at 3 AM)
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: v1
          weight: 50
        - destination:
            host: my-app
            subset: v2
          weight: 50
```

Set up CronJobs for each phase. This gives you a scheduled canary that takes advantage of low-traffic periods.

## Testing

Verify which VirtualService is currently active:

```bash
kubectl get virtualservice my-app-vs -o yaml
```

Manually trigger a CronJob to test the switch:

```bash
kubectl create job --from=cronjob/switch-to-off-hours manual-test-off-hours
kubectl logs job/manual-test-off-hours
```

Check that the VirtualService was updated:

```bash
kubectl get virtualservice my-app-vs -o jsonpath='{.spec.http[0].route[0].destination.subset}'
```

## Considerations

**Time zones.** Be explicit about time zones. Kubernetes CronJobs use the cluster's configured timezone (usually UTC). Document your scheduled changes clearly so your team knows what time zone to expect.

**Transition gaps.** There can be a brief delay between when the CronJob triggers and when the VirtualService update propagates to all sidecars. This is typically under a second but can be a few seconds in large clusters.

**Monitoring.** Set up alerts for CronJob failures. If a scheduled switch fails, your traffic routing could be stuck in the wrong state.

**Manual override.** Always have a way to manually apply the correct VirtualService if a CronJob fails. Keep the YAML files accessible and documented.

## Summary

Time-based routing in Istio requires external orchestration since VirtualService does not have native time matching. CronJobs that swap VirtualService configurations are the simplest and most reliable approach. EnvoyFilter with Lua scripts provide real-time time checking but add complexity. For maintenance windows and scheduled deployments, the CronJob approach gives you explicit control and easy auditing of what changed when.
