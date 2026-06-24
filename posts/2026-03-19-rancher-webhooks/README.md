# How to Configure Rancher Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Webhook, Automation

Description: Learn how to set up and configure webhooks in Rancher to automate responses to cluster events, scaling triggers, and policy enforcement.

Rancher uses webhooks to validate and mutate Kubernetes resources in Rancher-managed clusters. For automation workflows such as scaling or notifications, Rancher monitoring can forward alerts to an external webhook endpoint. This guide covers verifying Rancher's built-in webhook component and wiring alert-driven automation to a custom webhook service.

## Understanding Rancher Webhooks

Rancher deploys the `rancher-webhook` component as an admission controller for Kubernetes. It handles admission control, validation, and mutation of Kubernetes resources that Rancher manages.

There are two common webhook-related patterns in Rancher environments:

1. **Admission Webhooks**: Built-in validation and mutation webhooks that enforce Rancher policies
2. **Alerting Webhook Integrations**: Alertmanager receivers that send alerts to external webhook endpoints for custom automation

## Verifying the Rancher Webhook Deployment

### Managing via Helm

The Rancher webhook is typically installed automatically with Rancher. Verify it is running:

```bash
kubectl get pods -n cattle-system -l app=rancher-webhook

kubectl get validatingwebhookconfigurations | grep rancher
kubectl get mutatingwebhookconfigurations | grep rancher
```

Rancher manages deployment and upgrades of `rancher-webhook` automatically. If you need to customize the webhook chart, put the Helm values in the `rancher-config` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rancher-config
  namespace: cattle-system
  labels:
    app.kubernetes.io/part-of: "rancher"
data:
  rancher-webhook: '{"port": 9553, "priorityClassName": "system-node-critical"}'
```

## Triggering Scaling with an External Webhook

Rancher's built-in `rancher-webhook` handles admission control. For scaling workflows, expose your own webhook endpoint and have Alertmanager call it.

### Step 1: Point to Your Webhook Endpoint

If you are triggering the webhook from inside the cluster, you can use the service DNS name:

```bash
WEBHOOK_URL="http://webhook-handler.automation.svc.cluster.local/webhook"
```

### Step 2: Send a Scale-Up Event

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighCPU"
        }
      }
    ]
  }' \
  "${WEBHOOK_URL}"
```

### Step 3: Send a Scale-Down Event

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "LowCPU"
        }
      }
    ]
  }' \
  "${WEBHOOK_URL}"
```

## Integrating with External Monitoring

### Alertmanager Integration

Configure Alertmanager to call your webhook service when alerts fire. This example assumes the route is dedicated to scaling alerts:

```yaml
# alertmanager.yml
route:
  receiver: 'rancher-scaler'
  routes:
    - matchers:
        - alertname="HighCPU"
      receiver: 'rancher-scaler'
    - matchers:
        - alertname="LowCPU"
      receiver: 'rancher-scaler'

receivers:
  - name: 'rancher-scaler'
    webhook_configs:
      - url: 'http://webhook-handler.automation.svc.cluster.local/webhook'
        send_resolved: false
```

### Prometheus Alert Rules

Create alert rules that trigger your webhook service. Make sure your Prometheus instance selects `PrometheusRule` resources from this namespace:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: scaling-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: scaling
      rules:
        - alert: HighCPU
          expr: avg(rate(container_cpu_usage_seconds_total{namespace="default", pod=~"nginx.*"}[5m])) > 0.8
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on nginx pods"

        - alert: LowCPU
          expr: avg(rate(container_cpu_usage_seconds_total{namespace="default", pod=~"nginx.*"}[5m])) < 0.2
          for: 10m
          labels:
            severity: info
          annotations:
            summary: "Low CPU usage on nginx pods"
```

## Building a Custom Webhook Endpoint

If you need more complex logic than Rancher's admission webhooks provide, build a custom webhook server:

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/exec"
)

type AlertmanagerPayload struct {
    Alerts []struct {
        Status string            `json:"status"`
        Labels map[string]string `json:"labels"`
    } `json:"alerts"`
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    defer r.Body.Close()

    var payload AlertmanagerPayload
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    for _, alert := range payload.Alerts {
        log.Printf("Alert: %s, Status: %s", alert.Labels["alertname"], alert.Status)
        if alert.Status != "firing" {
            continue
        }

        switch alert.Labels["alertname"] {
        case "HighCPU":
            scaleDeployment("default", "nginx", 5)
        case "LowCPU":
            scaleDeployment("default", "nginx", 2)
        }
    }

    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, "OK")
}

