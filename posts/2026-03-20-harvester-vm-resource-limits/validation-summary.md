# Validation Summary: How to Configure VM Resource Limits in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- VirtualMachine CRDs
- CPU Manager and CPU pinning
- HugePages
- ResourceQuota

## Sources Consulted
- Harvester CPU Pinning: https://docs.harvesterhci.io/v1.7/vm/cpu-pinning/
- Harvester Resource Overcommit: https://docs.harvesterhci.io/v1.7/vm/resource-overcommit/
- Harvester Settings (`additional-guest-memory-overhead-ratio`): https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Resource Quotas: https://docs.harvesterhci.io/v1.7/rancher/resource-quota/
- Harvester CPU and Memory Hotplug: https://docs.harvesterhci.io/v1.7/vm/cpu-memory-hotplug/
- KubeVirt Resources requests and limits: https://kubevirt.io/user-guide/compute/resources_requests_and_limits/
- KubeVirt Dedicated CPU resources: https://kubevirt.io/user-guide/compute/dedicated_cpu_resources/
- KubeVirt NUMA: https://kubevirt.io/user-guide/compute/numa/
- KubeVirt API Reference: https://kubevirt.io/api-reference/v1.5.1/definitions.html
- Kubernetes Manage HugePages: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- Kubernetes CPU management policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The basic CPU example defined `8` cores, `1` socket, and `2` threads, which equals `16` vCPUs, while the surrounding comments and resource values described an `8`-vCPU VM. I corrected the topology and the related comments.
- The original examples treated raw Kubernetes `requests` and `limits` as the primary Harvester VM inputs. Harvester documents VM configuration in terms of guest memory and VM resource limits, with scheduler requests derived from those values and the overcommit settings. I updated the text and YAML examples to match that model.
- The CPU pinning example included `numa.guestMappingPassthrough` without the hugepage and feature-gate prerequisites required by KubeVirt NUMA. I removed that invalid NUMA snippet from the CPU pinning example.
- The CPU pinning prerequisite instructions pointed readers to `/var/lib/kubelet/config.yaml` and implied CPU Manager is usually set at cluster creation time. Current Harvester documentation describes CPU Manager as a per-node feature enabled from the Harvester UI, so I replaced that guidance.
- The hugepage verification and configuration commands were incorrect. The JSONPath example did not produce valid JSON for `jq`, and `vm.nr_hugepages` was not the right way to configure the `1Gi` hugepages shown in the example. I replaced them with node inspection and kernel boot parameter guidance aligned with Kubernetes documentation.
- The UI instructions claimed Harvester exposes NUMA options in the Advanced section. Current Harvester docs document CPU pinning there, not NUMA, so I narrowed the wording.
- The resize example patched only `cpu.cores` from `8` to `16` while the original topology still had `threads: 2`, which would have produced `32` vCPUs. I fixed the patch to set a consistent `16`-vCPU topology and corrected `kubectl wait` syntax to `--for=delete`.
- I added two version-sensitive clarifications: Harvester memory quotas must account for VM overhead memory, and CPU/memory changes do not always require a shutdown when CPU and memory hotplug is enabled.

## Review Notes
- The review was performed against current upstream documentation available on 2026-04-30. Harvester v1.7 is the current documented release line referenced in the validation.
- Harvester adds VM overhead memory when translating VM configuration into pod limits. That overhead affects quota sizing and node capacity planning even when the configured guest memory looks exact.
- The post now avoids presenting NUMA passthrough as a drop-in toggle. In KubeVirt, NUMA passthrough has stricter prerequisites than CPU pinning alone.
