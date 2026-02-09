# How to Create Incident Response Runbooks for Common Kubernetes Production Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Incident Response, Operations, Documentation

Description: Build comprehensive incident response runbooks for common Kubernetes production failures, enabling faster resolution and reducing the stress of emergency situations through clear, actionable procedures.

---

When your Kubernetes cluster experiences a production incident at 3 AM, you need clear, tested procedures that guide responders through diagnosis and resolution. Incident response runbooks provide that guidance, transforming chaotic emergencies into structured problem-solving exercises.

Runbooks are not just documentation for documentation's sake. They are operational tools that reduce mean time to recovery by eliminating decision paralysis and guesswork. A good runbook walks an on-call engineer through symptoms, diagnosis, and remediation steps without requiring them to recall obscure commands or debate the best approach while users suffer.

The most valuable runbooks address recurring production issues: pod scheduling failures, resource exhaustion, networking problems, and application crashes. By documenting solutions to these common problems, you build organizational knowledge that persists beyond individual engineers.

## Structure of Effective Kubernetes Runbooks

Every effective runbook follows a consistent structure that guides responders from initial alert through resolution. Start with clear symptom identification so responders can quickly determine if this runbook applies to their current situation.

```markdown
# Runbook: Pod Scheduling Failures (Insufficient CPU)

## Symptoms
- Alert: "High pod pending rate in namespace X"
- Pods stuck in Pending state with no node assignment
- kubectl describe shows "Insufficient cpu" in Events section
- New deployments fail to roll out

## Impact
- New application instances cannot start
- Scaling operations fail
- Degraded service capacity during traffic spikes
- Potential service outages if all pods crash simultaneously

## Severity: P1 (Critical)
```

The symptoms section helps responders confirm they are using the right runbook. The impact section explains why this problem matters and helps with prioritization. Severity classification guides response urgency.

Next, provide clear diagnosis steps that help responders understand the root cause:

```markdown
## Diagnosis

### 1. Verify pod status and reason
```bash
# List pending pods
kubectl get pods --all-namespaces --field-selector=status.phase=Pending

# Check specific pod details
kubectl describe pod <pod-name> -n <namespace>
# Look for "Warning FailedScheduling" events
```

### 2. Check cluster resource capacity
```bash
# View node resource allocations
kubectl top nodes

# See detailed resource requests/limits per node
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### 3. Identify resource-hungry pods
```bash
# List pods by CPU request
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name) CPU: \(.spec.containers[].resources.requests.cpu)"' | \
  sort -k3 -rn | head -20
```
```

Diagnosis steps build understanding through observation. Each command includes comments explaining what to look for in the output. This helps responders learn while resolving incidents.

## Runbook for Pod Scheduling Failures

One of the most common Kubernetes production issues is pod scheduling failures. Pods remain in Pending state because the scheduler cannot find suitable nodes. Here is a complete runbook addressing this issue:

```markdown
# Runbook: Pod Scheduling Failures

## Immediate Actions

### Step 1: Determine if this is an emergency
Check if critical services are affected:
```bash
# Check if production services have pending pods
kubectl get pods -n production --field-selector=status.phase=Pending

# Verify service availability
curl -I https://api.example.com/health
```

If critical services are down, escalate immediately and consider temporary mitigation.

### Step 2: Quick mitigation options
If immediate capacity is needed:

**Option A: Scale down non-critical workloads**
```bash
# Identify non-critical deployments
kubectl get deployments --all-namespaces -l priority=low

# Temporarily scale down
kubectl scale deployment/non-critical-job -n batch --replicas=0
```

**Option B: Add node capacity (cloud environments)**
```bash
# GKE: Scale up node pool
gcloud container clusters resize production-cluster \
  --node-pool=default-pool \
  --num-nodes=5

# EKS: Update desired capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name=eks-node-group \
  --desired-capacity=5
```

### Step 3: Identify root cause
Check for common causes in order:

**A. Insufficient CPU resources**
```bash
kubectl describe nodes | grep -E "Allocated resources|cpu.*requests"
```

**B. Insufficient memory resources**
```bash
kubectl describe nodes | grep -E "Allocated resources|memory.*requests"
```

**C. Node selector or affinity constraints**
```bash
kubectl get pod <pending-pod> -o yaml | grep -A 10 "nodeSelector\|affinity"
```

**D. Taints and tolerations**
```bash
kubectl describe node <node-name> | grep Taints
kubectl get pod <pending-pod> -o yaml | grep -A 5 tolerations
```

**E. Pod Disruption Budget blocking operations**
```bash
kubectl get pdb --all-namespaces
kubectl describe pdb <pdb-name> -n <namespace>
```

## Resolution Steps

### For insufficient resources:
1. Scale up cluster capacity (see Step 2, Option B)
2. Right-size resource requests for over-provisioned pods
3. Remove unused deployments

### For scheduling constraint issues:
1. Review and adjust node selectors if overly restrictive
2. Add tolerations to pod specs if nodes are tainted
3. Modify affinity rules if preventing scheduling

### For PDB issues:
1. Temporarily adjust minAvailable in PDB if safe
2. Add more replicas to deployment
3. Review PDB configuration for correctness

## Verification
After resolution, verify:
```bash
# All pods should be Running
kubectl get pods --all-namespaces --field-selector=status.phase=Pending

# Check resource utilization
kubectl top nodes

# Verify application health
curl https://api.example.com/health
```

## Prevention
- Set up alerts for node resource utilization above 75%
- Implement cluster autoscaling
- Regular review of resource requests vs actual usage
- Documentation of node labeling and taint strategy
```

This runbook provides a complete workflow from detection through resolution and prevention. Responders follow a clear path without needing to remember every kubectl command.

## Runbook for Application Crash Loops

Another common production issue is pods stuck in CrashLoopBackOff state. This runbook guides responders through diagnosis and resolution:

```markdown
# Runbook: Application Crash Loops (CrashLoopBackOff)

