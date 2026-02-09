# How to Detect and Reclaim Idle Kubernetes Resources Using Kubecost Allocation APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Kubecost, Idle Resources, FinOps

Description: Use Kubecost allocation APIs to automatically detect and reclaim idle Kubernetes resources including unused PVCs, over-provisioned pods, and abandoned namespaces to reduce waste and lower cloud costs.

---

Idle resources are one of the largest sources of waste in Kubernetes clusters. Abandoned PersistentVolumeClaims, over-provisioned pods with low utilization, and forgotten dev namespaces all accumulate costs. Kubecost provides APIs to identify these resources programmatically. This guide shows you how to build automated idle resource detection and cleanup workflows.

## Identifying Idle Pods

Use Kubecost API to find pods with low utilization:

```bash
# Find pods with < 20% CPU utilization
curl -G http://kubecost.kubecost.svc:9090/model/allocation \
  --data-urlencode 'window=7d' \
  --data-urlencode 'aggregate=pod' | \
  jq '.data[] | select(.cpuCoreRequestAverage > 0) | select((.cpuCoreUsageAverage / .cpuCoreRequestAverage) < 0.2) | {name, namespace, cpuUtilization: ((.cpuCoreUsageAverage / .cpuCoreRequestAverage) * 100)}'
```

Create automated detection script:

```python
#!/usr/bin/env python3
# detect-idle-pods.py

import requests
import json

KUBECOST_URL = "http://kubecost.kubecost.svc:9090"
CPU_THRESHOLD = 0.2  # 20% utilization
MEMORY_THRESHOLD = 0.3  # 30% utilization

def get_idle_pods(window='7d'):
    """Detect idle pods"""
    params = {
        'window': window,
        'aggregate': 'pod',
        'accumulate': 'false'
    }

    response = requests.get(f'{KUBECOST_URL}/model/allocation', params=params)
    data = response.json().get('data', [])

    idle_pods = []

    for allocation in data:
        cpu_request = allocation.get('cpuCoreRequestAverage', 0)
        cpu_usage = allocation.get('cpuCoreUsageAverage', 0)
        mem_request = allocation.get('ramByteRequestAverage', 0)
        mem_usage = allocation.get('ramByteUsageAverage', 0)

        cpu_util = (cpu_usage / cpu_request) if cpu_request > 0 else 0
        mem_util = (mem_usage / mem_request) if mem_request > 0 else 0

        if cpu_util < CPU_THRESHOLD and mem_util < MEMORY_THRESHOLD:
            idle_pods.append({
                'name': allocation['name'],
                'namespace': allocation['properties'].get('namespace'),
                'cpu_utilization': cpu_util * 100,
                'memory_utilization': mem_util * 100,
                'cost': allocation.get('totalCost', 0)
            })

    return idle_pods

def main():
    idle_pods = get_idle_pods()

    total_waste = sum(p['cost'] for p in idle_pods)

    print(f"Found {len(idle_pods)} idle pods")
    print(f"Total waste: ${total_waste:.2f} per week")
    print("\nTop 10 idle pods:")

    sorted_pods = sorted(idle_pods, key=lambda x: x['cost'], reverse=True)[:10]
    for pod in sorted_pods:
        print(f"  {pod['namespace']}/{pod['name']}: ${pod['cost']:.2f} (CPU: {pod['cpu_utilization']:.1f}%, Mem: {pod['memory_utilization']:.1f}%)")

if __name__ == '__main__':
    main()
```

## Detecting Unused PersistentVolumeClaims

Find PVCs not mounted by any pods:

```bash
#!/bin/bash
# detect-unused-pvcs.sh

echo "Unused PersistentVolumeClaims:"
echo "=============================="

for namespace in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  pvcs=$(kubectl get pvc -n $namespace -o jsonpath='{.items[*].metadata.name}')

  for pvc in $pvcs; do
    # Check if PVC is mounted by any pod
    mounted=$(kubectl get pods -n $namespace -o json | \
      jq -r ".items[].spec.volumes[]? | select(.persistentVolumeClaim.claimName==\"$pvc\") | .persistentVolumeClaim.claimName")

    if [ -z "$mounted" ]; then
      size=$(kubectl get pvc $pvc -n $namespace -o jsonpath='{.status.capacity.storage}')
      age=$(kubectl get pvc $pvc -n $namespace -o jsonpath='{.metadata.creationTimestamp}')

      echo "  $namespace/$pvc - Size: $size, Age: $age"
    fi
  done
done
```

Calculate PVC waste cost:

