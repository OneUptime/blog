# How to Troubleshoot CrashLoopBackOff Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, CrashLoopBackOff, Troubleshooting, Operation

Description: Diagnose and resolve Kubernetes CrashLoopBackOff errors for containers managed through Portainer's web interface.

## Introduction

CrashLoopBackOff means a container is crashing repeatedly. Kubernetes backs off exponentially between restarts. Portainer surfaces these failures in its Applications view, and this guide provides a systematic approach to diagnosing the root cause.

## Identifying CrashLoopBackOff in Portainer

1. **Applications**: Application and pod status show "CrashLoopBackOff"
2. **Application details > Events**: Shows application-related events that can hint at the failure
3. **Application containers > Logs**: Shows container output for the selected pod

## Step 1: Get the Exit Code

```bash
# Exit code and termination reason are strong clues

kubectl get pod crashing-pod -n production -o json \
  | python3 -c "
import sys, json
pod = json.load(sys.stdin)
for cs in pod['status'].get('containerStatuses', []):
    name = cs['name']
    restart_count = cs.get('restartCount', 0)
    last_state = cs.get('lastState', {}).get('terminated', {})
    exit_code = last_state.get('exitCode', 'N/A')
    reason = last_state.get('reason', 'N/A')
    print(f'{name}: restarts={restart_count}, exitCode={exit_code}, reason={reason}')
"
```

## Common Exit Codes

These are common Linux process exit codes. In Kubernetes, always check the termination `reason` alongside the numeric exit code.

| Exit Code | Meaning | Common Cause |
|-----------|---------|--------------|
| 0 | Success | Process exits immediately in a long-running workload |
| 1 | General error | Application error |
| 2 | Incorrect usage | Missing argument or invalid option |
| 137 | SIGKILL | Often OOMKilled in Kubernetes |
| 139 | Segmentation fault | Application bug |
| 143 | SIGTERM | Graceful shutdown (often during rollout or termination) |

## Step 2: Check Previous Container Logs

```bash
# Get logs from the PREVIOUS (crashed) container instance
kubectl logs crashing-pod -n production --previous

# In Portainer: open the pod logs from the Application containers section
```

## Diagnosing Specific Cases

### Case 1: Application Startup Error

```bash
# View startup logs
kubectl logs crashing-pod -n production --previous | head -50

# Common startup errors:
# - Missing environment variables
# - Database connection refused
# - Configuration file not found
# - Port already in use
```

### Case 2: OOMKilled (Exit Code 137)

```bash
# Check if OOMKilled
kubectl describe pod oom-pod -n production | grep -i "OOMKilled"

# Fix: Increase memory limit
kubectl patch deployment myapp -n production -p '{
  "spec": {"template": {"spec": {"containers": [
    {"name": "app", "resources": {"limits": {"memory": "512Mi"}}}
  ]}}}
}'
```

### Case 3: Missing Configuration

```bash
# Check if ConfigMap/Secret exists
kubectl get configmap app-config -n production
kubectl get secret app-secrets -n production

# Fix: Create missing resources
kubectl create configmap app-config \
  --from-literal=key=value \
  -n production
```

### Case 4: Container Command Error

```yaml
# Wrong command in deployment
containers:
- name: app
  image: myapp:latest
  command: ["python"]           # Missing args!
  # Should be:
  command: ["python", "app.py"]
```

## Debugging with an Overridden Command

```yaml
# Temporarily override command to keep container running for debugging
# Deploy via Portainer YAML editor (Business Edition)
containers:
- name: app
  image: myapp:latest
  command: ["sleep", "infinity"]  # Override crashing command temporarily
  # This keeps the container running so you can exec into it
```

```bash
# Then exec into it for investigation
kubectl exec -it crashing-pod -n production -- sh

# Check if dependencies are available
which python3
ls /app
cat /app/config.yaml
env | grep DATABASE
```

## Automatic Detection Script

```python
#!/usr/bin/env python3
# analyze_crashloop.py

import requests

PORTAINER_URL = "https://portainer.example.com"
API_KEY = "your-api-key"
ENDPOINT_ID = 1

def find_crashlooping_pods(namespace="default"):
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/kubernetes/api/v1/namespaces/{namespace}/pods",
        headers={"X-API-Key": API_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    pods = resp.json().get('items', [])
    
    crashlooping = []
    for pod in pods:
        for cs in pod['status'].get('containerStatuses', []):
            state = cs.get('state', {})
            waiting = state.get('waiting', {})
            if waiting.get('reason') == 'CrashLoopBackOff':
                crashlooping.append({
                    'pod': pod['metadata']['name'],
                    'container': cs['name'],
                    'restarts': cs.get('restartCount', 0),
                    'exit_code': cs.get('lastState', {}).get('terminated', {}).get('exitCode')
                })
    
    return crashlooping

pods = find_crashlooping_pods("production")
for p in pods:
    print(f"CrashLoop: {p['pod']}/{p['container']} "
          f"(restarts: {p['restarts']}, last exit: {p['exit_code']})")
```

## Conclusion

CrashLoopBackOff diagnosis follows a systematic pattern: get the exit code, check previous container logs, identify the root cause (OOM, app error, config missing), and apply the fix. Portainer's Applications and pod log views help you spot failures quickly, while `kubectl logs --previous` gives you the last crashed container output. For complex issues, temporarily overriding the container command to keep it running enables interactive debugging.
