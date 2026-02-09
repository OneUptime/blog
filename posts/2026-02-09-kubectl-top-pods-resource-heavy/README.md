# How to Use kubectl top pods to Identify Resource-Heavy Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Resource Management, kubectl, Performance

Description: Master kubectl top pods command to monitor resource usage, identify resource-heavy containers, and optimize Kubernetes workload performance.

---

The kubectl top command provides real-time resource metrics for pods and containers running in your Kubernetes cluster. It's essential for identifying resource-heavy workloads, detecting anomalies, and making informed decisions about resource allocation.

## Prerequisites and Setup

kubectl top requires the Metrics Server to be installed in your cluster:

```bash
# Check if Metrics Server is running
kubectl get deployment metrics-server -n kube-system

# If not installed, deploy it
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify Metrics Server is working:

```bash
# Should return metrics after a minute
kubectl top nodes
```

## Basic Usage

View resource usage for all pods:

```bash
# Show CPU and memory usage
kubectl top pods

# Output example:
NAME                     CPU(cores)   MEMORY(bytes)
myapp-7d8f9b6c5d-k4m2n   250m         512Mi
redis-6b7f8c9d5e-x8n2p   15m          64Mi
nginx-5c8d7b6f4e-p9m3k   5m           32Mi
```

View pods in a specific namespace:

```bash
kubectl top pods -n production
kubectl top pods --namespace=kube-system
```

## Identifying Resource-Heavy Containers

Sort pods by resource usage:

```bash
# Sort by CPU (not built-in, use external sort)
kubectl top pods --no-headers | sort -k2 -rn | head -10

# Sort by memory
kubectl top pods --no-headers | sort -k3 -rn | head -10

# Create helper functions
alias top-cpu="kubectl top pods --no-headers | sort -k2 -rn | head -10"
alias top-mem="kubectl top pods --no-headers | sort -k3 -rn | head -10"
```

View containers within pods:

```bash
# Show containers in pods
kubectl top pods --containers

# Output example:
POD                      NAME       CPU(cores)   MEMORY(bytes)
myapp-7d8f9b6c5d-k4m2n   myapp      230m         480Mi
myapp-7d8f9b6c5d-k4m2n   sidecar    20m          32Mi
```

Filter by labels:

```bash
# View specific deployment
kubectl top pods -l app=myapp

# View by tier
kubectl top pods -l tier=frontend

# Multiple label selectors
kubectl top pods -l app=myapp,version=v2
```

## Analyzing Resource Utilization

Compare usage against requests and limits:

```bash
# Get pod resource usage
kubectl top pod myapp-7d8f9b6c5d-k4m2n

# Get configured requests/limits
kubectl get pod myapp-7d8f9b6c5d-k4m2n -o jsonpath='{.spec.containers[*].resources}'

# Create a comparison script
cat > check-resources.sh <<'EOF'
#!/bin/bash
POD=$1

echo "=== $POD Resource Analysis ==="

# Get actual usage
USAGE=$(kubectl top pod $POD --no-headers)
CPU_USAGE=$(echo $USAGE | awk '{print $2}')
MEM_USAGE=$(echo $USAGE | awk '{print $3}')

echo "Actual Usage:"
echo "  CPU: $CPU_USAGE"
echo "  Memory: $MEM_USAGE"

# Get requests
echo "Configured Resources:"
kubectl get pod $POD -o jsonpath='{range .spec.containers[*]}{.name}{"\n"}  Requests: CPU={.resources.requests.cpu} Memory={.resources.requests.memory}{"\n"}  Limits: CPU={.resources.limits.cpu} Memory={.resources.limits.memory}{"\n"}{end}'
EOF

chmod +x check-resources.sh
./check-resources.sh myapp-pod
```

## Monitoring Over Time

Create continuous monitoring:

```bash
# Watch resource usage (updates every 2 seconds)
watch -n 2 'kubectl top pods'

# Watch specific namespace
watch -n 2 'kubectl top pods -n production'

# Watch and sort by CPU
watch -n 2 'kubectl top pods --no-headers | sort -k2 -rn | head -20'
```

Log resource usage for historical analysis:

```bash
# Collect metrics every 30 seconds
while true; do
  echo "=== $(date) ===" >> metrics.log
  kubectl top pods >> metrics.log
  sleep 30
done

