# Running Groundcover Across EKS, AKS, GKE, and On-Premises Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Kubernetes, Multi-Cloud, eBPF

Description: Plan consistent Groundcover coverage across EKS, AKS, GKE, and on-premises Kubernetes while accounting for node, kernel, and platform constraints.

---

Groundcover supports Amazon EKS, Azure Kubernetes Service, Google Kubernetes Engine, and self-managed Kubernetes, but a multi-cloud rollout is not one identical Helm release repeated everywhere. The sensor is a privileged DaemonSet that depends on Linux kernel capabilities. Managed node modes, admission controls, scheduling rules, networking, and cluster identity therefore determine whether every intended workload is actually observed.

Treat the deployment as a common observability standard with explicit platform overlays. Start with one verified baseline, document each exception, and prove coverage on every cluster class before expanding.

## Establish the portable baseline

Groundcover's current Kubernetes requirements specify Kubernetes 1.21 or later and a privileged DaemonSet. Its separate kernel guide requires Linux 5.3 or later and BTF support so the eBPF sensor can use CO-RE. Groundcover documents both x86 and ARM CPU support.

Those are admission requirements, not a complete readiness test. Inventory each node pool with at least:

- Kubernetes and node operating-system versions
- kernel release and BTF availability
- CPU architecture
- runtime and managed-node mode
- taints, labels, and admission policies
- outbound network path, proxy, and private DNS behavior

The sensor normally runs once on every eligible node. A successful Helm release does not prove full coverage: a DaemonSet can be healthy on five nodes while another pool is excluded by affinity, taints, or platform restrictions. Compare desired, current, ready, and available DaemonSet counts with the eligible-node inventory.

## EKS: distinguish EC2 nodes from Fargate

Groundcover lists EKS as supported, but EKS includes materially different execution models. Standard Linux EC2 node groups can provide the host access needed by a privileged sensor when the cluster's security policies allow it.

AWS documents that Fargate pods cannot run privileged containers and that DaemonSets are not supported on Fargate. A Groundcover sensor DaemonSet therefore cannot cover Fargate-only execution in the same way it covers EC2-backed nodes. Do not treat a green deployment on the EC2 pools as evidence that Fargate workloads have eBPF coverage.

Record each Fargate profile and the namespaces or selectors it captures. If workloads must stay on Fargate, define an alternate telemetry route and document the resulting feature differences. If eBPF coverage is mandatory, place those workloads on a compatible Linux node group after evaluating the operational and security tradeoffs.

EKS estates also commonly combine x86 and Graviton pools. Groundcover supports both architectures, but still test image selection, node affinity, and upgrades on both rather than assuming one pool's result applies to the other.

## AKS: validate every Linux node-pool class

Groundcover lists AKS as supported. Use Linux VM-backed node pools that meet the kernel requirements, and test the actual images and policies in your subscription. Do not infer that every AKS compute option has identical host access merely because the Kubernetes API is the same.

Pay particular attention to:

- system and user node pools with different taints
- Azure Policy or other admission controls that restrict privileged pods
- pools using different Linux images or kernel update channels
- private-cluster DNS, firewall, and proxy rules
- autoscaled pools that may introduce a new image or architecture

Add only the tolerations required to reach intended pools. Broad tolerations can place a privileged sensor on nodes that the security team meant to isolate. Keep exclusions intentional and visible in the coverage report.

## GKE: separate Standard from Autopilot

GKE Standard gives operators control over node pools and can support privileged DaemonSets when cluster policy permits them. Verify Linux kernel compatibility across Container-Optimized OS, Ubuntu, and any mixed node images you operate.

GKE Autopilot restricts privileged workloads. Google documents an allowlist mechanism for approved privileged partner workloads, but an allowlist is workload-specific. Groundcover's general GKE support statement does not by itself establish that a particular Groundcover version, configuration, or Autopilot cluster is approved. Confirm current compatibility with both Groundcover and Google before selecting Autopilot as a covered target.

If approval is not available, do not weaken cluster controls merely to force installation. Mark the cluster class as unsupported by this collection path and choose an alternative telemetry design.

## On-premises: kernel diversity is the main variable

Self-managed clusters can provide the necessary privileges, but their node fleet is often less uniform. Older distributions, custom kernels, missing BTF data, immutable images, and disconnected networks can create partial coverage.

