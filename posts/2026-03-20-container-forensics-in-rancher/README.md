# How to Perform Container Forensics in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Container Forensics, Security, Incident Response, Debugging

Description: Learn how to investigate compromised or misbehaving containers in Rancher using exec, logs, ephemeral debug containers, and resource inspection.

---

Container forensics involves examining a running or terminated container to understand what happened - whether investigating a security incident, a crash, or unexpected behavior. Rancher provides several tools for this investigation.

---

## Inspect Container Logs

```bash
# Via kubectl

kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -c <container-name> --previous  # crashed container logs

# View logs in Rancher UI
# Navigate to: Cluster → Workloads → Pods → <pod> → Logs
```

---

## Execute Commands in a Running Container

```bash
# Open a shell
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Run a specific investigation command
kubectl exec <pod-name> -- ps aux
kubectl exec <pod-name> -- netstat -tlnp
kubectl exec <pod-name> -- env
kubectl exec <pod-name> -- cat /etc/passwd
```

In Rancher UI: **Cluster** → **Workloads** → **Pods** → **Execute Shell**

---

## Capture a Container Image Snapshot

```bash
# On the node running the container
# Find container ID
crictl ps | grep <pod-name>
CONTAINER_ID=<id>

# Inspect the container filesystem
crictl inspect ${CONTAINER_ID}

# Copy files from container to node
kubectl cp <pod-name>:/var/log/app.log ./forensics/app.log
kubectl cp <pod-name>:/tmp ./forensics/tmp-dir/
```

---

## Examine Network Connections

```bash
# Check active connections inside the pod
kubectl exec <pod-name> -- ss -tlnp
kubectl exec <pod-name> -- cat /proc/net/tcp

# Capture packets (if tcpdump available)
kubectl exec <pod-name> -- tcpdump -i eth0 -w /tmp/capture.pcap
kubectl cp <pod-name>:/tmp/capture.pcap ./capture.pcap
```

---

## Review Resource Consumption

```bash
# CPU/memory at the pod level
kubectl top pod <pod-name> -n <namespace>

# Per-container
kubectl top pod <pod-name> --containers

# Rancher UI: Cluster → Monitoring → Workload metrics
```

---

## Check Events and Conditions

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

---

## Isolate a Suspicious Pod

```bash
# Remove pod from service load balancing by removing the label the service selector uses
# (e.g., if the service selector is app=myapp, remove the app label from the pod)
kubectl label pod <pod-name> quarantine=true --overwrite
kubectl label pod <pod-name> app- --overwrite
```

---

## Summary

Use `kubectl logs` and `kubectl exec` for quick investigation. Copy files with `kubectl cp` for offline analysis. Check network connections and running processes inside the container. Isolate suspicious pods by removing them from service selectors without terminating them. Rancher's UI provides the same capabilities with a graphical interface for teams less comfortable with CLI tools.