## Symptoms
- Pods repeatedly restarting
- Status shows "CrashLoopBackOff"
- Application unavailable or degraded
- High restart count in pod status

## Diagnosis

### Step 1: Check pod status
```bash
# Identify crashing pods
kubectl get pods --all-namespaces | grep CrashLoopBackOff

# View restart count and age
kubectl get pod <pod-name> -n <namespace>
```

### Step 2: Examine container logs
```bash
# View current logs
kubectl logs <pod-name> -n <namespace>

# View logs from previous crash
kubectl logs <pod-name> -n <namespace> --previous

# Follow logs in real time
kubectl logs <pod-name> -n <namespace> -f
```

### Step 3: Check container exit reason
```bash
# Get detailed pod status
kubectl describe pod <pod-name> -n <namespace>

# Look for:
# - Last State: Terminated
# - Reason: Error/OOMKilled/ContainerCannotRun
# - Exit Code: (0=success, non-zero=error)
```

### Step 4: Review recent changes
```bash
# Check deployment history
kubectl rollout history deployment/<deployment-name> -n <namespace>

# Compare current with previous version
kubectl rollout history deployment/<deployment-name> --revision=<current>
kubectl rollout history deployment/<deployment-name> --revision=<previous>
```

## Resolution

### For configuration errors:
```bash
# Check ConfigMap and Secret references
kubectl get configmap -n <namespace>
kubectl get secret -n <namespace>

# Verify environment variables
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].env}'
```

### For out-of-memory kills (OOMKilled):
```bash
# Check memory limits
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].resources.limits.memory}'

# Increase memory limit
kubectl patch deployment <deployment-name> -n <namespace> -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"<container>","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### For application errors:
```bash
# Rollback to previous working version
kubectl rollout undo deployment/<deployment-name> -n <namespace>

# Verify rollback
kubectl rollout status deployment/<deployment-name> -n <namespace>
```

### For dependency issues:
```bash
# Check if dependencies are healthy
kubectl get pods -n <namespace> -l app=database
kubectl logs <database-pod> -n <namespace>

# Test connectivity to dependencies
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://database:5432
```

## Verification
```bash
# Pod should be in Running state
kubectl get pod <pod-name> -n <namespace>

# No recent restarts
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].restartCount}'

# Application responding
kubectl exec <pod-name> -n <namespace> -- wget -O- localhost:8080/health
```
```

This runbook methodically addresses the most common causes of crash loops, providing specific commands for each scenario.

## Runbook for Networking and Service Discovery Issues

Networking problems in Kubernetes can be particularly challenging to diagnose. This runbook addresses common networking failures:

```markdown
# Runbook: Service Discovery and Networking Failures

## Symptoms
- Services unreachable by DNS name
- Connection timeouts between pods
- Ingress returning 503/504 errors
- Intermittent connectivity issues

## Diagnosis

### Step 1: Verify service exists and has endpoints
```bash
# Check service
kubectl get service <service-name> -n <namespace>

# Verify endpoints are populated
kubectl get endpoints <service-name> -n <namespace>

# Check if pods match service selector
kubectl get pods -n <namespace> -l <selector-from-service>
```

### Step 2: Test DNS resolution
```bash
# Run DNS lookup from debug pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup <service-name>.<namespace>.svc.cluster.local

# Check CoreDNS pods are healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Step 3: Test network connectivity
```bash
# Test TCP connection to service
kubectl run -it --rm debug --image=busybox --restart=Never -- telnet <service-name> <port>

# Test HTTP connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://<service-name>:<port>/health
```

### Step 4: Check network policies
```bash
# List network policies affecting namespace
kubectl get networkpolicy -n <namespace>

# Describe specific policy
kubectl describe networkpolicy <policy-name> -n <namespace>
```

## Resolution

### For missing endpoints:
1. Verify pods are ready and passing readiness probes
2. Check service selector matches pod labels
3. Ensure pods are not stuck in Pending state

### For DNS issues:
```bash
# Restart CoreDNS pods
kubectl rollout restart deployment/coredns -n kube-system

# Verify CoreDNS config
kubectl get configmap coredns -n kube-system -o yaml
```

### For network policy blocks:
```bash
# Temporarily allow all traffic for testing
kubectl label namespace <namespace> network-policy-test=true

# Create temporary allow-all policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-temporary
  namespace: <namespace>
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - {}
  egress:
  - {}
EOF
```

## Verification
```bash
# Test service connectivity
kubectl run -it --rm test --image=curlimages/curl --restart=Never -- \
  curl http://<service-name>:<port>/health

# Check ingress status
kubectl describe ingress <ingress-name> -n <namespace>
```
```

## Maintaining and Improving Runbooks

Runbooks are living documents that require regular maintenance. After each incident, review the runbook used and update it based on lessons learned. Did responders struggle with any steps? Were additional commands needed? Did the diagnosis path work efficiently?

Schedule quarterly runbook reviews with your team. Test each runbook by simulating the failure scenario in a non-production environment. This validates that commands still work and helps team members become familiar with procedures before incidents occur.

Store runbooks in version control alongside your infrastructure code. This provides change history and enables collaborative improvement through pull requests. Include runbooks in your CI/CD pipeline documentation so they remain discoverable when needed.

Effective incident response runbooks transform your team's ability to handle production issues. By documenting common failure modes and proven resolution steps, you reduce stress, minimize downtime, and build organizational resilience. The time invested in creating comprehensive runbooks pays dividends during every incident they help resolve quickly.