```python
#!/usr/bin/env python3
# pvc-cost-calculator.py

import subprocess
import json
import re

def parse_storage(storage_str):
    """Convert storage string to GB"""
    if storage_str.endswith('Gi'):
        return float(storage_str[:-2])
    elif storage_str.endswith('Mi'):
        return float(storage_str[:-2]) / 1024
    elif storage_str.endswith('Ti'):
        return float(storage_str[:-2]) * 1024
    return 0

def get_unused_pvc_cost(cost_per_gb_month=0.10):
    """Calculate cost of unused PVCs"""
    cmd = "kubectl get pvc --all-namespaces -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    pvcs = json.loads(result.stdout)

    unused_cost = 0
    unused_pvcs = []

    for pvc in pvcs['items']:
        name = pvc['metadata']['name']
        namespace = pvc['metadata']['namespace']
        size_str = pvc['status'].get('capacity', {}).get('storage', '0')
        size_gb = parse_storage(size_str)

        # Check if mounted
        cmd_pods = f"kubectl get pods -n {namespace} -o json"
        result_pods = subprocess.run(cmd_pods.split(), capture_output=True, text=True)
        pods = json.loads(result_pods.stdout)

        mounted = False
        for pod in pods['items']:
            for volume in pod['spec'].get('volumes', []):
                if volume.get('persistentVolumeClaim', {}).get('claimName') == name:
                    mounted = True
                    break

        if not mounted:
            cost = size_gb * cost_per_gb_month
            unused_cost += cost
            unused_pvcs.append({
                'namespace': namespace,
                'name': name,
                'size_gb': size_gb,
                'monthly_cost': cost
            })

    print(f"Total unused PVC cost: ${unused_cost:.2f}/month")
    print(f"\nTop unused PVCs:")
    for pvc in sorted(unused_pvcs, key=lambda x: x['monthly_cost'], reverse=True)[:10]:
        print(f"  {pvc['namespace']}/{pvc['name']}: {pvc['size_gb']}GB = ${pvc['monthly_cost']:.2f}/month")

if __name__ == '__main__':
    get_unused_pvc_cost()
```

## Identifying Abandoned Namespaces

Detect namespaces with no activity:

```bash
#!/bin/bash
# detect-abandoned-namespaces.sh

DAYS_INACTIVE=30

for namespace in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces
  if [[ "$namespace" == kube-* ]] || [[ "$namespace" == "default" ]]; then
    continue
  fi

  # Get last activity (pod creation time)
  last_activity=$(kubectl get pods -n $namespace -o json 2>/dev/null | \
    jq -r '.items | sort_by(.metadata.creationTimestamp) | .[-1].metadata.creationTimestamp' 2>/dev/null)

  if [ "$last_activity" != "null" ] && [ -n "$last_activity" ]; then
    last_activity_seconds=$(date -d "$last_activity" +%s)
    current_seconds=$(date +%s)
    days_since=$((($current_seconds - $last_activity_seconds) / 86400))

    if [ $days_since -gt $DAYS_INACTIVE ]; then
      # Calculate namespace cost
      cost=$(curl -s -G http://kubecost.kubecost.svc:9090/model/allocation \
        --data-urlencode "window=30d" \
        --data-urlencode "aggregate=namespace" \
        --data-urlencode "filter=namespace:$namespace" | \
        jq -r '.data[0].totalCost // 0')

      echo "Abandoned namespace: $namespace (inactive for $days_since days, cost: \$$cost/month)"
    fi
  fi
done
```

## Automated Cleanup Workflow

Create cleanup policies:

```yaml
# cleanup-policy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cleanup-policies
  namespace: finops
data:
  policies.json: |
    {
      "idle_pods": {
        "enabled": true,
        "cpu_threshold": 0.1,
        "memory_threshold": 0.2,
        "min_age_days": 7,
        "dry_run": true
      },
      "unused_pvcs": {
        "enabled": true,
        "min_age_days": 30,
        "dry_run": true
      },
      "abandoned_namespaces": {
        "enabled": false,
        "inactive_days": 90,
        "exclude_patterns": ["prod-*", "staging-*"]
      }
    }
```

Automated cleanup script:

```python
#!/usr/bin/env python3
# automated-cleanup.py

import subprocess
import json
import requests
from datetime import datetime, timedelta

def cleanup_idle_pods(dry_run=True):
    """Scale down idle deployments"""
    idle_pods = detect_idle_pods()  # From previous script

    for pod in idle_pods:
        # Get deployment name
        cmd = f"kubectl get pod {pod['name']} -n {pod['namespace']} -o jsonpath='{{.metadata.ownerReferences[0].name}}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        deployment = result.stdout.strip()

        if deployment:
            print(f"Would scale down deployment {deployment} in namespace {pod['namespace']}")

            if not dry_run:
                cmd = f"kubectl scale deployment {deployment} -n {pod['namespace']} --replicas=0"
                subprocess.run(cmd, shell=True)
                print(f"  Scaled down {deployment}")

def cleanup_unused_pvcs(min_age_days=30, dry_run=True):
    """Delete unused PVCs"""
    # Implementation from previous script
    pass

def send_cleanup_report(cleaned_resources):
    """Send cleanup report to Slack"""
    webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

    message = {
        "text": "Weekly Kubernetes Resource Cleanup Report",
        "attachments": [{
            "fields": [
                {"title": "Idle Pods Scaled Down", "value": str(cleaned_resources['pods']), "short": True},
                {"title": "PVCs Deleted", "value": str(cleaned_resources['pvcs']), "short": True},
                {"title": "Estimated Monthly Savings", "value": f"${cleaned_resources['savings']:.2f}", "short": True}
            ]
        }]
    }

    requests.post(webhook_url, json=message)

if __name__ == '__main__':
    cleanup_idle_pods(dry_run=True)
    cleanup_unused_pvcs(dry_run=True)
```

Schedule as CronJob:

```yaml
# cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resource-cleanup
  namespace: finops
spec:
  schedule: "0 2 * * SUN"  # Every Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cleanup-sa
          containers:
          - name: cleanup
            image: cleanup-tool:v1.0
            env:
            - name: DRY_RUN
              value: "false"
          restartPolicy: OnFailure
```

## Conclusion

Automated detection and reclamation of idle resources is essential for cost optimization in Kubernetes. Using Kubecost APIs to identify underutilized pods, unused PVCs, and abandoned namespaces, combined with automated cleanup workflows, organizations typically recover 15-25% of their cloud spending. Implementing these practices as part of regular FinOps processes ensures sustained cost efficiency.
