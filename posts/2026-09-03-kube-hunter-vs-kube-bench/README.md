# kube-hunter vs kube-bench: Combine Attack-Surface and CIS Audits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, CIS, Security, DevSecOps

Description: Combine kube-hunter's network attacker perspectives with kube-bench's CIS-aligned configuration checks while keeping scope, evidence, and remediation ownership distinct.

---

kube-hunter and kube-bench answer different questions. kube-hunter discovers reachable Kubernetes services and hunts for weaknesses from a chosen network vantage. kube-bench checks whether Kubernetes is deployed according to security practices defined in the applicable CIS Kubernetes Benchmark. Neither result can substitute for the other.

Used together, they connect configuration intent to observable attack surface.

## Understand the Difference

| Dimension | kube-hunter | kube-bench |
| --- | --- | --- |
| Primary question | What Kubernetes-facing services and weaknesses can this source observe? | Does local cluster configuration satisfy selected benchmark checks? |
| Perspective | Remote host, host interfaces, CIDR, or in-cluster Pod | Node/control-plane files, processes, and provider-specific inputs available to the run |
| Default safety | Normal hunting is non-state-changing; active mode is explicit and potentially harmful | Reads configuration/state to evaluate checks; deployment still needs privileged/local access appropriate to target |
| Identity | VID, service location, hunter, evidence | Benchmark section and control ID with PASS/FAIL/WARN/INFO results |
| Blind spot | Cannot prove every local configuration or unreachable control | Cannot prove a port is reachable from an attacker zone |

The exact tests depend on tool version, Kubernetes distribution, and benchmark selection. Pin both images by digest and archive their test/config metadata.

## Design a Joint Coverage Matrix

Run kube-hunter from representative zones:

- internet or external security runner;
- corporate or peered network;
- ordinary application namespace;
- privileged platform network, if relevant.

Run kube-bench where it can inspect the intended components. Aqua's documentation notes that managed services limit access to control-plane nodes and provides platform guidance and provider-specific Job files. Do not interpret inaccessible managed-control-plane checks as PASS.

Map every run to cluster ID, node pool, Kubernetes version, provider, and UTC time. A kube-hunter location is often an IP; enrich it from inventory so it can join to the kube-bench node or component record.

## Run kube-hunter Passively

Use exact targets and JSON output:

~~~bash
kube-hunter \
  --remote 192.0.2.40 \
  --report json \
  --log WARNING \
  > kube-hunter.json
~~~

Remain passive in routine assessment. The official kube-hunter documentation warns that `--active` tests may change cluster state. Validate top-level `services` and `vulnerabilities` separately and record target coverage.

## Run the Applicable kube-bench Profile

The current kube-bench CLI documents JSON output and target selection. A self-managed cluster example is:

~~~bash
kube-bench run \
  --targets master,node,etcd,policies \
  --json \
  --outputfile kube-bench.json
~~~

Use only targets supported by the pinned build and appropriate to the node. Current terminology may preserve `master` for a benchmark target even when Kubernetes documentation says control plane. Never force a generic profile over EKS, AKS, GKE, OpenShift, or another distribution without consulting kube-bench's official platform guidance.

kube-bench often needs host namespaces or mounts to inspect component configuration. Use the upstream deployment model, review its privileges, run on dedicated maintenance nodes if possible, and delete the Job afterward. Do not grant privileges to kube-hunter simply because kube-bench needs local inspection.

## Correlate Without Collapsing

Create relationships, not one blended score. Examples:

- kube-bench reports unsafe kubelet anonymous-auth configuration, and kube-hunter observes anonymous `/pods` access from an application namespace: configuration and exposure corroborate each other.
- kube-bench flags a kubelet setting, but external kube-hunter cannot reach `10250`: the configuration risk remains; the firewall is a compensating boundary, not a fix.
- kube-bench passes a local authorization check, but kube-hunter discovers a public API proxy: investigate the proxy, load balancer, or different component outside kube-bench's inspected files.
- kube-hunter finds no vulnerability, but kube-bench fails etcd client certificate authentication: remediate the configuration even if current routing hides it.

Keep original control IDs, VIDs, scanner vantage, evidence, and tool revisions. A many-to-many mapping is normal; do not invent a one-to-one correspondence.

## Prioritize Remediation

Prioritize findings that have both an unsafe configuration and confirmed reachability from an untrusted zone. Next address high-impact configuration failures that could become exposed after ordinary network drift. Separately remediate public or cross-tenant attack surface even when authentication currently blocks it.

Assign owners by control plane, node template, network, or workload policy. Twenty repeated node findings from one image template should form one remediation epic with every affected node retained as evidence.

Exceptions must be tool-specific. An accepted kube-bench WARN should not suppress a kube-hunter VID, and a network exception should not convert a failed CIS control into PASS.

## Validate Both Sides

After a configuration change, rerun kube-bench on a canary and then every affected pool. After a network or authentication change, rerun kube-hunter from the original untrusted vantage plus an approved path. Verify that scanner coverage remained complete.

Track four outcomes: configuration fixed, exposure removed, legitimate operations healthy, and regression controls installed. A firewall-only fix can remove exposure while leaving dangerous node drift; a config-only fix can leave an unnecessary public endpoint. The strongest remediation closes both.

## Conclusion

kube-hunter measures observable attack surface from a network position; kube-bench evaluates benchmark-aligned configuration available on cluster components. Pin and run them independently, correlate through durable asset identity, and preserve their distinct evidence. Joint findings sharpen priority, while disagreements expose blind spots worth investigating.

## Official References

- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter report schema](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [Aqua Security kube-bench](https://github.com/aquasecurity/kube-bench)
- [kube-bench flags and commands](https://github.com/aquasecurity/kube-bench/blob/main/docs/flags-and-commands.md)
- [kube-bench platform documentation](https://github.com/aquasecurity/kube-bench/blob/main/docs/platforms.md)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)
