# How to Use Dynamic Exporter Configuration in Cilium Hubble

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Hubble, Dynamic Exporter, Configuration, Observability

Description: Learn how to configure and use Cilium Hubble's dynamic exporter feature to change flow export settings at runtime without restarting Cilium agents.

---

## Introduction

The static Hubble exporter requires Cilium agent restarts whenever you change filters, field masks, or export targets. In production environments, restarting networking agents is disruptive and carries risk. The dynamic exporter configuration solves this by allowing you to modify export settings through a Kubernetes ConfigMap that Cilium watches and applies in real time.

Dynamic exporter configuration is particularly valuable during incident response, when you need to quickly broaden filters to capture more data, or during security investigations where you need to add targeted exports for specific namespaces or workloads.

This guide shows you how to set up and use the dynamic exporter configuration in Cilium Hubble.

## Prerequisites

- Kubernetes cluster with Cilium 1.15+ installed
- Hubble enabled with the exporter feature
- Helm 3 for initial configuration
- kubectl access to kube-system namespace

## Enabling Dynamic Exporter Configuration

Enable the dynamic exporter through Helm values:

```yaml
# cilium-dynamic-exporter.yaml
hubble:
  enabled: true
  export:
    # Static exporter (base configuration)
    static:
      enabled: true
      filePath: /var/run/cilium/hubble/events.log
      fileMaxSizeMb: 10
      fileMaxBackups: 5

    # Dynamic exporter (runtime-configurable)
    dynamic:
      enabled: true
      config:
        # ConfigMap to watch for dynamic export rules
        configMapName: cilium-hubble-export-config
        # How often to check for ConfigMap changes (seconds)
        watchInterval: 10
```

```bash
helm upgrade cilium cilium/cilium -n kube-system \
  --reuse-values \
  --values cilium-dynamic-exporter.yaml

kubectl -n kube-system rollout status daemonset/cilium
```

## Creating Dynamic Export Rules

Dynamic export rules are defined in a ConfigMap that Cilium watches:

```yaml
# cilium-hubble-export-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-hubble-export-config
  namespace: kube-system
data:
  # Each key is an exporter name, each value is a JSON config
  security-drops.json: |
    {
      "filePath": "/var/run/cilium/hubble/security-drops.log",
      "fileMaxSizeMb": 10,
      "fileMaxBackups": 3,
      "end": "2026-04-14T00:00:00Z",
      "allowList": [
        {"verdict": ["DROPPED"]}
      ],
      "fieldMask": [
        "time",
        "source.namespace",
        "source.pod_name",
        "destination.namespace",
        "destination.pod_name",
        "destination.port",
        "verdict",
        "drop_reason"
      ]
    }
  production-flows.json: |
    {
      "filePath": "/var/run/cilium/hubble/production-flows.log",
      "fileMaxSizeMb": 20,
      "fileMaxBackups": 5,
      "allowList": [
        {"source_pod": ["production/"]}
      ],
      "fieldMask": [
        "time",
        "source.namespace",
        "source.pod_name",
        "destination.namespace",
        "destination.pod_name",
        "destination.port",
        "verdict",
        "l4.TCP",
        "Type"
      ]
    }
```

```bash
kubectl apply -f cilium-hubble-export-config.yaml
```

```mermaid
graph TD
    A[ConfigMap: cilium-hubble-export-config] --> B[Cilium Agent watches ConfigMap]
    B --> C{ConfigMap changed?}
    C -->|Yes| D[Parse new export rules]
    C -->|No| E[Continue with current rules]
    D --> F[security-drops.json]
    D --> G[production-flows.json]
    F --> H[/var/run/cilium/hubble/security-drops.log]
    G --> I[/var/run/cilium/hubble/production-flows.log]
```

## Modifying Export Rules at Runtime

The key advantage is changing exports without restarts:

