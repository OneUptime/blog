# How to Configure Time-Based Access Control in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Control, Time-Based, Security, Kubernetes

Description: How to implement time-based access control in Istio using external authorization, custom headers, and CronJobs for scheduled policy changes.

---

Time-based access control restricts when services or users can access specific resources. Maybe your maintenance APIs should only be accessible during business hours. Or batch processing endpoints should only accept requests during off-peak windows. Istio doesn't have built-in time-of-day matching in AuthorizationPolicy, but there are practical patterns to achieve this.

The approaches range from simple CronJob-based policy swaps to external authorization servers that evaluate time conditions. Each has trade-offs in terms of complexity and precision.

## Approach 1: CronJob-Based Policy Switching

The simplest method is using Kubernetes CronJobs to apply and remove AuthorizationPolicies on a schedule.

Create the "business hours" policy that allows access:

```yaml
# business-hours-allow.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: maintenance-api-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: maintenance-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["ops"]
    to:
    - operation:
        paths: ["/api/maintenance/*"]
```

Create the "after hours" policy that denies access:

```yaml
# after-hours-deny.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: maintenance-api-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: maintenance-api
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/api/maintenance/*"]
```

Set up CronJobs to switch between them:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: enable-maintenance-access
  namespace: backend
spec:
  schedule: "0 9 * * 1-5"  # 9 AM Monday-Friday
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccountName: policy-manager
          restartPolicy: OnFailure
          containers:
          - name: apply-policy
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl apply -f /policies/business-hours-allow.yaml
              echo "Maintenance API access enabled for business hours"
            volumeMounts:
            - name: policies
              mountPath: /policies
          volumes:
          - name: policies
            configMap:
              name: time-policies
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: disable-maintenance-access
  namespace: backend
spec:
  schedule: "0 18 * * 1-5"  # 6 PM Monday-Friday
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccountName: policy-manager
          restartPolicy: OnFailure
          containers:
          - name: apply-policy
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl apply -f /policies/after-hours-deny.yaml
              echo "Maintenance API access disabled for after hours"
            volumeMounts:
            - name: policies
              mountPath: /policies
          volumes:
          - name: policies
            configMap:
              name: time-policies
```

Store the policies in a ConfigMap:

```bash
kubectl create configmap time-policies -n backend \
  --from-file=business-hours-allow.yaml \
  --from-file=after-hours-deny.yaml
```

Create the RBAC for the CronJob:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: policy-manager
  namespace: backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: policy-manager-role
  namespace: backend
rules:
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies"]
  verbs: ["get", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: policy-manager-binding
  namespace: backend
subjects:
- kind: ServiceAccount
  name: policy-manager
  namespace: backend
roleRef:
  kind: Role
  name: policy-manager-role
  apiGroup: rbac.authorization.k8s.io
```

## Approach 2: External Authorization with Time Checks

For more granular time-based control, use Istio's external authorization feature. Deploy a small service that checks the current time and returns allow or deny:

```yaml
# external-authz-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: time-authz
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: time-authz
  template:
    metadata:
      labels:
        app: time-authz
    spec:
      containers:
      - name: time-authz
        image: my-registry/time-authz:v1
        ports:
        - containerPort: 8080
        env:
        - name: TZ
          value: "America/New_York"
---
apiVersion: v1
kind: Service
metadata:
  name: time-authz
  namespace: istio-system
spec:
  selector:
    app: time-authz
  ports:
  - port: 8080
    targetPort: 8080
```

Here's a simple Go implementation for the time-based authorizer:

