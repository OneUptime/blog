# Can Groundcover Monitor VMs and Standalone Hosts Outside Kubernetes?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Linux, Virtual Machines, Host Monitoring

Description: Understand Groundcover's Linux host support, deployment requirements, available telemetry, security model, and limits outside Kubernetes.

---

Yes. Groundcover documents a Linux host integration for virtual machines and standalone servers outside Kubernetes. It can collect host metrics and selected application and log telemetry using an eBPF-enabled Linux agent. The current integration is available for BYOC and on-premises Groundcover deployments, not as a universal replacement for every server-monitoring agent.

The important questions are which hosts meet the prerequisites, which data sources the integration covers, and how those hosts reach the Groundcover backend. Test those points against a representative machine before treating VM coverage as equivalent to Kubernetes coverage.

## What the Linux integration covers

Groundcover's Linux host guide lists host CPU, memory, and disk metrics. It also documents collection from Docker workloads, including logs and traces, plus configurable JournalD and static-file log sources.

This creates a useful path for services that sit beside a Kubernetes estate:

- applications still running on cloud VMs
- Docker hosts that are not orchestrated by Kubernetes
- legacy Linux servers
- gateway, proxy, or middleware machines
- on-premises hosts connected to a customer-managed Groundcover backend

The integration can associate cloud metadata for hosts on AWS, Google Cloud, Azure, and Linode. Verify the discovered identity in your own environment, especially when instances use custom metadata proxies, multiple network interfaces, cloned images, or nonstandard hostnames.

## Do not assume Kubernetes feature parity

A standalone Linux host is not a Kubernetes cluster. It does not have Kubernetes deployments, pods, controllers, cluster events, or kube-state metadata. Host metrics and process or container telemetry may look familiar in the interface, but they do not create the orchestration context that a Kubernetes sensor and watcher provide.

Write down the signals required for each workload:

- infrastructure health: CPU, memory, disk, and host availability
- application behavior: supported protocol traces and service relationships
- application logs: Docker, JournalD, or selected files
- platform state: service-manager events, package state, or cloud-instance status
- business signals: custom metrics and structured application events

The Linux integration covers only part of that list. Fill remaining gaps with supported OpenTelemetry, Prometheus, cloud-provider, or log-ingestion paths rather than assuming the eBPF agent observes every important state.

## Check the host prerequisites

The host must be Linux with an eBPF-capable kernel. Groundcover's kernel guide currently requires Linux 5.3 or later and BTF support so its sensor can use CO-RE. The Linux host guide lists AMD64 and ARM64 support.

Inventory the real fleet rather than its intended base image. Long-lived VMs often contain older kernels, custom hardening, or boot-time settings that differ from the current image pipeline. Record:

- distribution and version
- kernel release and BTF availability
- CPU architecture
- virtualization type
- Docker presence and version, if used
- service manager and log locations
- endpoint, DNS, proxy, and certificate path to the backend

Canary each distinct combination. A successful installation on a new Ubuntu AMD64 VM does not validate an older enterprise distribution or an ARM host.

## Understand the privilege boundary

Groundcover installs the Linux collector as a system service with the privileges needed for eBPF and host observation. That access is powerful. Treat the package and its configuration as security-sensitive infrastructure.

Before deployment:

1. Review the installer and package source provided for your environment.
2. Confirm which capabilities, filesystem paths, sockets, and host namespaces the service uses.
3. Restrict who can retrieve the ingestion key and change service configuration.
4. Pin an approved version and verify its artifact provenance.
5. Define how upgrades and rollback work through your configuration-management system.
6. Apply Groundcover's payload and log-redaction controls before production traffic is observed.

Do not paste a long-lived ingestion key into a shared script, ticket, or image. Deliver it through the organization's secret-management mechanism, limit access to the rendered service configuration, and rotate it when exposure is suspected.

## Plan backend connectivity

The current host integration is documented for BYOC and on-premises deployments. The installer needs the appropriate ingestion key and endpoint for that backend. A host being monitored does not need to be in the same VPC as the backend, but it must have a secure, reliable route to it.

For each network zone, document:

- backend hostname and resolved addresses
- port and transport security
- proxy requirements and exclusions
- private routing, peering, or controlled egress
- trusted certificate-authority chain
- firewall ownership and change process
- buffering or loss behavior during disconnection

Test from the actual service context, not only from an administrator's interactive shell. Proxy variables, DNS search paths, and certificate stores can differ between them.

If hosts span accounts, clouds, or data centers, decide whether they all send to one backend or to regional deployments. That decision affects latency, failure domains, data residency, egress cost, and key scope.

## Configure only the data you intend to collect

Host monitoring can expose sensitive data even when host metrics look harmless. Docker logs may include access tokens. JournalD may contain authentication records. Static files may contain customer identifiers. Traces can include headers, query parameters, and request or response bodies for supported protocols.

Start with a narrow allowlist:

- select only required JournalD units
- name specific static log paths
- exclude noisy or sensitive Docker workloads
- enable protocol payload capture only after reviewing obfuscation
- set retention according to the data class

Groundcover provides payload-obfuscation controls for supported protocols and log-pipeline transformations for redaction or dropping. Apply those controls before storage, then use synthetic secrets and personal-data canaries to prove the raw values do not appear in search results.

Reducing a payload-size limit can lower exposure and volume, but truncation is not redaction. A secret at the beginning of a request can still be captured. Prefer preventing collection or replacing sensitive fields.

## Roll out through normal host management

Avoid one-off SSH installation across a fleet. Model the integration as a managed host package:

- declare repositories, package versions, configuration, and service state
- retrieve keys at deployment time
- expose health through the existing host-management platform
- stage upgrades by operating-system and kernel cohort
- remove credentials and configuration during decommissioning

Use the service unit name generated by the supported installer when checking status and logs. Include those commands in the runbook only after verifying them on the installed package, since names and packaging can change.

A good rollout moves from a nonproduction canary to one representative host per cohort, then to a limited production group. Halt promotion if kernel errors, CPU or memory overhead, network volume, or missing telemetry exceeds the agreed threshold.

## Validate end to end

For every supported cohort, run a known test and preserve the evidence:

1. Generate controlled CPU, memory, and disk activity and confirm host metrics.
2. Send a request through a supported Dockerized application and locate its trace.
3. Emit a unique, nonsensitive Docker log line.
4. Emit a unique entry from an approved JournalD unit or static file.
5. Confirm the host's environment and cloud metadata are correct.
6. Insert a synthetic sensitive value and prove the configured redaction removes it.
7. Interrupt backend connectivity briefly and record recovery behavior.
8. Stop or uninstall the service and verify that monitoring alerts as expected.

Measure resource and network overhead during representative load, not only at idle. Linux fleets with very different traffic rates may require different limits or rollout batches.

## Know when to use another collector

The Groundcover host integration is a strong fit when Linux, eBPF, Docker or supported host logs, and a BYOC or on-premises backend match the requirement. Use another supported telemetry path when the target is Windows, the kernel cannot meet the sensor prerequisites, privileged host access is prohibited, or the required signal is outside the documented integration.

The goal is not to force every machine through one collector. It is to give each workload complete, secure, and testable coverage while preserving a coherent view in the observability platform.

## Official documentation

- [Connect Linux hosts to Groundcover](https://docs.groundcover.com/getting-started/installation-and-updating/connect-linux-hosts)
- [Groundcover kernel requirements for the eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover sensitive-data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover log-pipeline obfuscation](https://docs.groundcover.com/use-groundcover/data-pipelines/log-pipelines/obfuscate-logs)
- [Groundcover custom logs collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover tracing payload size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
