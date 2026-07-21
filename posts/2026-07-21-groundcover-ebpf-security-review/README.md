# Groundcover Security: eBPF Privileges, Host Access, and Payloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, eBPF, Kubernetes Security, Observability

Description: Review Groundcover's privileged eBPF sensor, node-level visibility, payload collection, network paths, and user access before production rollout.

---

A Groundcover security review should start with three facts from its current documentation. The sensor runs as a DaemonSet on monitored nodes. Loading its eBPF program requires a privileged container. Its eBPF traces can contain full request and response payloads, while general payload obfuscation is disabled by default.

Those facts do not make the product inherently unsafe, but they create a high-trust observability component. Review it like a node agent and a sensitive data system, not like an ordinary namespace application.

## Understand what privileged means

Groundcover lists privileged DaemonSet containers as a Kubernetes installation requirement. Kubernetes documents that a privileged container receives all Linux capabilities and overrides several kernel protections. Privileged containers run without the normal seccomp constraint and can ignore AppArmor and SELinux restrictions that would apply to a regular container.

The Linux eBPF verifier protects the kernel from invalid eBPF programs. It does not reduce the authority of a compromised privileged userspace container. Your threat model must include the sensor image, its update mechanism, runtime process, service account, mounted paths, network reachability, and access to the node.

Do not infer the exact runtime access from the word `privileged` alone. Render and inspect the chart version you will deploy:

```bash
helm template groundcover groundcover/groundcover \
  --namespace groundcover \
  -f values.yaml > rendered-groundcover.yaml

kubectl get daemonset -n groundcover -o yaml
kubectl auth can-i --list \
  --as=system:serviceaccount:groundcover:actual-service-account-name
```

Review `securityContext`, host namespaces, host networking, capabilities, volume mounts, host paths, service-account tokens, and RBAC rules. Repeat the review on upgrades because a chart change can change the security boundary.

## Separate install authority from runtime authority

Groundcover's requirements list permission to create StatefulSets, Deployments, DaemonSets, ConfigMaps, Secrets, and persistent volume claims. Those installation permissions belong to the installer or deployment controller. They do not necessarily describe what each running pod needs.

Use a short-lived installation identity or a tightly scoped GitOps controller. Then audit runtime service accounts independently. Avoid leaving a broad cluster-admin credential in a CI system simply because installation needed to create cluster-scoped objects.

Inventory:

- every ClusterRole and Role
- every binding and service account
- secret read permissions
- access to nodes, pods, logs, and Kubernetes metadata
- admission exceptions for privileged workloads
- remote-management or fleet-management identities

Kubernetes RBAC guidance warns that the ability to create privileged pods can lead to node access. Limit who can change the Groundcover namespace, DaemonSet, service accounts, and admission policy.

## Treat the sensor namespace as privileged infrastructure

The Baseline and Restricted Kubernetes Pod Security Standards disallow privileged containers. If the sensor requires an exception, scope it to a dedicated namespace rather than weakening policy cluster-wide.

Useful controls include:

- restrict write access to the namespace
- apply admission rules to approved image repositories and identities
- pin or verify image digests through your supply-chain policy
- scan images and track software versions
- prevent application teams from creating workloads under the privileged service account
- apply explicit network policies where they are compatible with required flows
- isolate backend databases on dedicated nodes or in a dedicated cluster
- monitor changes to DaemonSets, Roles, bindings, Secrets, and network policy

Groundcover's own deployment documentation says the sensor can be governed with Kubernetes resource limits and network policies. Verify the needed destinations before enforcing default-deny rules.

## Review node and traffic visibility

Groundcover's APM documentation says the sensor observes traffic on monitored nodes, classifies protocols, reconstructs transactions, and enriches them with Kubernetes context. That visibility is the reason the product can generate application metrics and traces without code changes. It is also a sensitive collection boundary.

Ask:

- Which nodes are eligible for the DaemonSet?
- Which protocols are enabled?
- Can traffic from restricted namespaces be excluded?
- Which encrypted protocols can be observed, and through what mechanism?
- Which host files or sockets are mounted into the sensor?
- What happens on an unsupported kernel or failed sensor?
- Are control-plane, Fargate, or other unscheduled nodes visible?

Groundcover supports filtering Kubernetes entities and disabling tracing for selected protocols. Use exclusions for workloads whose data cannot be collected under policy, and test that excluded data is absent from traces, logs, metrics labels, and searches.

## Assume trace payloads are sensitive

The Groundcover trace documentation describes eBPF traces as including headers, query parameters, and request and response bodies. Its sensitive-data page states that payload obfuscation is disabled by default, although a documented list of sensitive HTTP and gRPC headers is obfuscated by default.

Header protection is not complete payload protection. Credentials and personal data can appear in:

- URL paths and query strings
- JSON, form, and gRPC bodies
- SQL statements and database responses
- Redis, MongoDB, and AMQP messages
- custom headers outside the default list
- logs and trace attributes

Configure protocol-specific key-value or unstructured obfuscation before production traffic. Prefer allowlisting the fields you need over attempting to enumerate every secret key. Test nested objects, arrays, plain text, malformed content, and truncated data using representative synthetic records.

Keep payload size limits conservative. Increasing them expands both data exposure and processing cost. If a protocol cannot be made safe, disable its tracing or exclude the workload.

## Map every network path

Deployment mode changes the path:

- In BYOC, sensors and backend data stores run in your environment, while the frontend, authentication, and managed control plane are accessed externally.
- In on-premises mode, the backend and frontend run in your environment, with external authentication documented as the remaining external dependency.
- In air-gapped mode, Groundcover documents no external-cloud component.

Groundcover's Kubernetes requirements also document outbound HTTPS from a `portal` pod to `app.groundcover.com`. Its FAQ says it collects anonymized deployment telemetry that can be opted out, including component performance metrics and component logs. These management and telemetry paths must be included in the data-flow review even when observability records remain in your environment.

Record source, destination, port, authentication, data category, storage location, and retention for each flow. Confirm DNS, proxy, firewall, private endpoint, and certificate requirements with the deployed mode and current vendor documentation.

## Restrict human and API access

Logs and traces can reveal payloads even when the backend stays in your account. Groundcover documents Enterprise RBAC policies that combine permission level with data scopes such as cluster, environment, and namespace. The default Admin, Editor, and Viewer policies have full data scope. Multiple policies merge in a way that can broaden both permission and scope.

Build least-privilege custom policies, integrate SSO where available, and review effective access rather than individual policy names. Apply the same review to service accounts and API keys. Separate the ability to query sensitive data from the ability to change collection, retention, and obfuscation settings.

## Produce a security decision record

Before rollout, capture:

- exact chart and image versions
- rendered privilege, host access, and RBAC inventory
- deployment mode and network-flow diagram
- protocols and namespaces collected or excluded
- payload and log-redaction configuration
- data-store encryption, backup, retention, and deletion controls
- user and service-account access model
- upgrade, vulnerability, incident, and support procedures
- evidence from a non-production validation

The central tradeoff is clear: kernel-level, payload-aware observability provides deep visibility by granting a sensor significant trust. Make that trust narrow, observable, versioned, and supported by data minimization.

## Official documentation

- [Groundcover kernel requirements](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover APM architecture](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm)
- [Groundcover sensitive data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover role-based access control](https://docs.groundcover.com/use-groundcover/role-based-access-control-rbac)
- [Groundcover deployment architecture](https://docs.groundcover.com/architecture/overview)
- [Kubernetes privileged container guidance](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
