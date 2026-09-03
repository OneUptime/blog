# How to Test Network Policies with kube-hunter from Multiple Namespaces and Network Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Network Policies, Network Security

Description: Compare kube-hunter reachability from controlled namespaces and external zones while accounting for CNI enforcement, node traffic, service routing, and scanner identity.

---

A kube-hunter result is a view from one source. Running the same pinned scan from several namespaces and external network zones can reveal isolation gaps, but it is not a complete NetworkPolicy conformance test. kube-hunter probes Kubernetes-related services; NetworkPolicy governs Pod ingress and egress at layers 3 and 4, as implemented by the cluster's network plugin.

Use a matrix of controlled, identical scanners and compare specific expected paths.

## Define the Test Matrix

Choose vantage points that correspond to trust boundaries:

- a namespace with default-deny egress;
- an application namespace with narrowly allowed egress;
- a platform or monitoring namespace;
- a worker-network VM outside the Pod network;
- a peered corporate or security network;
- an external runner, if public exposure is in scope.

For each row, record namespace labels, service account, Pod security context, node, CNI/version, policies, DNS behavior, source IP as seen at the target, and expected reachability. Keep kube-hunter image digest, arguments, targets, timeouts, and active/passive mode identical.

## Confirm Enforcement Before Scanning

Kubernetes states that NetworkPolicy resources do nothing unless the network plugin implements them. Prove enforcement with a simple denied connection first. A namespace-wide egress deny looks like:

~~~yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: scan-denied
spec:
  podSelector: {}
  policyTypes:
  - Egress
~~~

After applying it, a Pod in `scan-denied` should lose ordinary egress according to the plugin's implementation. DNS will also be denied unless explicitly allowed, so test targets by both approved IP and name and document the intended DNS rule. Never interpret DNS failure as proof that the destination itself is blocked.

NetworkPolicy is additive: once a Pod is selected for egress, traffic must be allowed by at least one applicable egress rule. On the destination side, both source egress and destination ingress must allow a Pod-to-Pod connection. Review all selecting policies, not just the manifest created for the test.

## Deploy an Identical Scanner Job

Use a reviewed, digest-pinned image and passive mode. Avoid ClusterRole bindings; explicit remote targets let each Pod test the same endpoints without requiring API enumeration.

~~~yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-hunter-zone-test
  namespace: scan-denied
spec:
  activeDeadlineSeconds: 600
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: kube-hunter-zone-test
    spec:
      automountServiceAccountToken: false
      restartPolicy: Never
      containers:
      - name: scanner
        image: aquasec/kube-hunter@sha256:<approved-digest>
        args:
        - --remote
        - 192.0.2.40
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
~~~

Copy the same Job to each test namespace, changing only `metadata.namespace` and a run identifier. The example intentionally omits `--pod`: that flag also enables Kubernetes API node auto-discovery, whereas the explicit `--remote` target keeps this comparison bounded while the process still uses the Pod's network vantage. Check the chosen image's explicit UID/GID and read-only compatibility in a lab; the current repository Dockerfile does not declare a non-root user. `--log NONE` keeps the Kubernetes log stream as valid JSON, and the lower worker count avoids the parser's high default on a one-target test. Do not add host networking: that changes the vantage point from Pod network to node network and can bypass the boundary you intend to measure.

## Choose Targets That Match the Control

Use an explicit, authorized IP or DNS name. Current kube-hunter `--remote` accepts one or more hosts; `--cidr` is broader and introduces more opportunities for scope mistakes. Run without `--active`.

Kubernetes documents important NetworkPolicy caveats. Traffic to and from the node hosting a Pod is always allowed in the policy model, and handling around Service address translation can differ by plugin and cloud provider. A kubelet on a node IP, an API ClusterIP, a Pod IP, and an external load balancer are different paths. Test and label them separately.

For a policy intended to isolate application Pods, include a synthetic destination Pod and Service in the test, not only node components. kube-hunter can show whether Kubernetes-facing endpoints are discovered, but use a purpose-built connection probe to validate arbitrary application ports and protocol semantics.

## Collect Corroborating Evidence

For every run, retain:

- raw JSON and, for a separately configured diagnostic run, protected scanner logs;
- Job and NetworkPolicy YAML as observed from the API;
- Pod IP, node IP, DNS answers, and target EndpointSlices;
- CNI policy verdicts or flow logs;
- target-side connection logs;
- cloud firewall and route revision for external zones.

Compare services and vulnerabilities separately. If a denied namespace reports no service while an allowed namespace discovers it, that supports a reachability difference. If both discover it, inspect whether the target is the local node, whether `hostNetwork` or a mesh changed the path, and whether the CNI enforces egress.

## Avoid Common False Conclusions

A timeout might be policy, routing, DNS, target health, or return path. A `401`/`403` proves the endpoint is reachable even though application access is denied. Identical findings do not prove identical packets if a proxy terminates both paths. And a default-deny policy in namespace A says nothing about namespace B.

Repeat from at least two nodes when topology matters. Keep tests sequential if connection volume could affect components. Add a total Job deadline and stop on API, kubelet, or CNI instability.

## Clean Up and Turn Results into Gates

Delete the Jobs and synthetic targets; retain policy only if it is intended production configuration. Convert expected outcomes into a matrix, for example: application namespace cannot discover node APIs; platform namespace can reach the API but receives authorization denial; external zone cannot establish TCP.

Re-run the same matrix after CNI upgrades, network-policy changes, node pool changes, or cloud routing changes. A single global “pass” loses the most useful information: which source could reach which endpoint.

## Conclusion

Test isolation by holding the scanner constant and changing one vantage point at a time. Verify that NetworkPolicy is enforced, use explicit passive targets, distinguish Pod, Service, and node paths, and corroborate scan results with CNI and target logs. kube-hunter is valuable reachability evidence, but purpose-built probes and policy inspection remain necessary for full NetworkPolicy validation.

## Official References

- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Declare network policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
- [kube-hunter Pod and remote scanning documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter host discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/hosts.py)
- [kube-hunter parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter Dockerfile](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)