Build a node compatibility report before installation. Canary the sensor on one representative node from every operating-system, kernel, architecture, and runtime combination. A successful test on a recent Ubuntu worker says little about a separate pool using an older enterprise kernel.

For restricted networks, enumerate required endpoints, certificate authorities, proxy settings, image registries, and DNS dependencies. Groundcover also documents on-premises and air-gapped architecture modes; choose the mode that matches the organization's residency and connectivity requirements instead of treating disconnected installation as a Helm-only detail.

## Give every cluster an unambiguous identity

Groundcover's installation configuration uses a cluster identifier and environment grouping. Assign a unique, stable cluster ID to every cluster. Do not derive it from a display name that can collide across accounts or regions.

A practical naming scheme includes provider, account or subscription, region, and lifecycle stage, while labels carry dimensions that may change:

- cluster ID: stable machine identity
- environment: production, staging, or development grouping
- labels: provider, region, business unit, platform owner, and compliance class

Keep identity values in GitOps configuration, not in an operator's shell history. Renaming a cluster should be a reviewed migration because dashboards, alerts, and historical comparisons may depend on its identity.

## Use a baseline plus small overlays

Maintain one reviewed values baseline for shared policy: image pinning, resource requests and limits, data controls, destinations, and standard labels. Add a small EKS, AKS, GKE, or on-premises overlay only where the platform differs. Then add a cluster-specific layer for identity and approved exceptions.

Render every combination in CI and inspect the resulting DaemonSet, permissions, affinity, tolerations, environment variables, and endpoints. Pin a tested Groundcover chart and component version, and promote updates through canary clusters before production.

Groundcover's Fleet Manager can help operators view and manage multiple deployments, but centralized visibility does not replace configuration ownership. Git remains the record of intended state; Fleet Manager and Kubernetes status show observed state.

## Design the network and data boundary

Decide where the Groundcover backend runs and how each monitored cluster reaches it. In Groundcover's BYOC architecture, observability storage remains in customer-controlled infrastructure, while external UI, authentication, and managed-control components still participate. Its high-availability documentation describes logs, traces, and events moving through customer object storage, while metrics travel over the network.

For every cluster-to-backend path, document:

- source and destination networks, regions, and accounts
- private routing or public egress
- encryption and certificate ownership
- firewall and proxy rules
- data-residency implications
- behavior during a network partition

A backend in a central cloud account may keep data within company-controlled infrastructure while still moving it out of the workload VPC, subscription, region, or country. Make the precise boundary claim that the architecture supports.

## Prove coverage with an acceptance matrix

Before declaring the rollout complete, test one cluster for every meaningful combination of provider, compute mode, architecture, kernel family, and network pattern. For each test target, verify:

1. The sensor is scheduled on every intended node.
2. A known application request produces the expected service and trace data.
3. A known log line and Kubernetes event arrive.
4. Node and workload metrics are attributed to the correct cluster.
5. Sensitive test fields are redacted as configured.
6. The system behaves predictably through node replacement and backend interruption.
7. The cluster disappears cleanly from active views after decommissioning.

Record unsupported pools and alternate collection paths beside passing targets. That matrix is more useful than a single statement that all four Kubernetes providers are supported.

## Keep compatibility continuous

Managed Kubernetes providers change node images and security controls over time. Re-run the acceptance suite when upgrading Kubernetes, changing node operating systems, adding an architecture, enabling a stricter admission policy, or changing managed compute modes. Alert when eligible node count diverges from ready sensor count.

Multi-cloud consistency does not mean ignoring platform differences. It means using one declared standard, testing those differences deliberately, and making gaps visible before an incident depends on missing telemetry.

## Official documentation

- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover kernel requirements for the eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover supported CPU architectures](https://docs.groundcover.com/getting-started/requirements/cpu-architectures)
- [Groundcover sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover Kubernetes installation](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Groundcover Fleet Manager](https://docs.groundcover.com/use-groundcover/fleet-manager)
- [Amazon EKS Fargate considerations](https://docs.aws.amazon.com/eks/latest/userguide/fargate.html)
- [GKE Autopilot privileged workloads](https://cloud.google.com/kubernetes-engine/docs/concepts/about-autopilot-privileged-workloads)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
