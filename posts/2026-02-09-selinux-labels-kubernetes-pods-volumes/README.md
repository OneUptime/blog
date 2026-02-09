# How to Enforce SELinux Labels on Kubernetes Pods and Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, SELinux

Description: Learn how to configure SELinux labels on Kubernetes pods and volumes for mandatory access control in Red Hat and CentOS based clusters.

---

Security-Enhanced Linux (SELinux) provides mandatory access control (MAC) through type enforcement and labels. When running Kubernetes on Red Hat Enterprise Linux, CentOS, or Fedora, properly configuring SELinux labels prevents privilege escalation and unauthorized resource access. Without correct labels, containers may fail to access mounted volumes or experience permission errors.

## Understanding SELinux Contexts

SELinux assigns security contexts to processes and files. A context has four components: `user:role:type:level`. For Kubernetes, the type component matters most. Container processes run with the `container_t` type, while volumes need compatible labels for access.

When a pod mounts a volume, SELinux checks if the container's security context allows access to the volume's label. Mismatched labels cause permission denied errors even when filesystem permissions allow access.

## Checking SELinux Status

Verify SELinux is enabled on your nodes:

```bash
# Check SELinux status
ssh node01 "sestatus"

# Check if running in enforcing mode
ssh node01 "getenforce"
# Output should be: Enforcing

# View current process contexts
ssh node01 "ps auxZ | grep containerd"
```

Most RHEL-based production systems run SELinux in enforcing mode for security compliance.

## Setting SELinux Options on Pods

Configure SELinux labels in the pod security context:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-selinux
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c123,c456"
      type: "container_t"
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: data
      mountPath: /usr/share/nginx/html
  volumes:
  - name: data
    emptyDir: {}
```

The `level` field uses Multi-Category Security (MCS) to isolate containers. Each container gets a unique category pair preventing access to other containers' data.

## Container-Specific SELinux Labels

Apply different labels to different containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-selinux
spec:
  containers:
  - name: web
    image: nginx:1.21
    securityContext:
      seLinuxOptions:
        type: "container_t"
        level: "s0:c100,c200"
    volumeMounts:
    - name: web-data
      mountPath: /data

  - name: logger
    image: fluent/fluentd:latest
    securityContext:
      seLinuxOptions:
        type: "container_t"
        level: "s0:c300,c400"
    volumeMounts:
    - name: logs
      mountPath: /logs

  volumes:
  - name: web-data
    emptyDir: {}
  - name: logs
    emptyDir: {}
```

Each container gets isolated MCS categories preventing cross-container access.

## Volume SELinux Labels

Set SELinux labels on volumes for proper access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-selinux
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c500,c600"
  containers:
  - name: postgres
    image: postgres:14
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
    volumeMounts:
    - name: pgdata
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: pgdata
    persistentVolumeClaim:
      claimName: postgres-pvc
```

When using PersistentVolumes, the CSI driver must support SELinux labeling. Most modern drivers handle this automatically.

## Persistent Volume Claims with SELinux

Configure PVCs with appropriate access modes for SELinux:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-pvc
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c700,c800"
      type: "container_t"
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data-pvc
```

The CSI driver relabels the volume to match the pod's SELinux context during mount.

## Debugging SELinux Denials

When containers cannot access volumes, check for SELinux denials:

```bash
# Check for recent SELinux denials
ssh node01 "sudo ausearch -m avc -ts recent"

# View denials in audit log
ssh node01 "sudo grep denied /var/log/audit/audit.log | tail -20"

# Use audit2why to understand denials
ssh node01 "sudo grep denied /var/log/audit/audit.log | audit2why"
```

Example denial:

```
type=AVC msg=audit(1612345678.123:456): avc:  denied  { read } for
pid=1234 comm="nginx" name="index.html" dev="sda1" ino=5678
scontext=system_u:system_r:container_t:s0:c100,c200
tcontext=system_u:object_r:container_file_t:s0:c300,c400
tclass=file permissive=0
```

