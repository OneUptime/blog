# How to Deploy Grafana Beyla as a Kubernetes DaemonSet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, DaemonSet, Auto-Instrumentation, OpenTelemetry, Observability

Description: Deploy one Grafana Beyla instance per Kubernetes node, discover selected workloads, add Kubernetes metadata, and export telemetry without changing application code.

---

A DaemonSet is Grafana Beyla's preferred deployment when one agent should discover and instrument multiple services on each Kubernetes node. The Beyla Pod joins the host PID namespace, loads eBPF programs into the node kernel, observes selected application processes, decorates telemetry with Kubernetes metadata, and exports it to an OpenTelemetry endpoint.

Cluster-wide does not have to mean "instrument everything." Start with narrow namespace, Deployment, label, executable, or port selectors. A broad selector increases overhead and can instrument observability components themselves, while dynamic URL paths can create expensive cardinality unless route decoration is configured.

## Check the platform assumptions

Beyla needs Linux and elevated kernel access. A DaemonSet needs `hostPID: true` so its process discovery can see workloads outside its own Pod. Grafana's simplest manual example uses `privileged: true`; the project also documents a capability-based deployment for environments that prohibit privileged containers.

Before rollout, confirm:

- worker nodes run a kernel supported by the selected Beyla release;
- Pod Security admission permits the required host access in the Beyla namespace;
- the container can reach an OTLP receiver such as Grafana Alloy;
- the receiver accepts the chosen OTLP protocol; and
- node pools and taints are covered intentionally.

Use an immutable Beyla version or image digest in production. The `latest` tag below follows the official quickstart shape, but it makes rollouts non-reproducible.

## Grant read-only Kubernetes API access for discovery and metadata

Beyla does not need write access to Kubernetes objects for Kubernetes-based discovery or metadata decoration. Create a dedicated account with the list/watch permissions in Grafana's manual deployment guide:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: beyla
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: beyla
  namespace: beyla
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: beyla-metadata
rules:
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "services", "nodes"]
    verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: beyla-metadata
subjects:
  - kind: ServiceAccount
    name: beyla
    namespace: beyla
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: beyla-metadata
```

If neither Kubernetes metadata decoration nor Kubernetes-based discovery selectors are needed, disable the decorator, use non-Kubernetes selectors such as `open_ports` or `exe_path`, and omit this API access. Do not silently grant broad default cluster roles.

## Select workloads and control routes

Store the Beyla configuration in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: beyla-config
  namespace: beyla
data:
  beyla-config.yml: |
    attributes:
      kubernetes:
        enable: true
    routes:
      unmatched: heuristic
    discovery:
      instrument:
        - k8s_namespace: shop
          k8s_deployment_name: checkout
```

Selectors in the same instrument entry are combined, so the example targets the `checkout` Deployment in the `shop` namespace. Add separate list entries for alternatives. Validate selector names against the documentation for the deployed Beyla version; service discovery has evolved, and a configuration copied from an Alloy `beyla.ebpf` component uses different syntax.

`routes.unmatched: heuristic` asks Beyla to group unrecognized URL paths into lower-cardinality route forms. For known APIs, explicit route patterns provide a more stable contract. Do this before sending production traffic, not after a cardinality incident.

## Deploy one Beyla Pod per node

This baseline mirrors Grafana's documented privileged DaemonSet approach and exports over OTLP/HTTP to an Alloy Service on port `4318`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: beyla
  namespace: beyla
spec:
  selector:
    matchLabels:
      app: beyla
  template:
    metadata:
      labels:
        app: beyla
    spec:
      serviceAccountName: beyla
      hostPID: true
      nodeSelector:
        kubernetes.io/os: linux
      containers:
        - name: beyla
          image: grafana/beyla:latest
          imagePullPolicy: IfNotPresent
          securityContext:
            privileged: true
            readOnlyRootFilesystem: true
          env:
            - name: BEYLA_CONFIG_PATH
              value: /config/beyla-config.yml
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: http://grafana-alloy.monitoring:4318
          volumeMounts:
            - name: config
              mountPath: /config
              readOnly: true
            - name: runtime
              mountPath: /var/run/beyla
      volumes:
        - name: config
          configMap:
            name: beyla-config
        - name: runtime
          emptyDir: {}
