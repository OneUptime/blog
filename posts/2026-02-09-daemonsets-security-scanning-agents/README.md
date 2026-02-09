# How to Use DaemonSets for Security Scanning Agents on Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Security, Vulnerability Scanning, Compliance

Description: Learn how to deploy security scanning agents using Kubernetes DaemonSets to perform continuous vulnerability assessment, compliance checking, and threat detection across all cluster nodes.

---

Security scanning must cover every node in your cluster to detect vulnerabilities, misconfigurations, and threats. DaemonSets ensure security agents run on all nodes, providing comprehensive coverage even as nodes scale. This guide demonstrates deploying various security scanning solutions as DaemonSets.

## Understanding Security Scanning with DaemonSets

Security agents need privileged access to scan containers, filesystems, and processes. They typically mount host directories to inspect files, access container runtimes to scan images, and monitor system calls for threat detection. DaemonSets provide the ideal deployment model, placing one agent per node with necessary privileges.

Common security scans include vulnerability scanning for container images and binaries, compliance checking against CIS benchmarks and organizational policies, runtime threat detection for suspicious behavior, and configuration auditing for security best practices.

## Deploying Falco for Runtime Security

Falco monitors system calls for suspicious activity:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: falco
  namespace: security
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: falco
rules:
- apiGroups: [""]
  resources: ["nodes", "namespaces", "pods", "replicationcontrollers", "services", "events"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["daemonsets", "deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: falco
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: falco
subjects:
- kind: ServiceAccount
  name: falco
  namespace: security
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: security
  labels:
    app: falco
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      serviceAccountName: falco
      hostNetwork: true
      hostPID: true
      containers:
      - name: falco
        image: falcosecurity/falco:0.36.0
        securityContext:
          privileged: true
        args:
        - /usr/bin/falco
        - --cri
        - /run/containerd/containerd.sock
        - -K
        - /var/run/secrets/kubernetes.io/serviceaccount/token
        - -k
        - https://$(KUBERNETES_SERVICE_HOST)
        - -pk
        volumeMounts:
        - name: docker-socket
          mountPath: /host/var/run/docker.sock
        - name: containerd-socket
          mountPath: /run/containerd/containerd.sock
        - name: dev-fs
          mountPath: /host/dev
        - name: proc-fs
          mountPath: /host/proc
          readOnly: true
        - name: boot-fs
          mountPath: /host/boot
          readOnly: true
        - name: lib-modules
          mountPath: /host/lib/modules
          readOnly: true
        - name: usr-fs
          mountPath: /host/usr
          readOnly: true
        - name: etc-fs
          mountPath: /host/etc
          readOnly: true
        env:
        - name: FALCO_BPF_PROBE
          value: ""
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 100m
            memory: 512Mi
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: containerd-socket
        hostPath:
          path: /run/containerd/containerd.sock
      - name: dev-fs
        hostPath:
          path: /dev
      - name: proc-fs
        hostPath:
          path: /proc
      - name: boot-fs
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr-fs
        hostPath:
          path: /usr
      - name: etc-fs
        hostPath:
          path: /etc
      tolerations:
      - operator: Exists
```

Configure Falco rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-rules
  namespace: security
data:
  custom_rules.yaml: |
    - rule: Unauthorized Process in Container
      desc: Detect suspicious process execution
      condition: >
        spawned_process and
        container and
        not proc.name in (allowed_processes)
      output: >
        Unauthorized process started
        (user=%user.name command=%proc.cmdline container=%container.name)
      priority: WARNING

    - rule: Write below root
      desc: Attempt to write to root filesystem
      condition: >
        write and
        fd.name startswith / and
        not fd.name startswith /tmp and
        not fd.name startswith /var
      output: >
        File write below root
        (user=%user.name command=%proc.cmdline file=%fd.name)
      priority: ERROR
```

## Deploying Trivy for Vulnerability Scanning

Trivy scans container images for vulnerabilities:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: trivy-scanner
  namespace: security
spec:
  selector:
    matchLabels:
      app: trivy-scanner
  template:
    metadata:
      labels:
        app: trivy-scanner
    spec:
      serviceAccountName: trivy-scanner
      initContainers:
      - name: download-db
        image: aquasec/trivy:0.47.0
        command:
        - trivy
        - image
        - --download-db-only
        - --cache-dir
        - /var/lib/trivy
        volumeMounts:
        - name: cache
          mountPath: /var/lib/trivy
      containers:
      - name: scanner
        image: aquasec/trivy:0.47.0
        command:
        - sh
        - -c
        - |
          while true; do
            echo "Scanning containers on $(hostname)..."

            # Get running containers
            for container_id in $(crictl ps -q); do
              IMAGE=$(crictl inspect $container_id | jq -r '.info.config.image.image')

              echo "Scanning $IMAGE..."
              trivy image \
                --cache-dir /var/lib/trivy \
                --severity HIGH,CRITICAL \
                --format json \
                --output /scan-results/${container_id}.json \
                $IMAGE
            done

            sleep 3600  # Scan hourly
          done
        volumeMounts:
        - name: cache
          mountPath: /var/lib/trivy
        - name: scan-results
          mountPath: /scan-results
        - name: containerd-socket
          mountPath: /run/containerd/containerd.sock
        env:
        - name: TRIVY_CACHE_DIR
          value: /var/lib/trivy
        resources:
          limits:
            cpu: 1000m
            memory: 2Gi
          requests:
            cpu: 200m
            memory: 512Mi
      volumes:
      - name: cache
        hostPath:
          path: /var/lib/trivy
          type: DirectoryOrCreate
      - name: scan-results
        hostPath:
          path: /var/log/trivy-scans
          type: DirectoryOrCreate
      - name: containerd-socket
        hostPath:
          path: /run/containerd/containerd.sock
      tolerations:
      - operator: Exists
```

## Deploying CIS Benchmark Scanner

Scan nodes against CIS Kubernetes benchmarks:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-bench
  namespace: security
spec:
  selector:
    matchLabels:
      app: kube-bench
  template:
    metadata:
      labels:
        app: kube-bench
    spec:
      hostPID: true
      containers:
      - name: kube-bench
        image: aquasec/kube-bench:latest
        command: ["kube-bench", "run", "--targets", "node", "--json"]
        volumeMounts:
        - name: var-lib-etcd
          mountPath: /var/lib/etcd
          readOnly: true
        - name: var-lib-kubelet
          mountPath: /var/lib/kubelet
          readOnly: true
        - name: var-lib-kube-scheduler
          mountPath: /var/lib/kube-scheduler
          readOnly: true
        - name: var-lib-kube-controller-manager
          mountPath: /var/lib/kube-controller-manager
          readOnly: true
        - name: etc-systemd
          mountPath: /etc/systemd
          readOnly: true
        - name: lib-systemd
          mountPath: /lib/systemd/
          readOnly: true
        - name: etc-kubernetes
          mountPath: /etc/kubernetes
          readOnly: true
        - name: etc-cni-netd
          mountPath: /etc/cni/net.d/
          readOnly: true
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: var-lib-etcd
        hostPath:
          path: /var/lib/etcd
      - name: var-lib-kubelet
        hostPath:
          path: /var/lib/kubelet
      - name: var-lib-kube-scheduler
        hostPath:
          path: /var/lib/kube-scheduler
      - name: var-lib-kube-controller-manager
        hostPath:
          path: /var/lib/kube-controller-manager
      - name: etc-systemd
        hostPath:
          path: /etc/systemd
      - name: lib-systemd
        hostPath:
          path: /lib/systemd
      - name: etc-kubernetes
        hostPath:
          path: /etc/kubernetes
      - name: etc-cni-netd
        hostPath:
          path: /etc/cni/net.d/
      tolerations:
      - operator: Exists
```

## Implementing File Integrity Monitoring

Deploy AIDE for file integrity checks:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aide-fim
  namespace: security
spec:
  selector:
    matchLabels:
      app: aide-fim
  template:
    metadata:
      labels:
        app: aide-fim
    spec:
      hostPID: true
      containers:
      - name: aide
        image: ubuntu:22.04
        command:
        - sh
        - -c
        - |
          apt-get update && apt-get install -y aide

          # Initialize database
          if [ ! -f /host/var/lib/aide/aide.db ]; then
            aideinit
            cp /var/lib/aide/aide.db.new /host/var/lib/aide/aide.db
          fi

          # Run checks hourly
          while true; do
            aide --check
            sleep 3600
          done
        volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: true
        - name: aide-db
          mountPath: /var/lib/aide
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 256Mi
      volumes:
      - name: host-root
        hostPath:
          path: /
      - name: aide-db
        hostPath:
          path: /var/lib/aide
          type: DirectoryOrCreate
```

## Deploying Sysdig for Container Security

Sysdig provides comprehensive container monitoring:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sysdig-agent
  namespace: security
spec:
  selector:
    matchLabels:
      app: sysdig-agent
  template:
    metadata:
      labels:
        app: sysdig-agent
    spec:
      hostNetwork: true
      hostPID: true
      serviceAccountName: sysdig-agent
      containers:
      - name: sysdig-agent
        image: sysdig/agent:latest
        securityContext:
          privileged: true
        env:
        - name: ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: sysdig-agent
              key: access-key
        - name: COLLECTOR
          value: collector.sysdigcloud.com
        - name: COLLECTOR_PORT
          value: "6443"
        - name: TAGS
          value: "env:production,cluster:main"
        volumeMounts:
        - name: docker-sock
          mountPath: /host/var/run/docker.sock
        - name: dev-vol
          mountPath: /host/dev
        - name: proc-vol
          mountPath: /host/proc
          readOnly: true
        - name: boot-vol
          mountPath: /host/boot
          readOnly: true
        - name: modules-vol
          mountPath: /host/lib/modules
        - name: usr-vol
          mountPath: /host/usr
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 200m
            memory: 512Mi
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
      - name: dev-vol
        hostPath:
          path: /dev
      - name: proc-vol
        hostPath:
          path: /proc
      - name: boot-vol
        hostPath:
          path: /boot
      - name: modules-vol
        hostPath:
          path: /lib/modules
      - name: usr-vol
        hostPath:
          path: /usr
      tolerations:
      - operator: Exists
```

## Aggregating Security Findings

Collect scan results centrally:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: security-report-aggregator
  namespace: security
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: report-aggregator
          containers:
          - name: aggregator
            image: security-aggregator:latest
            command:
            - python
            - /app/aggregate.py
            env:
            - name: S3_BUCKET
              value: security-reports
            volumeMounts:
            - name: trivy-results
              mountPath: /trivy-results
          volumes:
          - name: trivy-results
            hostPath:
              path: /var/log/trivy-scans
          restartPolicy: OnFailure
```

## Monitoring Security Events

Create alerts for security findings:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: security-scanning
      rules:
      - alert: CriticalVulnerabilityDetected
        expr: trivy_vulnerability_count{severity="CRITICAL"} > 0
        labels:
          severity: critical
        annotations:
          summary: "Critical vulnerabilities found on {{ $labels.node }}"

      - alert: FalcoSecurityViolation
        expr: rate(falco_events{priority="Critical"}[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Security violation detected: {{ $labels.rule }}"

      - alert: CISBenchmarkFailure
        expr: kube_bench_failed_tests > 10
        labels:
          severity: warning
        annotations:
          summary: "CIS benchmark failures on {{ $labels.node }}"
```

## Best Practices

Run security scans during off-peak hours to minimize performance impact on production workloads.

Implement rate limiting and resource controls to prevent security agents from overwhelming nodes.

Store scan results externally for audit trails and historical analysis.

Configure alerts for critical findings requiring immediate action.

Regularly update scanner databases to detect new vulnerabilities.

Test security agents in staging before production deployment to verify they don't disrupt workloads.

## Conclusion

DaemonSets provide comprehensive security coverage by deploying scanning agents on every node. Whether using Falco for runtime detection, Trivy for vulnerability scanning, or CIS benchmark tools for compliance, the DaemonSet pattern ensures no node escapes security scrutiny. Combined with centralized reporting and alerting, security scanning DaemonSets form a critical layer of cluster defense.

Implement security scanning DaemonSets to maintain continuous visibility into cluster security posture.