This shows a context mismatch between the container (c100,c200) and the file (c300,c400).

## Fixing Volume Labeling Issues

Manually relabel volumes when automatic labeling fails:

```bash
# Find the volume mount point on the node
NODE="worker-01"
PV_NAME="pvc-abc123"

# SSH to node and find mount point
MOUNT_POINT=$(ssh $NODE "mount | grep $PV_NAME | awk '{print \$3}'")

# Relabel the volume
ssh $NODE "sudo chcon -R -t container_file_t -l s0:c700,c800 $MOUNT_POINT"

# Verify labeling
ssh $NODE "ls -Z $MOUNT_POINT"
```

## Using fsGroup with SELinux

Combine fsGroup with SELinux labels:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-combined-security
spec:
  securityContext:
    fsGroup: 2000
    seLinuxOptions:
      level: "s0:c900,c1000"
      type: "container_t"
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      runAsUser: 1000
      runAsGroup: 2000
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-pvc
```

Both fsGroup and SELinux labels apply, providing layered security.

## HostPath Volumes and SELinux

HostPath volumes require specific SELinux types:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: log-collector
spec:
  securityContext:
    seLinuxOptions:
      type: "spc_t"  # Super privileged container type
  containers:
  - name: collector
    image: fluent/fluentd:latest
    volumeMounts:
    - name: host-logs
      mountPath: /var/log/host
      readOnly: true
  volumes:
  - name: host-logs
    hostPath:
      path: /var/log
      type: Directory
```

The `spc_t` type allows access to host resources but should only be used for infrastructure pods.

## StatefulSet with SELinux

Configure StatefulSets with consistent labeling:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-selinux
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      securityContext:
        seLinuxOptions:
          level: "s0:c1100,c1200"
          type: "container_t"
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

Each replica gets the same SELinux level, allowing consistent volume access.

## Custom SELinux Policies

For advanced scenarios, create custom SELinux policies:

```bash
# Generate policy from denials
ssh node01 "sudo grep denied /var/log/audit/audit.log | audit2allow -M mypolicy"

# Install the policy
ssh node01 "sudo semodule -i mypolicy.pp"

# Verify installation
ssh node01 "sudo semodule -l | grep mypolicy"
```

Example custom policy for application access:

```te
module myapp 1.0;

require {
    type container_t;
    type container_file_t;
    class file { read write };
}

# Allow containers to access specific files
allow container_t container_file_t:file { read write };
```

## Monitoring SELinux Events

Set up monitoring for SELinux denials:

```bash
#!/bin/bash
# monitor-selinux-denials.sh

NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for node in $NODES; do
  echo "Checking node: $node"

  denials=$(ssh $node "sudo ausearch -m avc -ts today 2>/dev/null | grep denied | wc -l")

  if [ "$denials" -gt 0 ]; then
    echo "  WARNING: $denials SELinux denials found"
    ssh $node "sudo ausearch -m avc -ts today 2>/dev/null | grep denied | tail -5"
  else
    echo "  OK: No denials"
  fi

  echo ""
done
```

## Best Practices for SELinux in Kubernetes

Always run SELinux in enforcing mode for production clusters. Permissive mode logs violations without blocking, defeating the security purpose.

Use unique MCS categories for each pod to ensure isolation. Kubernetes automatically generates unique categories when you don't specify them.

Test SELinux configurations in development before deploying to production. SELinux denials can cause hard-to-debug application failures.

Monitor audit logs regularly for denials. Frequent denials indicate misconfigured labels or applications trying to access unauthorized resources.

Avoid using `spc_t` type except for essential system pods. This type bypasses SELinux protections.

Document your SELinux labeling strategy. Team members need to understand why specific labels are used.

## Conclusion

SELinux labels provide mandatory access control for Kubernetes pods and volumes on RHEL-based systems. Proper configuration prevents unauthorized access while maintaining application functionality. By understanding security contexts, volume labeling, and debugging techniques, you can run secure, compliant Kubernetes clusters with SELinux enforcing.