```

YAML structure is significant. Confirm that `serviceAccountName`, `hostPID`, `nodeSelector`, containers, and volumes are all under `spec.template.spec`, and include `kubectl apply --dry-run=server -f beyla.yaml` in review.

For the unauthenticated in-cluster OTLP endpoint shown, no secret is needed. For a managed endpoint, put authorization headers in a Kubernetes Secret and reference it with `valueFrom`; never put API keys in the ConfigMap. Beyla infers OTLP/HTTP (`http/protobuf`) for ports ending in `4318` and OTLP/gRPC (`grpc`) for ports ending in `4317`. For other ports, set `OTEL_EXPORTER_OTLP_PROTOCOL` or the corresponding signal-specific protocol variable explicitly.

`hostNetwork: true` is not required merely to discover application processes. Grafana documents it for features that must see host network packets, including particular distributed trace-context propagation and network-flow scenarios. Add it only when the enabled feature requires it, then use `dnsPolicy: ClusterFirstWithHostNet` and review the larger network exposure.

## Roll out narrowly and verify each layer

Apply to a test node pool first with a `nodeSelector` or node affinity. Then inspect:

```bash
kubectl -n beyla get daemonset,pods -o wide
kubectl -n beyla logs daemonset/beyla --all-pods=true --tail=200
kubectl auth can-i --as=system:serviceaccount:beyla:beyla list pods --all-namespaces
```

Generate real HTTP or gRPC requests against the selected service. Temporarily set `BEYLA_TRACE_PRINTER=text` or the equivalent YAML option to prove Beyla produces trace records locally, then remove verbose printing. Verify Alloy receives spans, the backend receives them from Alloy, and the trace resources contain `k8s.namespace.name`, Pod, Deployment, and node attributes.

If there is no telemetry, work in order:

1. Does the Beyla Pod run on the same node as a matching target?
2. Does service discovery log the target process?
3. In a capability-based deployment, are required-capability, AppArmor, seccomp, or `perf_event_paranoid` denials present?
4. Does local trace printing show requests?
5. Can the Pod resolve and connect to the OTLP endpoint?
6. Does the collector exporter report sent or failed spans?

Metrics appearing does not prove traces are exported; the signals can follow separate paths.

## Harden after proving functionality

Privileged mode is convenient for the first controlled deployment but grants much more access than most production policies allow. Grafana documents a non-privileged root container with a configuration-dependent set of Linux capabilities such as `BPF`, `PERFMON`, `SYS_PTRACE`, `DAC_READ_SEARCH`, and `CHECKPOINT_RESTORE`; network and library-level features add others. Kernels earlier than 5.11 may also require `SYS_RESOURCE` for locked memory.

Move to that documented least-privilege profile for the exact enabled features, enforce capability checks with `BEYLA_ENFORCE_SYS_CAPS=1`, and validate on every node image. Keep RBAC read-only and, when Beyla uses the Pod network and the cluster CNI enforces NetworkPolicy, restrict Beyla egress to the OTLP collector plus required DNS and Kubernetes API endpoints. If `hostNetwork` is enabled, use a CNI or host-firewall mechanism with documented support for host-network traffic. Set resource requests/limits from measured load, and monitor the agent's own errors and resource use.

## Official Documentation

- [Beyla Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Deploy Beyla manually in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Deploy Beyla with its Helm chart](https://grafana.com/docs/beyla/latest/setup/kubernetes-helm/)
- [Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Beyla telemetry export](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Kubernetes DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Conclusion

Deploy Beyla as a DaemonSet when one agent per node should cover selected Kubernetes services. Grant list/watch metadata RBAC, enable `hostPID`, start with a narrow discovery rule and controlled route cardinality, and prove trace generation separately from export. Once the pipeline works, pin the image and reduce the privileged security context to the capabilities required by the exact Beyla features you use.