```go
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type TimeRule struct {
    StartHour int    `json:"start_hour"`
    EndHour   int    `json:"end_hour"`
    Days      []int  `json:"days"` // 0=Sunday, 6=Saturday
}

var rules = map[string]TimeRule{
    "/api/maintenance": {StartHour: 9, EndHour: 18, Days: []int{1, 2, 3, 4, 5}},
    "/api/batch":       {StartHour: 22, EndHour: 6, Days: []int{0, 1, 2, 3, 4, 5, 6}},
}

func checkHandler(w http.ResponseWriter, r *http.Request) {
    path := r.Header.Get("X-Original-Url")
    now := time.Now()

    for prefix, rule := range rules {
        if len(path) >= len(prefix) && path[:len(prefix)] == prefix {
            dayAllowed := false
            for _, d := range rule.Days {
                if int(now.Weekday()) == d {
                    dayAllowed = true
                    break
                }
            }
            hour := now.Hour()
            timeAllowed := false
            if rule.StartHour < rule.EndHour {
                timeAllowed = hour >= rule.StartHour && hour < rule.EndHour
            } else {
                timeAllowed = hour >= rule.StartHour || hour < rule.EndHour
            }

            if !dayAllowed || !timeAllowed {
                w.WriteHeader(http.StatusForbidden)
                json.NewEncoder(w).Encode(map[string]string{
                    "error": "Access denied: outside allowed time window",
                })
                return
            }
        }
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/check", checkHandler)
    http.ListenAndServe(":8080", nil)
}
```

Register the external authorizer in Istio's mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: time-authz
      envoyExtAuthzHttp:
        service: time-authz.istio-system.svc.cluster.local
        port: 8080
        headersToUpstreamOnAllow: ["x-time-allowed"]
        headersToDownstreamOnDeny: ["x-time-denied-reason"]
        includeRequestHeadersInCheck: ["x-original-url"]
```

Apply it with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: time-check
  namespace: backend
spec:
  selector:
    matchLabels:
      app: maintenance-api
  action: CUSTOM
  provider:
    name: time-authz
  rules:
  - to:
    - operation:
        paths: ["/api/maintenance/*", "/api/batch/*"]
```

## Approach 3: Header-Based Time Windows

If your API gateway or frontend service injects a timestamp header, you can use header matching. This is a lighter-weight approach that doesn't require an external service:

Have your ingress controller add a time-window header:

```yaml
apiVersion: networking.istio.io/v1
kind: EnvoyFilter
metadata:
  name: add-time-header
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
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
          inlineCode: |
            function envoy_on_request(request_handle)
              local hour = tonumber(os.date("%H"))
              local day = tonumber(os.date("%w"))
              if hour >= 9 and hour < 18 and day >= 1 and day <= 5 then
                request_handle:headers():add("x-time-window", "business-hours")
              else
                request_handle:headers():add("x-time-window", "after-hours")
              end
            end
```

Then use header matching in your AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: time-window-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: maintenance-api
  action: ALLOW
  rules:
  - to:
    - operation:
        paths: ["/api/maintenance/*"]
    when:
    - key: request.headers[x-time-window]
      values: ["business-hours"]
```

## Monitoring Time-Based Policies

Track when policies are active and how many requests get denied:

```bash
# Check which policy is currently applied
kubectl get authorizationpolicy maintenance-api-access -n backend -o yaml

# Monitor deny rates
# Prometheus query:
# sum(rate(istio_requests_total{destination_workload="maintenance-api",response_code="403"}[5m]))
```

Set up alerts for unexpected denials during business hours, which might indicate the CronJob failed:

```yaml
groups:
- name: time-policy-alerts
  rules:
  - alert: UnexpectedDenialDuringBusinessHours
    expr: |
      (hour() >= 9 and hour() < 18 and day_of_week() >= 1 and day_of_week() <= 5)
      and
      sum(rate(istio_requests_total{destination_workload="maintenance-api",response_code="403"}[5m])) > 0
    for: 5m
    labels:
      severity: warning
```

Time-based access control adds another dimension to your security posture. The CronJob approach is the simplest and works well for coarse-grained time windows. The external authorization approach gives you real-time evaluation and more complex rules. Pick the approach that matches your precision requirements and operational complexity budget.