func scaleDeployment(namespace, name string, replicas int) {
    cmd := exec.Command("kubectl", "scale", "deployment",
        name, "-n", namespace,
        fmt.Sprintf("--replicas=%d", replicas))
    output, err := cmd.CombinedOutput()
    if err != nil {
        log.Printf("Error scaling: %v, output: %s", err, output)
        return
    }
    log.Printf("Scaled %s/%s to %d replicas", namespace, name, replicas)
}

func main() {
    http.HandleFunc("/webhook", webhookHandler)
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("Webhook server listening on :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

Deploy this as a service in your cluster. The image should include both your webhook binary and a compatible `kubectl`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webhook-handler
  namespace: automation
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: webhook-handler
  namespace: default
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["nginx"]
    verbs: ["get"]
  - apiGroups: ["apps"]
    resources: ["deployments/scale"]
    resourceNames: ["nginx"]
    verbs: ["get", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: webhook-handler
  namespace: default
subjects:
  - kind: ServiceAccount
    name: webhook-handler
    namespace: automation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: webhook-handler
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-handler
  namespace: automation
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webhook-handler
  template:
    metadata:
      labels:
        app: webhook-handler
    spec:
      serviceAccountName: webhook-handler
      containers:
        - name: handler
          image: your-registry/webhook-handler:latest
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-handler
  namespace: automation
spec:
  selector:
    app: webhook-handler
  ports:
    - port: 80
      targetPort: 8080
```

## Managing the Custom Webhook Service

### View the Webhook Handler Resources

```bash
kubectl get deployment webhook-handler -n automation
kubectl get serviceaccount webhook-handler -n automation
kubectl get service webhook-handler -n automation
kubectl get role webhook-handler -n default
kubectl get rolebinding webhook-handler -n default
```

### Delete the Webhook Handler

```bash
kubectl delete deployment webhook-handler -n automation
kubectl delete service webhook-handler -n automation
kubectl delete serviceaccount webhook-handler -n automation
kubectl delete rolebinding webhook-handler -n default
kubectl delete role webhook-handler -n default
```

## Configuring Admission Webhook Policies

Rancher's admission webhooks can enforce policies on resource creation and modification.

### Viewing Current Webhook Configurations

```bash
kubectl get validatingwebhookconfigurations rancher.cattle.io -o yaml
kubectl get mutatingwebhookconfigurations rancher.cattle.io -o yaml
```

### Escalation Prevention

Rancher's admission webhooks include privilege-escalation checks for Rancher-managed RBAC resources, and they also enforce Pod Security Admission label changes on namespaces. For example, the following command is rejected if the user lacks the `updatepsa` permission on the project that owns the namespace:

```bash
kubectl label namespace default \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Troubleshooting Webhooks

### Check Webhook Pod Logs

```bash
kubectl logs -n cattle-system -l app=rancher-webhook --tail=100
```

### Verify Webhook Endpoint Connectivity

```bash
kubectl get svc rancher-webhook -n cattle-system
kubectl get endpoints rancher-webhook -n cattle-system
```

### Common Issues

If webhook behavior is not working as expected, check:

1. The `rancher-webhook` pod and service are present in `cattle-system`
2. The `rancher.cattle.io` validating and mutating webhook configurations point to the `rancher-webhook` service
3. The Kubernetes API server can reach port `9443` on the webhook service, especially on private GKE clusters or EKS clusters using Calico
4. If you deployed a custom webhook service, its ServiceAccount and RBAC rules allow it to scale the target workload
5. Network policies are not blocking either API server traffic to `rancher-webhook` or Alertmanager traffic to your custom webhook service

## Summary

Rancher's built-in webhook component is an admission webhook for policy enforcement, validation, and mutation in Rancher-managed clusters. For automation workflows such as scaling or notifications, pair Rancher monitoring and Alertmanager with an external webhook service. That combination lets you respond to alerts while Rancher's admission webhooks continue to enforce security and resource policy checks.