# Collect with timestamp and container breakdown
while true; do
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') ===" >> detailed-metrics.log
  kubectl top pods --containers --all-namespaces >> detailed-metrics.log
  sleep 60
done
```

## Finding Resource Anomalies

Identify pods using more than expected:

```bash
# Find pods using > 500m CPU
kubectl top pods --all-namespaces --no-headers | awk '$2 ~ /[0-9]+m/ && $2+0 > 500'

# Find pods using > 1GB memory
kubectl top pods --all-namespaces --no-headers | awk '$3 ~ /[0-9]+Mi/ && $3+0 > 1024'

# Find pods using > 1 CPU core
kubectl top pods --all-namespaces --no-headers | awk '$2 ~ /[0-9]+$/ && $2+0 >= 1'
```

Create an alert script:

```bash
#!/bin/bash
# resource-alerts.sh

CPU_THRESHOLD=800  # millicores
MEM_THRESHOLD=2048 # Mi

echo "Checking for resource anomalies..."

kubectl top pods --all-namespaces --no-headers | while read namespace pod cpu mem; do
  # Remove 'm' suffix and convert to number
  cpu_num=$(echo $cpu | sed 's/m//')

  # Check if CPU exceeds threshold
  if [ "$cpu_num" -gt "$CPU_THRESHOLD" ]; then
    echo "HIGH CPU: $namespace/$pod is using $cpu (threshold: ${CPU_THRESHOLD}m)"
  fi

  # Check memory (simple comparison for Mi values)
  mem_num=$(echo $mem | sed 's/Mi//')
  if [ ! -z "$mem_num" ] && [ "$mem_num" -gt "$MEM_THRESHOLD" ]; then
    echo "HIGH MEMORY: $namespace/$pod is using $mem (threshold: ${MEM_THRESHOLD}Mi)"
  fi
done
```

## Analyzing Resource Efficiency

Calculate resource utilization rates:

```bash
# Compare usage to requests
cat > utilization.sh <<'EOF'
#!/bin/bash

echo "Pod,Container,CPU_Used,CPU_Request,CPU_Util%,Mem_Used,Mem_Request,Mem_Util%"

for pod in $(kubectl get pods -o name); do
  POD_NAME=$(basename $pod)

  # Get usage
  USAGE=$(kubectl top pod $POD_NAME --containers --no-headers 2>/dev/null)

  if [ -z "$USAGE" ]; then
    continue
  fi

  echo "$USAGE" | while read pod_col container cpu mem; do
    # Get requests
    REQUESTS=$(kubectl get pod $POD_NAME -o jsonpath="{.spec.containers[?(@.name=='$container')].resources.requests}")

    CPU_REQ=$(echo $REQUESTS | jq -r '.cpu // "0"' | sed 's/m//')
    MEM_REQ=$(echo $REQUESTS | jq -r '.memory // "0"' | sed 's/Mi//')

    # Calculate utilization
    CPU_USED=$(echo $cpu | sed 's/m//')
    MEM_USED=$(echo $mem | sed 's/Mi//')

    if [ "$CPU_REQ" != "0" ] && [ ! -z "$CPU_REQ" ]; then
      CPU_UTIL=$((CPU_USED * 100 / CPU_REQ))
    else
      CPU_UTIL="N/A"
    fi

    if [ "$MEM_REQ" != "0" ] && [ ! -z "$MEM_REQ" ]; then
      MEM_UTIL=$((MEM_USED * 100 / MEM_REQ))
    else
      MEM_UTIL="N/A"
    fi

    echo "$POD_NAME,$container,$cpu,$CPU_REQ,$CPU_UTIL,$mem,$MEM_REQ,$MEM_UTIL"
  done
done
EOF

chmod +x utilization.sh
./utilization.sh
```

## Debugging High Resource Usage

Investigate CPU-heavy pods:

```bash
# Identify high CPU pod
HIGH_CPU_POD=$(kubectl top pods --no-headers | sort -k2 -rn | head -1 | awk '{print $1}')

echo "High CPU Pod: $HIGH_CPU_POD"

# Get detailed info
kubectl describe pod $HIGH_CPU_POD | grep -A 5 "Limits:\|Requests:"

# Check what processes are running
kubectl exec $HIGH_CPU_POD -- top -b -n 1 | head -15

