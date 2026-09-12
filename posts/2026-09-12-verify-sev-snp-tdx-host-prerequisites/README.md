# Verify SEV-SNP and TDX Hosts Before Installing Confidential Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kubernetes, AMD, Intel, Security

Description: Check firmware, host kernel support, confidential VM launch, and attestation prerequisites before deploying CoCo onto AMD SEV-SNP or Intel TDX nodes.

---

Installing Confidential Containers does not enable confidential computing in a machine's firmware or host kernel. Prepare and test the host before involving Kubernetes; otherwise an unsupported platform looks like a runtime installation failure.

The strongest prerequisite check is a successful confidential VM launch followed by real hardware evidence generation. CPU flags, device files, and a running installer are supporting signals. This checklist applies to bare-metal workers. Managed confidential VMs and peer-pod integrations have a provider-controlled infrastructure boundary instead. [CoCo hardware requirements](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/)

## Record the Platform You Actually Booted

Collect a small inventory on each candidate worker:

```bash
uname -r
lscpu
cat /proc/cmdline
sudo dmidecode -t bios
ls -l /dev/kvm
sudo journalctl -k -b --no-pager | rg -i 'sev|snp|tdx|kvm|firmware'
```

Keep BIOS version, CPU model, kernel package, and boot parameters together. A node can have a newer kernel package installed while still running the older kernel. A firmware setting can be configured but not active until the required reboot or power cycle.

Verify the server manufacturer's support matrix for the exact CPU and motherboard. A product family name is insufficient when confidential computing support varies by SKU or BIOS release. On a virtualized worker, ordinary nested virtualization support does not establish support for launching nested SNP or TDX guests. Use the deployment model documented by the provider.

## Check AMD SEV-SNP Requirements

The current CoCo SNP host guide calls for a host kernel at least upstream `6.16.1` and SEV firmware at least `1.55`, providing attestation report version 3 or newer. Treat these as the CoCo guide's stated baseline, not a claim that every earlier distribution kernel lacks all SNP functionality. Vendor backports need explicit support confirmation. [CoCo SEV-SNP host setup](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/snp/)

Verify the OEM's BIOS settings for AMD virtualization and SEV-SNP, then inspect the loaded KVM AMD module:

```bash
# Diagnostic reads on the host; parameter availability varies by kernel.
for name in sev sev_es sev_snp; do
  path="/sys/module/kvm_amd/parameters/$name"
  if test -r "$path"; then
    printf '%s=' "$name"
    cat "$path"
  else
    printf '%s: parameter not present\n' "$name"
  fi
done
ls -l /dev/sev /dev/kvm
```

A missing parameter is a reason to inspect the loaded kernel and its configuration, not to manufacture a sysfs file. An enabled parameter still does not prove a guest can launch with the required firmware, memory configuration, and userspace stack.

Keep host and guest devices separate. `/dev/sev` belongs to the host's SEV management interface. The SNP guest requests reports through its guest interface, commonly `/dev/sev-guest`. Looking for that guest device on a bare-metal host is the wrong acceptance test. [Linux SEV guest API](https://docs.kernel.org/virt/coco/sev-guest.html)

## Check Intel TDX Enablement

Use Intel's enabling guide for a supported combination of BIOS, TDX module, kernel/KVM, QEMU, and libvirt. At the time of this review, its host instructions include `kvm_intel.tdx=1` and `nohibernate`, with distribution-specific bootloader procedures. Apply those through the documented distribution workflow and verify the next boot. [Intel TDX host setup](https://cc-enabling.trustedservices.intel.com/intel-tdx-enabling-guide/05/host_os_setup/)

Inspect the current state:

```bash
cat /proc/cmdline
sudo dmesg | rg -i 'tdx'
if test -r /sys/module/kvm_intel/parameters/tdx; then
  cat /sys/module/kvm_intel/parameters/tdx
fi
```

Intel documents the kernel message `tdx: TDX module initialized` as a useful enablement signal. Investigate initialization errors before launching Kubernetes workloads. A normal VM using VT-x proves conventional virtualization, which is a smaller requirement than creating a trust domain.

Quote generation also needs attention. In the Intel DCAP architecture, a TD report becomes a quote through the TD Quoting Enclave and Quote Generation Service. QGS runs on the same physical platform as the TD, possibly within a dedicated VM. An unrelated remote server cannot substitute for that local quote-generation role.

## Test the VM and Attestation Paths Separately

Use the vendor's supported confidential VM example with the exact firmware and hypervisor versions intended for the worker. Record the command or libvirt definition and the guest boot result. Avoid inventing a universal QEMU command because SNP and TDX launch interfaces vary across supported releases.

Inside the test guest, run the documented evidence or quote sample for that platform. Verify that it returns real hardware evidence of the expected type. A development attester or non-confidential CoCo runtime can return a response without providing hardware confidentiality.

Then check verifier access to endorsement material. Successful guest boot and report generation do not prove that a remote verifier can retrieve certificates, collateral, and revocation information. Capture DNS, TLS, proxy, and egress requirements from both the quoting service and verifier environments.

This produces three independent results: confidential VM launch, evidence generation, and verification. Record which one failed instead of collapsing them into a single “SNP works” or “TDX works” label.

## Admit Only Prepared Workers

Before installing the CoCo runtime, check the cluster prerequisites, including the supported container runtime and the node labels used by the installer. The current cluster guide specifies containerd 1.7 or newer and at least one worker with `node.kubernetes.io/worker`. Review all requirements for your chosen deployment. [CoCo cluster setup](https://confidentialcontainers.org/docs/getting-started/prerequisites/software/)

Keep a per-node qualification record containing firmware, host kernel, VM artifacts, quote-generation result, and verification result. Requalify a worker after firmware or kernel changes. Those updates can alter capabilities and measurements even when Kubernetes reports the node as Ready.

## Conclusion

Qualify the hardware before debugging the CoCo installer. Match the platform support matrix, verify the running firmware and kernel, launch a confidential VM, generate hardware evidence, and validate it remotely. Only then expose the worker to confidential workloads through the intended RuntimeClass.

## Official Documentation

- [CoCo hardware requirements](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/)
- [CoCo SEV-SNP setup](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/snp/)
- [Intel TDX host enabling guide](https://cc-enabling.trustedservices.intel.com/intel-tdx-enabling-guide/05/host_os_setup/)
- [Linux SEV guest API](https://docs.kernel.org/virt/coco/sev-guest.html)
- [CoCo cluster prerequisites](https://confidentialcontainers.org/docs/getting-started/prerequisites/software/)
