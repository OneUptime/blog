# kube-hunter Passive vs Active Hunting: How to Choose a Safe Scan Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Security, DevSecOps

Description: Choose between kube-hunter's default passive hunt and explicitly enabled active tests using evidence, authorization, blast-radius controls, and a safe escalation path.

---

kube-hunter is passive by default. Its official documentation makes a strong behavioral promise: a normal hunt does not change cluster state, whereas active hunting exploits discovered weaknesses to explore further and can perform harmful state-changing operations. The safe choice is therefore not based on curiosity or report completeness. It is based on the environment, the question, and explicit authorization.

## What “Passive” Means Here

Passive is kube-hunter's normal mode: run without `--active`. It still performs network connections and application requests. “Passive” does not mean packet capture only, zero load, or no sensitive data in the result. Current source, for example, connects to known ports and checks endpoints to classify services and weaknesses.

A passive run is usually appropriate when you need to:

- inventory reachable Kubernetes-facing services;
- identify unauthenticated disclosures without attempting exploitation chains;
- establish a production baseline;
- validate network isolation from a defined source;
- decide whether a controlled follow-up is warranted.

Start with explicit targets and JSON output:

~~~bash
kube-hunter \
  --remote 203.0.113.10 \
  --report json \
  --log WARNING \
  > passive.json
~~~

The flags above are present in the current upstream parser. Do not infer that a zero process exit code means zero vulnerabilities; parse the report and review it.

## What Active Mode Adds

`--active` registers active hunters as well as normal hunters. The exact set is version-dependent. Inspect the build you will execute:

~~~bash
kube-hunter --list
kube-hunter --list --active
~~~

Store both listings with the image digest or Git commit. Do not rely on an old blog's list. The current source includes active tests that can attempt writes or commands. For example, the etcd active hunter attempts to add a key through the legacy v2 API, while kubelet active logic tries to prove foothold via accessible container operations. That is materially different from observing an open port.

Active mode is appropriate only when all of these are true:

- the owner explicitly authorizes exploitation-style testing;
- targets are isolated from production data and users;
- the exact active hunter list has been reviewed;
- backups and recovery are proven, not merely configured;
- monitoring, audit collection, and an operator are present;
- stop conditions and cleanup checks are written;
- the source network cannot reach unintended clusters.

If any condition is false, stay passive and reproduce the finding in a lab.

## Use a Decision Ladder

### 1. Define the claim

“Can the internet reach the kubelet?” needs passive reachability and endpoint evidence. “Can an unauthenticated caller execute in a container?” is an exploitation claim and may require an active proof-but not first in production.

### 2. Establish passive evidence

Record target, scanner location, time, tool revision, services, vulnerability IDs, and raw evidence. Confirm the result is repeatable from the same path.

### 3. Inspect implementation

Match the reported `hunter` and VID to the exact source revision and Aqua vulnerability documentation. Read what request it sends and whether it creates, modifies, executes, mounts, or deletes anything.

### 4. Reproduce safely

Build a disposable cluster with representative configuration and synthetic workloads. Use canary data and a dedicated network. Run the same passive command first, then enable only approved active behavior. The parser supports `--custom` hunter names, but obtain valid active hunter names from your build with `--list --active --raw-hunter-names`, and combine `--active` with `--custom` when running an approved active hunter; never invent names from display labels.

### 5. Decide on production confirmation

Often the lab proof plus configuration evidence is enough. If not, narrowly approve a maintenance-window test and observe it. Active mode is not a blanket permission for all discovered targets.

## Bound Both Modes

Use explicit `--remote` hosts or a carefully reviewed CIDR. The parser supports CIDR exclusions prefixed with `!`, but external firewall controls should enforce scope too. Set concurrency and timeout based on lab measurements; current defaults can change and aggressive discovery may create load.

Protect reports. JSON can contain endpoints, evidence, vulnerability descriptions, and hunter names. Redact secrets before tickets or chat. Avoid passing a service account token unless authenticated behavior is the explicit test, and never enable shell tracing around tokens.

## Interpret Results Correctly

The reporter has distinct `services` and `vulnerabilities` arrays. Service discovery says an endpoint was identified at a location. A vulnerability entry says a hunter observed evidence matching its check. Neither alone gives universal exploitability from every network zone.

Likewise, “no vulnerabilities” means this tool revision, mode, scope, and path produced none. It does not prove secure configuration, and passive mode intentionally omits active-only proof. Pair findings with Kubernetes configuration, cloud firewall evidence, audit logs, and a configuration benchmark.

## Record the Decision

Put the chosen mode in the change or assessment record along with who approved it and why it is sufficient for the stated claim. For active approval, attach the exact `--list --active` output and reviewed source paths, not merely the tool name. For passive selection, state which impact claims remain untested. This small record prevents a later reviewer from interpreting a deliberate safety limit as accidental coverage loss-or assuming an old active-test review applies after an image upgrade.

## Conclusion

Choose passive mode by default, including for production baselines and remediation checks. Escalate to active hunting only after reviewing the exact active tests and moving the proof into a disposable lab whenever possible. A smaller, authorized proof with strong cleanup evidence is more defensible than a broad active scan whose side effects are unknown.

## Official References

- [kube-hunter documentation: active hunting and test listing](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter argument parser and supported flags](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter etcd hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [kube-hunter kubelet hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/kubelet.py)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)
