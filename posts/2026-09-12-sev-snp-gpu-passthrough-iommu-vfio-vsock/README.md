# Debug GPU Passthrough to SNP Pods: IOMMU, VFIO, and vsock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, AMD SEV-SNP, GPU, Kata Containers, Troubleshooting

Description: Trace SEV-SNP GPU passthrough failures through supported hardware, IOMMU groups, VFIO ownership, runtime configuration, and guest startup.

---

A confidential GPU pod can fail with a generic vsock timeout even when the real problem is a PCI device the guest could not initialize. It can also fail before the GPU matters at all. Diagnose the layers in order: supported platform, device ownership, Kubernetes allocation, guest launch, and GPU attestation.

This runbook targets the NVIDIA Confidential Containers reference architecture on AMD SEV-SNP. It is not a recipe for making an arbitrary PCI GPU confidential simply by passing it through to an encrypted VM.

## Confirm the Supported Combination

Record the CPU generation, GPU model, firmware, host kernel, Kata build, GPU Operator version, guest driver, and Trustee version. Compare the whole combination with NVIDIA's [supported-platform matrix](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/supported-platforms.html), not just whether the GPU appears in `lspci`.

A CPU TEE does not automatically protect GPU memory or the CPU-to-GPU data path. The GPU must support the relevant confidential mode, and the deployment must enforce its attestation requirements. Keep CPU and GPU trust decisions separate until the attestation flow binds them.

For an initial test, use a supported single-GPU node and NVIDIA's matching sample workload. Multi-GPU deployments have additional all-device assignment and topology requirements. Hopper Protected PCIe and Blackwell multi-GPU modes are different configurations, not interchangeable labels.

## Check IOMMU and PCI Ownership

On the worker, locate the GPU and its active driver:

```bash
lspci -nn | rg -i 'nvidia|vga|3d'
GPU_BDF=0000:41:00.0
lspci -nnk -s "$GPU_BDF"
readlink -f "/sys/bus/pci/devices/$GPU_BDF/iommu_group"
readlink -f "/sys/bus/pci/devices/$GPU_BDF/driver"
```

Replace the example PCI address with the observed device. Confirm that an IOMMU group exists and inspect its member devices. Linux [VFIO documentation](https://docs.kernel.org/driver-api/vfio.html) explains why the group, not merely one PCI function, is the relevant isolation unit.

NVIDIA's [prerequisites](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/prerequisites.html) require virtualization, ACS, and IOMMU support. On AMD, follow the supported distribution's IOMMU configuration, including `amd_iommu=on` when needed. A bootloader edit requires the distribution's update procedure and a reboot before the effective kernel command line changes.

Do not use no-IOMMU VFIO mode or an ACS override as a generic solution to an isolation failure. If the required group contains unrelated devices, resolve the supported platform configuration and topology.

In this NVIDIA architecture, host-installed NVIDIA drivers must not retain ownership of passthrough GPUs. The operator's VFIO Manager handles the host-side binding. Do not manually unbind a live device while its workload is running; first identify and safely stop or reschedule the owning workload through the operator's workflow.

## Verify Operator Readiness and Resource Allocation

Inspect the operands and runtime classes:

```bash
kubectl get pods -n gpu-operator -o wide
kubectl get pods -n kata-system -o wide
kubectl get runtimeclass
kubectl describe node "$NODE_NAME"
```

Set `NODE_NAME` to the target worker. Look for the expected SNP GPU runtime, commonly `kata-qemu-nvidia-gpu-snp`, and advertised passthrough resources. The current examples use `nvidia.com/pgpu`, which differs from the conventional `nvidia.com/gpu` resource.

For a supported node with exactly one GPU, the relevant workload fragment is:

```yaml
spec:
  runtimeClassName: kata-qemu-nvidia-gpu-snp
  containers:
    - name: gpu-test
      resources:
        limits:
          nvidia.com/pgpu: "1"
```

Use this within the release's complete sample manifest and honor its scheduling requirements. For a multi-GPU node, follow the documented topology and request all required GPUs and switches; copying a one-GPU limit is not sufficient.

Inspect `nvidia.com/cc.mode`, `nvidia.com/cc.mode.state`, and readiness labels. These are operator state indicators, not cryptographic proof. NVIDIA's [troubleshooting guide](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/troubleshooting.html) describes transitions blocked by active GPU workloads. Correlate CC Manager and VFIO Manager logs before repeatedly resetting a device.

## Locate the Failure Behind a vsock Timeout

A timeout connecting to the Kata agent means the shim did not establish its guest RPC connection in time. It does not specifically mean that the host's vsock module is missing.

Build a short timeline from the worker's containerd journal and a secret-free diagnostic guest:

```bash
sudo journalctl -u containerd --since '15 minutes ago' \
  --output=short-iso --no-pager
sudo journalctl -k --since '15 minutes ago' --no-pager
```

First establish whether QEMU started. Then check firmware and kernel boot, PCI enumeration, device assignment errors, guest driver initialization, and Kata agent startup. If the guest never reached its agent, increasing an RPC timeout does not fix the boot failure.

Compare against a CPU-only confidential canary on the same node. If that also fails, investigate the SNP base stack before the GPU path. If it succeeds, use a supported standalone confidential GPU VM or the reference sample to isolate device attachment and guest-driver compatibility.

Do not replay a copied QEMU command blindly: Kata prepares sockets, devices, memory settings, and lifecycle state around that process. Compare resolved launch inputs and follow the vendor's standalone validation procedure.

## Separate Slow Pulls from Device Failures

Large GPU images can spend substantial time in guest pull and unpack. NVIDIA documents kubelet timeout settings, while Kata has a separate image-pull timeout. Check actual progress and guest capacity before increasing either. A killed guest or failed VFIO assignment will not recover because a deadline is longer.

Finally, prove the confidential GPU path through attestation. Trustee's [composite evidence architecture](https://confidentialcontainers.org/docs/attestation/architecture/) binds device evidence to primary evidence and represents devices separately in the appraisal. Require the expected CPU and GPU results before releasing model keys. Successful CUDA output or a node label is not a substitute.

## Conclusion

Debug SNP GPU passthrough from the platform outward: verify supported hardware, IOMMU isolation, VFIO ownership, resource allocation, and guest startup before interpreting vsock errors. Complete the check with CPU-and-GPU attestation so operational success also satisfies the confidential workload's trust requirements.

## Official Documentation

- [NVIDIA supported platforms](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/supported-platforms.html)
- [NVIDIA prerequisites](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/prerequisites.html)
- [Linux VFIO documentation](https://docs.kernel.org/driver-api/vfio.html)
- [CoCo NVIDIA GPU workload examples](https://confidentialcontainers.org/docs/examples/nvidia-gpu-examples/)
- [NVIDIA troubleshooting](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/troubleshooting.html)
- [Trustee composite evidence architecture](https://confidentialcontainers.org/docs/attestation/architecture/)