```bash
# Add a new exporter rule during an incident
kubectl -n kube-system get configmap cilium-hubble-export-config -o yaml > /tmp/export-config.yaml

# Edit to add a new investigation-specific exporter
cat >> /tmp/investigation-rule.json << 'EOF'
{
  "filePath": "/var/run/cilium/hubble/investigation.log",
  "fileMaxSizeMb": 50,
  "fileMaxBackups": 2,
  "end": "2026-03-15T00:00:00Z",
  "allowList": [
    {"source_pod": ["default/suspicious-app"]},
    {"destination_pod": ["default/suspicious-app"]}
  ],
  "fieldMask": [
    "time",
    "source.namespace",
    "source.pod_name",
    "source.labels",
    "destination.namespace",
    "destination.pod_name",
    "destination.labels",
    "destination.port",
    "verdict",
    "drop_reason",
    "l4.TCP",
    "l7",
    "Type",
    "IP.source",
    "IP.destination"
  ]
}
EOF

# Update the ConfigMap
kubectl -n kube-system create configmap cilium-hubble-export-config \
  --from-file=security-drops.json=security-drops.json \
  --from-file=production-flows.json=production-flows.json \
  --from-file=investigation.json=/tmp/investigation-rule.json \
  --dry-run=client -o yaml | kubectl apply -f -

# Cilium will pick up the change within the watch interval (default 10s)
# No restart needed!

# Verify the new exporter is active
sleep 15
kubectl -n kube-system exec ds/cilium -- ls -la /var/run/cilium/hubble/investigation.log
```

## Managing Exporter Lifecycle

Dynamic exporters support time-based expiration:

```bash
# Set an end time so the exporter automatically stops
# Useful for investigation-scoped exports that should not run indefinitely

# Check which exporters are active
kubectl -n kube-system exec ds/cilium -- ls -la /var/run/cilium/hubble/*.log

# Remove an exporter by removing its key from the ConfigMap
kubectl -n kube-system get configmap cilium-hubble-export-config -o json | python3 -c "
import json, sys
cm = json.load(sys.stdin)
data = cm.get('data', {})
print('Active exporters:')
for name, config in data.items():
    cfg = json.loads(config)
    end = cfg.get('end', 'no expiry')
    print(f'  {name}: path={cfg[\"filePath\"]}, expires={end}')
"

# Remove the investigation exporter after it is no longer needed
kubectl -n kube-system get configmap cilium-hubble-export-config -o json | \
  python3 -c "
import json, sys
cm = json.load(sys.stdin)
del cm['data']['investigation.json']
del cm['metadata']['resourceVersion']
del cm['metadata']['uid']
del cm['metadata']['creationTimestamp']
json.dump(cm, sys.stdout)
" | kubectl apply -f -
```

## Verification

Confirm dynamic exporter configuration is working:

```bash
# 1. ConfigMap is created and has data
kubectl -n kube-system get configmap cilium-hubble-export-config -o jsonpath='{.data}' | python3 -m json.tool

# 2. Export files are being created
kubectl -n kube-system exec ds/cilium -- ls -la /var/run/cilium/hubble/

# 3. Each exporter is writing data
for file in security-drops.log production-flows.log; do
  count=$(kubectl -n kube-system exec ds/cilium -- wc -l /var/run/cilium/hubble/$file 2>/dev/null | awk '{print $1}')
  echo "$file: $count events"
done

# 4. Filters are applied correctly
kubectl -n kube-system exec ds/cilium -- head -3 /var/run/cilium/hubble/security-drops.log | python3 -c "
import json, sys
for line in sys.stdin:
    f = json.loads(line)
    verdict = f.get('flow',{}).get('verdict','')
    print(f'Verdict: {verdict}')  # Should all be DROPPED
"

# 5. Dynamic changes take effect
kubectl -n kube-system get configmap cilium-hubble-export-config -o jsonpath='{.metadata.resourceVersion}'
```

## Troubleshooting

- **Dynamic exporter not picking up ConfigMap changes**: Check the `watchInterval` setting. Default is 10 seconds. Also verify the ConfigMap name matches the Helm configuration.

- **Export file not created for new rule**: Check Cilium agent logs for parsing errors: `kubectl -n kube-system logs ds/cilium --tail=50 | grep -i "export\|configmap"`.

- **JSON parse error in ConfigMap**: Validate your JSON before applying: `cat rule.json | python3 -m json.tool`.

- **Expired exporter still running**: The expiration check happens at the watch interval. Wait for the next check cycle. If it persists, remove the rule manually from the ConfigMap.

- **Too many export files consuming disk**: Monitor disk usage with `kubectl -n kube-system exec ds/cilium -- df -h /var/run/cilium/hubble/`. Set appropriate `fileMaxSizeMb` and `fileMaxBackups` for each rule.

## Conclusion

Dynamic exporter configuration transforms Hubble from a statically configured tool into a responsive observability platform. You can add targeted exports during incidents, remove them when investigations are complete, and adjust filters based on evolving requirements -- all without restarting a single Cilium agent. Use time-based expiration to prevent forgotten exporters from running indefinitely, and monitor disk usage to ensure the export files do not overwhelm node storage.