# Check for CPU throttling
kubectl describe pod $HIGH_CPU_POD | grep -i throttl

# View recent logs
kubectl logs $HIGH_CPU_POD --tail=50
```

Investigate memory-heavy pods:

```bash
# Identify high memory pod
HIGH_MEM_POD=$(kubectl top pods --no-headers | sort -k3 -rn | head -1 | awk '{print $1}')

echo "High Memory Pod: $HIGH_MEM_POD"

# Check memory limits
kubectl get pod $HIGH_MEM_POD -o jsonpath='{.spec.containers[*].resources.limits.memory}'

# Check for OOMKilled
kubectl describe pod $HIGH_MEM_POD | grep -i "OOMKilled\|terminated"

# View memory usage inside container
kubectl exec $HIGH_MEM_POD -- free -h
kubectl exec $HIGH_MEM_POD -- ps aux --sort=-%mem | head -10
```

## Creating Dashboards

Generate text-based resource dashboard:

```bash
#!/bin/bash
# resource-dashboard.sh

clear

while true; do
  tput cup 0 0  # Move cursor to top

  echo "=== Kubernetes Resource Dashboard ==="
  echo "$(date)"
  echo ""

  echo "TOP 10 CPU CONSUMERS:"
  kubectl top pods --all-namespaces --no-headers | sort -k3 -rn | head -10

  echo ""
  echo "TOP 10 MEMORY CONSUMERS:"
  kubectl top pods --all-namespaces --no-headers | sort -k4 -rn | head -10

  echo ""
  echo "RESOURCE SUMMARY:"
  echo -n "Total Pods: "
  kubectl get pods --all-namespaces --no-headers | wc -l

  echo -n "Running Pods: "
  kubectl get pods --all-namespaces --field-selector=status.phase=Running --no-headers | wc -l

  sleep 5
done
```

Export to CSV for analysis:

```bash
# Collect metrics to CSV
echo "Timestamp,Namespace,Pod,CPU,Memory" > metrics.csv

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  kubectl top pods --all-namespaces --no-headers | while read ns pod cpu mem; do
    echo "$TIMESTAMP,$ns,$pod,$cpu,$mem" >> metrics.csv
  done
  sleep 60
done
```

## Comparing Resource Usage

Compare before and after changes:

```bash
# Capture baseline
kubectl top pods -l app=myapp > before.txt

# Make changes (scale, update resources, etc.)
kubectl scale deployment myapp --replicas=5

# Wait and capture new metrics
sleep 60
kubectl top pods -l app=myapp > after.txt

# Compare
diff before.txt after.txt
```

## Integration with Other Tools

Combine with kubectl get for comprehensive view:

```bash
# Show resource usage alongside pod status
join -1 1 -2 1 \
  <(kubectl get pods --no-headers | sort -k1) \
  <(kubectl top pods --no-headers | sort -k1)

# Create comprehensive report
cat > pod-report.sh <<'EOF'
#!/bin/bash

echo "Pod,Status,Restarts,Age,CPU,Memory"

kubectl get pods --no-headers | while read pod ready status restarts age; do
  METRICS=$(kubectl top pod $pod --no-headers 2>/dev/null | awk '{print $2","$3}')

  if [ -z "$METRICS" ]; then
    METRICS="N/A,N/A"
  fi

  echo "$pod,$status,$restarts,$age,$METRICS"
done
EOF

chmod +x pod-report.sh
./pod-report.sh | column -t -s,
```

## Best Practices

1. Regular monitoring - Set up scheduled metric collection
2. Set appropriate thresholds - Define what "high" means for your workloads
3. Compare to requests/limits - Ensure resources are properly configured
4. Track trends - Historical data reveals patterns
5. Automate alerts - Don't rely on manual checking

Create a monitoring cron job:

```bash
# Add to crontab
*/5 * * * * /path/to/resource-alerts.sh >> /var/log/k8s-alerts.log
```

## Conclusion

kubectl top pods is a powerful tool for real-time resource monitoring in Kubernetes. By understanding how to sort, filter, and analyze its output, you can quickly identify resource-heavy containers, detect anomalies, and make data-driven decisions about resource allocation and optimization.

Combine kubectl top with describe, logs, and exec commands for comprehensive troubleshooting. Create scripts and dashboards to automate monitoring and establish baselines for your workloads to spot deviations quickly.
