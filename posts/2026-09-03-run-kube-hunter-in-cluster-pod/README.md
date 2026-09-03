# How to Run kube-hunter as an In-Cluster Pod for an Attacker’s-Eye View

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Security, Network Security

Description: Run kube-hunter as a tightly controlled Kubernetes Job to measure what a compromised ordinary Pod could discover and reach inside a cluster.

---

An in-cluster kube-hunter run answers a specific question: “What can a process in this Pod's security and network context discover?” The upstream project says Pod deployment can reveal what an attacker could see after compromising an application Pod. That does not mean every Pod has the same view. Namespace policies, service account mounting, CNI behavior, node placement, and service-mesh rules can all change the answer.

## Use a Disposable Namespace

Create a dedicated namespace and label it for the Kubernetes Pod Security Standards `restricted` profile. Admission behavior depends on cluster configuration, but the labels make the intended boundary explicit.

~~~bash
kubectl create namespace kube-hunter-scan
kubectl label namespace kube-hunter-scan \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
~~~

Do not grant kube-hunter a ClusterRole merely to make discovery easier. A realistic “compromised ordinary workload” baseline should have no Kubernetes API permissions and no automatically mounted service account token unless the workload being modeled has one.

## Review, Pin, and Adapt the Upstream Job

The repository's `job.yaml` currently runs `aquasec/kube-hunter:0.6.8` with `--pod`. Copy the manifest into change control, then pin an image digest that your registry and vulnerability policy have approved. The following hardened example preserves `--pod` but deliberately avoids privileges and token mounting:

~~~yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-hunter
  namespace: kube-hunter-scan
spec:
  ttlSecondsAfterFinished: 900
  activeDeadlineSeconds: 600
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: kube-hunter
    spec:
      automountServiceAccountToken: false
      restartPolicy: Never
      containers:
      - name: kube-hunter
        image: aquasec/kube-hunter@sha256:<approved-digest>
        args:
        - --pod
        - --report
        - json
        - --log
        - NONE
        - --num-worker-threads
        - "50"
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 65532
          runAsGroup: 65532
          seccompProfile:
            type: RuntimeDefault
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
~~~

The repository Dockerfile does not declare a non-root `USER`, so `runAsNonRoot: true` alone is not sufficient for that build. The example supplies an explicit numeric UID and GID; confirm that the selected digest can run as those IDs and with a read-only root filesystem before the production window. If it cannot, rebuild from reviewed source with a non-root user or document the smallest exception; do not jump to privileged mode, host networking, host PID, or host filesystem mounts. The lower worker count is a conservative starting point for one Job because the current parser warns that its much larger default can crash some environments; measure and tune it in a lab.

Apply the manifest from your reviewed file, not directly from a mutable remote URL:

~~~bash
kubectl apply -f kube-hunter-job.yaml
kubectl -n kube-hunter-scan wait \
  --for=condition=complete job/kube-hunter --timeout=10m
kubectl -n kube-hunter-scan logs job/kube-hunter > kube-hunter.json
~~~

Kubernetes presents a container's standard output and error through its log stream. Because kube-hunter normally writes operational logs to standard error and its report to standard output, `kubectl logs` can combine both. The example uses `--log NONE` so the captured stream is one JSON document. For a diagnostic rerun, retain logs separately in a protected writable volume rather than mixing them into the report.

The upstream Job uses `--pod`; current parser source says this mode automatically enables Kubernetes node auto-discovery and uses in-cluster configuration by default. Turning token mounting off therefore makes API-based node enumeration unavailable. That is intentional for a tokenless baseline; kube-hunter can still observe whatever its network discovery can reach. If you specifically want to model a real application's service account, use a purpose-built account with the same effective permissions-not a cluster-admin token-and treat the report as sensitive.

## Control Active Behavior

Do not add `--active` during the initial run. kube-hunter distinguishes normal hunting, which its documentation says does not change cluster state, from active hunting, which attempts exploitation and may be harmful. If active testing is required, use an isolated non-production cluster, enumerate the active hunters first with `--list --active`, obtain explicit approval, and observe cluster audit events.

Also set a maintenance window and stop conditions for passive runs. Port and subnet discovery still creates connection load. The parser exposes `--network-timeout` and `--num-worker-threads`; use only values tested in a lab, and do not assume lowering either makes active behavior safe.

## Test More Than One Workload Boundary

A single namespace gives one vantage point. Repeat the same reviewed Job in representative namespaces or network zones, keeping the Pod security context constant. Capture:

- namespace labels and effective NetworkPolicies;
- node and availability zone selected for the Pod;
- CNI and network-policy engine versions;
- whether a service account token was mounted;
- service mesh sidecar or ambient-mode involvement;
- exact image digest and arguments.

Kubernetes documents that NetworkPolicy enforcement requires a supporting network plugin. A manifest existing in the API is not proof of enforcement. It also notes that traffic to and from a Pod's node has special behavior. Interpret differences using packet flow and policy evidence, not just scan row counts.

## Clean Up and Verify

After capturing logs, delete the namespace and confirm all resources are gone:

~~~bash
kubectl delete namespace kube-hunter-scan
kubectl get namespace kube-hunter-scan
~~~

The second command should eventually return `NotFound`. Ensure external log sinks and CI artifacts have appropriate access and retention because findings can include internal endpoints and evidence.

## Compare Against the Modeled Application

Before reporting a gap, compare the scanner Pod with the real application: `automountServiceAccountToken`, labels selected by policy, sidecars, DNS policy, node placement, and service account. A hardened tokenless Job may have less access than the workload it represents; a scanner namespace exempted from policy may have more. Document every intentional difference and repeat with a purpose-built service account only when its permission is part of the threat model. This makes “attacker's-eye” a reproducible identity and network context rather than a vague label.

## Conclusion

Run kube-hunter as an ordinary, constrained Job when you want an ordinary Pod's attacker view. Keep the token, RBAC, security context, namespace, and network path faithful to the workload being modeled. Passive-first execution across several representative zones produces far more useful evidence than one privileged scanner with universal reach.

## Official References

- [kube-hunter deployment documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [Upstream kube-hunter Job manifest](https://github.com/aquasecurity/kube-hunter/blob/main/job.yaml)
- [Upstream kube-hunter Dockerfile](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)
- [kube-hunter command-line parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes service accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
