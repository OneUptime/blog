# How to Run CIS Benchmarks Against Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CIS Benchmark, Security, Kubernetes, Compliance

Description: A practical guide to running CIS benchmarks against Talos Linux clusters to verify compliance and identify security hardening opportunities.

---

Running CIS (Center for Internet Security) benchmarks against your Kubernetes infrastructure is one of the most straightforward ways to validate that your cluster meets industry-recognized security standards. Talos Linux, being a purpose-built operating system for Kubernetes, already ships with many CIS recommendations baked in by default. But you still need to verify this, and running benchmarks gives you that verification along with a clear picture of what can be improved.

In this guide, we will walk through the process of running CIS benchmarks against a Talos Linux cluster, interpreting the results, and understanding which checks are relevant to the Talos security model.

## What Are CIS Benchmarks?

CIS benchmarks are a set of best-practice security configuration guidelines developed by the Center for Internet Security. For Kubernetes, there are two main benchmark documents you should know about:

- **CIS Kubernetes Benchmark** - covers the Kubernetes components themselves (API server, etcd, scheduler, controller manager, kubelet)
- **CIS Linux Benchmark** - covers the underlying operating system

Talos Linux is interesting because it eliminates many of the OS-level concerns by design. There is no shell, no SSH, no package manager, and the filesystem is read-only. This means a significant portion of the CIS Linux benchmark checks simply do not apply.

## Installing kube-bench

The most common tool for running CIS Kubernetes benchmarks is kube-bench, maintained by Aqua Security. You can run it as a Kubernetes Job directly on your Talos cluster.

First, create a Job manifest for running kube-bench against the control plane nodes:

```yaml
# kube-bench-control-plane.yaml
# Run CIS benchmarks against Talos control plane nodes
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-master
  namespace: default
spec:
  template:
    spec:
      hostPID: true
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command: ["kube-bench", "run", "--targets", "master"]
          volumeMounts:
            - name: var-lib-etcd
              mountPath: /var/lib/etcd
              readOnly: true
            - name: etc-kubernetes
              mountPath: /etc/kubernetes
              readOnly: true
      volumes:
        - name: var-lib-etcd
          hostPath:
            path: /var/lib/etcd
        - name: etc-kubernetes
          hostPath:
            path: /etc/kubernetes
      restartPolicy: Never
  backoffLimit: 0
```

Apply and check the results:

```bash
# Apply the kube-bench job
kubectl apply -f kube-bench-control-plane.yaml

# Wait for it to complete
kubectl wait --for=condition=complete job/kube-bench-master --timeout=120s

# View the benchmark results
kubectl logs job/kube-bench-master
```

For worker nodes, create a similar job:

```yaml
# kube-bench-worker.yaml
# Run CIS benchmarks against Talos worker nodes
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-worker
  namespace: default
spec:
  template:
    spec:
      hostPID: true
      nodeSelector:
        node-role.kubernetes.io/worker: ""
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command: ["kube-bench", "run", "--targets", "node"]
      restartPolicy: Never
  backoffLimit: 0
```

## Understanding the Results on Talos

When you run kube-bench on Talos Linux, you will see something quite different from what you get on a traditional Linux distribution. Many checks will show as "PASS" right out of the box. Here is a breakdown of what to expect.

**Checks that typically pass by default on Talos:**

- API server authentication and authorization settings
- etcd encryption and access controls
- Kubelet authentication and authorization
- File permission checks for Kubernetes configuration files
- Network policy support (when using a CNI that supports it)

**Checks that may show as "WARN" or "INFO":**

Some checks reference files or paths that do not exist on Talos because the system does not use traditional configuration files in the same locations. For example, kube-bench might look for `/etc/kubernetes/manifests` but Talos manages static pods differently through its machine configuration.

```bash
# You can filter results to see only failures and warnings
kubectl logs job/kube-bench-master | grep -E "^\[FAIL\]|^\[WARN\]"
```

## Using the Talos-Specific kube-bench Configuration

Talos provides a custom kube-bench configuration that accounts for its unique architecture. You can use this to get more accurate results:

```yaml
# kube-bench-talos.yaml
# Run kube-bench with Talos-specific configuration
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-talos
  namespace: default
spec:
  template:
    spec:
      hostPID: true
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command:
            - kube-bench
            - run
            - --targets
            - master,node
            - --benchmark
            - cis-1.8
          volumeMounts:
            - name: var-lib-etcd
              mountPath: /var/lib/etcd
              readOnly: true
      volumes:
        - name: var-lib-etcd
          hostPath:
            path: /var/lib/etcd
      restartPolicy: Never
  backoffLimit: 0
```

## Running Benchmarks with talosctl

You can also gather security-relevant information directly through the Talos API using talosctl. While this is not a formal CIS benchmark, it helps verify specific security properties:

```bash
# Check the security configuration of a Talos node
talosctl get securitystate --nodes <node-ip>

# Verify kernel parameters related to security
talosctl read /proc/sys/kernel/kptr_restrict --nodes <node-ip>

# Check that unnecessary services are not running
talosctl services --nodes <node-ip>

# Verify the machine configuration integrity
talosctl get machineconfig --nodes <node-ip> -o yaml
```

## Automating CIS Benchmark Checks

For ongoing compliance, you will want to run these benchmarks regularly. A CronJob works well for this purpose:

```yaml
# kube-bench-cronjob.yaml
# Run CIS benchmarks on a weekly schedule
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench-weekly
  namespace: monitoring
spec:
  schedule: "0 2 * * 0"  # Every Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          containers:
            - name: kube-bench
              image: aquasec/kube-bench:latest
              command:
                - kube-bench
                - run
                - --targets
                - master,node
                - --json
              # You can add a sidecar to ship results to your logging system
          restartPolicy: Never
      backoffLimit: 0
```

To ship the results to a central location, you can pipe the JSON output to your logging stack or store it in an S3 bucket for audit purposes:

```bash
# Parse kube-bench JSON output for specific failures
kubectl logs job/kube-bench-talos -c kube-bench | \
  jq '.Controls[].Tests[].Results[] | select(.status == "FAIL")'
```

## Addressing Common Findings

Even on Talos Linux, there are a few benchmarks that might require action on your part:

1. **Pod Security Standards** - CIS recommends enforcing pod security policies. On modern Kubernetes with Talos, use Pod Security Admission:

```yaml
# Enable Pod Security Admission in namespace labels
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

2. **Network Policies** - CIS recommends having network policies in place. This depends on your CNI choice, not on Talos itself:

```yaml
# Default deny all ingress traffic in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

3. **Audit Logging** - Make sure Kubernetes audit logging is enabled in your Talos machine configuration.

## Comparing Results Across Distributions

One of the more convincing exercises is running kube-bench against a Talos cluster and a traditional distribution side by side. In most comparisons, Talos will pass significantly more checks with zero manual configuration because security hardening is part of the base operating system rather than something you bolt on afterward.

The key areas where Talos excels are filesystem permissions, service minimization, and kernel hardening. Traditional distributions require extensive work with tools like Ansible or Chef to achieve similar results, and even then, configuration drift can erode your security posture over time.

## Conclusion

Running CIS benchmarks against Talos Linux is a validation exercise as much as it is a hardening exercise. Because Talos ships secure by default, you will find that most of the heavy lifting is already done. The benchmarks help you confirm this and catch any application-level or Kubernetes-level settings that still need attention. Make it a regular part of your compliance workflow, and you will have a strong foundation for passing security audits.
