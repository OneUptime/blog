# How to Reproduce a kube-hunter Finding Safely in an Isolated Kubernetes Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Testing, Security

Description: Reproduce kube-hunter evidence in a disposable kind cluster with synthetic data, a pinned toolchain, isolated networking, staged configuration, and explicit cleanup.

---

Reproduction should answer why a hunter produced its evidence without exposing real workloads or mutating production. Build a disposable cluster, match only the configuration relevant to the finding, use synthetic Pods and credentials, reproduce passively first, and review every active code path before considering it.

## Define the Hypothesis

Translate the report into one testable statement, such as:

- a Pod in namespace A can reach node port `10250`;
- an unauthenticated request to `/pods` returns data;
- etcd accepts a client without a trusted certificate;
- the API authorizes `system:anonymous` for a resource path.

Record the original VID, hunter, evidence, scanner vantage, target type, Kubernetes and node versions, network plugin, and kube-hunter revision. Do not clone customer data, Secrets, service-account tokens, certificates, or production etcd snapshots into the lab.

## Create an Isolated Cluster

`kind` is maintained by Kubernetes SIGs and runs Kubernetes nodes as containers. Pin the kind binary, node image digest, and kube-hunter digest through your supply-chain process. The placeholders below are not executable until approved digests are substituted.

~~~yaml
# kind.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: kube-hunter-lab
nodes:
- role: control-plane
- role: worker
networking:
  apiServerAddress: "127.0.0.1"
  apiServerPort: 16443
~~~

Binding the API to loopback avoids publishing it on all host interfaces.

~~~bash
kind create cluster \
  --name kube-hunter-lab \
  --image 'kindest/node@sha256:<approved-digest>' \
  --config kind.yaml

kubectl --context kind-kube-hunter-lab get nodes -o wide
~~~

Run this on an isolated disposable VM, not a shared developer laptop with sensitive networks. Apply a host firewall that prevents the lab network from reaching production, metadata services, corporate ranges, and the internet except approved image/artifact endpoints. Egress controls matter because a scanner given a mistaken CIDR should still be unable to escape.

## Add Synthetic Workloads

Use an unprivileged canary with no secrets:

~~~yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: canary
  template:
    metadata:
      labels:
        app: canary
    spec:
      automountServiceAccountToken: false
      containers:
      - name: canary
        image: registry.k8s.io/pause:3.10.1
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          runAsNonRoot: true
          seccompProfile:
            type: RuntimeDefault
~~~

Pin the canary image digest in a real test. Do not add privileged Pods, host mounts, or realistic secrets unless they are essential to the hypothesis and separately approved.

## Establish the Safe Baseline

Run the same passive kube-hunter revision used for the original finding. A scanner container can join kind's Docker network so it observes node-container addresses without publishing them externally:

~~~bash
CONTROL_PLANE=$(kind get nodes \
  --name kube-hunter-lab | head -n 1)
TARGET_IP=$(docker inspect \
  -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' \
  "$CONTROL_PLANE")

docker run --rm \
  --network kind \
  'aquasec/kube-hunter@sha256:<approved-digest>' \
  --remote "$TARGET_IP" \
  --report json \
  > baseline.json
~~~

Verify that `TARGET_IP` belongs to the lab before execution. Keep `--active` absent. Capture node configuration and network state with the baseline.

## Introduce One Controlled Difference

Change only the setting tied to the hypothesis through kind/kubeadm's supported configuration mechanisms for the pinned version. For example, compare anonymous kubelet authentication off versus on, Webhook versus unsafe authorization, or a firewall deny versus allow. Kubernetes component configuration APIs and kind patch mechanisms are version-sensitive; validate the exact field against the release documentation.

Make a snapshot of all manifests and commands. If reproducing an insecure state, ensure the VM's firewall prevents any untrusted source reaching it. Never attach the lab to a production peering or reuse production certificates.

Rerun the identical passive command and compare `services` and `vulnerabilities` separately. The expected result is a controlled transition attributable to the single change.

## Review Before Active Proof

Often passive evidence plus server configuration is enough. If active proof is genuinely required, run:

~~~bash
kube-hunter --list --active
kube-hunter --list --active --raw-hunter-names
~~~

Read the selected hunter source. Current active hunters can write etcd keys, attempt container commands, and read tokens or environment variables. Use only synthetic targets, external network allowlists, a total deadline, audit logging, and approved `--custom` class names printed by the pinned build. Include any passive hunter that publishes an event required by the selected active hunter; current custom registration retains core discovery classes but does not resolve that dependency automatically. Inspect cleanup independently after interruption as well as success.

## Tear Down and Prove It

Export sanitized evidence, then delete the entire cluster:

~~~bash
kind delete cluster --name kube-hunter-lab
kind get clusters
~~~

Verify the lab name is absent, remove the disposable VM through its owning workflow, revoke temporary identities, and delete sensitive raw artifacts after retention. Record tool digests, hypothesis, one changed control, before/after results, and cleanup evidence in the remediation ticket.

## Define a Successful Reproduction

A success is not merely “a VID appeared.” Require the safe baseline to lack the finding, the single controlled change to make it appear, and reversal of that change to remove it again. Corroborate the scanner with component logs or configuration at each stage. If only an unrelated service row changes, or the result cannot be reversed, classify the experiment as inconclusive and inspect version or topology differences. This three-step control helps distinguish a real causal mechanism from transient discovery timing.

## Conclusion

A good lab reproduction changes one relevant control and keeps everything else pinned. Isolate routes, use synthetic workloads, reproduce passively, inspect exact hunter source, and destroy the environment afterward. That produces stronger exploitability evidence than an uncontrolled active test against production.

## Official References

- [kube-hunter scanning and active hunting documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter parser and custom hunter selection](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter custom registration and event dependencies](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/event_handler.py)
- [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [kind configuration](https://kind.sigs.k8s.io/docs/user/configuration/)
- [Kubernetes component configuration APIs](https://kubernetes.io/docs/reference/config-api/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
