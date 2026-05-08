# Monitoring FailedCreatePodSandBox Errors After Installing Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Pod, Monitoring

Description: Set up proactive monitoring and alerting for FailedCreatePodSandBox errors that commonly occur after deploying Calico as your Kubernetes CNI plugin.

---

## Introduction

FailedCreatePodSandBox errors are among the most disruptive issues that arise after installing Calico as the CNI plugin in a Kubernetes cluster. These errors indicate the kubelet cannot create the network namespace required for a pod to start, effectively preventing any workload from running on the affected node.

Proactive monitoring is critical because these errors often surface minutes or hours after a Calico installation or upgrade, once new pods are scheduled. Without alerting in place, you may not notice the problem until users report application outages.

This guide walks through setting up event-based monitoring, Prometheus alerting rules, and Grafana dashboards to detect FailedCreatePodSandBox errors early and correlate them with Calico component health.

## Prerequisites

- A Kubernetes cluster (v1.24+) with Calico installed as the CNI
- `kubectl` with cluster-admin access
- Prometheus Operator deployed (e.g., via kube-prometheus-stack Helm chart)
- Grafana connected to your Prometheus data source
- Familiarity with PromQL basics

## Capturing Kubernetes Events with Event Exporter

Kubernetes events are the primary source for FailedCreatePodSandBox errors. Deploy the Kubernetes Event Exporter to route these events to logs and expose exporter health metrics.

```yaml
# event-exporter-deployment.yaml

# Deploys the event exporter to capture and forward Kubernetes events
apiVersion: v1
kind: ServiceAccount
metadata:
  name: event-exporter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: event-exporter
rules:
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["events.k8s.io"]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: event-exporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: event-exporter
subjects:
  - kind: ServiceAccount
    name: event-exporter
    namespace: monitoring
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: event-exporter
  template:
    metadata:
      labels:
        app: event-exporter
    spec:
      serviceAccountName: event-exporter
      containers:
        - name: event-exporter
          image: bitnami/kube-event-exporter:1.7.0
          args:
            - -conf=/config/config.yaml
          volumeMounts:
            - name: config
              mountPath: /config
      volumes:
        - name: config
          configMap:
            name: event-exporter-cfg
```

Create the configuration that filters for sandbox errors:

```yaml
# event-exporter-config.yaml
# Filters events to capture only FailedCreatePodSandBox reasons
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-cfg
  namespace: monitoring
data:
  config.yaml: |
    logLevel: info
    omitLookup: true
    route:
      routes:
        - match:
            - receiver: "dump"
              reason: "FailedCreatePodSandBox"
    receivers:
      - name: "dump"
        stdout: {}
```

You can also watch events directly from the command line for immediate debugging:

```bash
# Watch for FailedCreatePodSandBox events across all namespaces in real time
kubectl get events --all-namespaces --watch-only \
  --field-selector reason=FailedCreatePodSandBox
```

## Configuring Prometheus Alerting Rules

Create PrometheusRule resources that fire when sandbox errors are detected or when Calico components are unhealthy:

```yaml
# podsandbox-alerting-rules.yaml
# Alerting rules that detect pod sandbox failures and Calico health issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-podsandbox-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: calico.podsandbox
      rules:
        # Fires when pods stay in ContainerCreating, a common symptom of sandbox creation failures
        - alert: PodSandboxCreationFailing
          expr: |
            sum by (namespace, pod) (
              kube_pod_container_status_waiting_reason{reason="ContainerCreating"}
            ) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Pod stuck creating containers: {{ $labels.namespace }}/{{ $labels.pod }}"
            description: "The pod has been in ContainerCreating for more than 10 minutes. Check its events for FailedCreatePodSandBox and verify Calico CNI status on the node."
        # Fires when calico-node DaemonSet has unavailable pods
        - alert: CalicoNodeUnavailable
          expr: |
            kube_daemonset_status_number_unavailable{daemonset="calico-node"} > 0
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Calico node pods unavailable"
            description: "{{ $value }} calico-node pods are not ready, which will cause sandbox creation failures."
```

Apply and verify:

```bash
# Apply the alerting rules
kubectl apply -f podsandbox-alerting-rules.yaml

# Verify Prometheus has loaded the rules
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring &
curl -s http://localhost:9090/api/v1/rules \
  | python3 -m json.tool | grep -A2 "PodSandbox"
```

## Building a Grafana Dashboard for Sandbox Health

Create a dashboard that correlates pod sandbox failures with Calico component status:

```bash
# Query to count containers currently waiting in ContainerCreating
# Use this in a Grafana Stat panel
sum(kube_pod_container_status_waiting_reason{reason="ContainerCreating"})

# Query to track calico-node DaemonSet readiness as a percentage
# Use this in a Grafana Gauge panel
(
  kube_daemonset_status_number_ready{daemonset="calico-node"}
  /
  kube_daemonset_status_desired_number_scheduled{daemonset="calico-node"}
) * 100

# Query to monitor calico-kube-controllers deployment availability
# Use this in a Grafana Time Series panel
kube_deployment_status_replicas_available{deployment="calico-kube-controllers"}
```

Check Calico node health directly:

```bash
# Verify Felix readiness on each calico-node pod
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name); do
  echo "--- $pod ---"
  kubectl exec -n calico-system "$pod" -- calico-node -felix-ready
done

# Check IPAM block allocations for issues
kubectl get ipamblocks.crd.projectcalico.org -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.affinity}{"\n"}{end}'
```

## Verification

Confirm the entire monitoring pipeline is operational:

```bash
# 1. Verify event exporter is running
kubectl get pods -n monitoring -l app=event-exporter

# 2. Check Prometheus targets include kube-state-metrics
curl -s http://localhost:9090/api/v1/targets | python3 -c "
import sys, json
targets = json.load(sys.stdin)['data']['activeTargets']
for t in targets:
    if 'kube-state-metrics' in t.get('labels', {}).get('job', ''):
        print(f'  {t["labels"]["job"]}: {t["health"]}')
"

# 3. Verify alerting rules are loaded
curl -s http://localhost:9090/api/v1/rules | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
for g in data['groups']:
    for r in g['rules']:
        if 'sandbox' in r['name'].lower() or 'calico' in r['name'].lower():
            print(f'  Rule: {r["name"]} State: {r["state"]}')
"

# 4. Test with a dry run pod
kubectl run sandbox-monitor-test --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/sandbox-monitor-test --timeout=30s
kubectl delete pod sandbox-monitor-test
```

## Troubleshooting

- **Events not appearing in exporter logs**: Ensure the event-exporter ServiceAccount has an RBAC ClusterRole with `get`, `list`, and `watch` permissions on the `events` resources in both the core API group and `events.k8s.io`.
- **Prometheus rules not loading**: Verify the PrometheusRule labels match the `ruleSelector` in your Prometheus custom resource. Run `kubectl get prometheus -n monitoring -o yaml | grep -A5 ruleSelector`.
- **Grafana panels show No Data**: Confirm kube-state-metrics is running and that the Grafana data source URL matches the Prometheus service endpoint. Test queries directly in the Prometheus expression browser.
- **Alerts firing but no notifications**: Check Alertmanager configuration for correct receiver routes and verify the Alertmanager pods are healthy with `kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager`.

## Conclusion

Monitoring for FailedCreatePodSandBox errors after a Calico installation requires capturing Kubernetes events, setting up Prometheus alerting rules for both pod status and Calico component health, and building dashboards that provide at-a-glance visibility. By combining event-based detection with calico-node DaemonSet health metrics, you can identify and respond to sandbox failures before they cascade into widespread application outages.
