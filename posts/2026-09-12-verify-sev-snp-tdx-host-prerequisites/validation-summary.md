# Validation Summary: Verify SEV-SNP and TDX Hosts Before Installing Confidential Containers

## Status
validated

## Post Type
Technical guide / host-prerequisite checklist

## Technologies Covered
- Confidential Containers (CoCo)
- Kubernetes and RuntimeClass
- AMD SEV-SNP
- Intel TDX and DCAP attestation
- Linux KVM, kernel modules, and device interfaces
- QEMU, libvirt, and containerd

## Sources Consulted
- [Confidential Containers hardware requirements](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/)
- [Confidential Containers SEV-SNP host setup](https://confidentialcontainers.org/docs/getting-started/prerequisites/hardware/snp/)
- [Intel TDX Enabling Guide: Host OS Setup](https://cc-enabling.trustedservices.intel.com/intel-tdx-enabling-guide/05/host_os_setup/)
- [Linux kernel SEV guest API documentation](https://docs.kernel.org/virt/coco/sev-guest.html)
- [Linux kernel KVM SEV documentation](https://docs.kernel.org/virt/kvm/x86/amd-memory-encryption.html)
- [Confidential Containers cluster prerequisites](https://confidentialcontainers.org/docs/getting-started/prerequisites/software/)

## Issues Found
No technical issues found.

## Review Notes
- The commands are diagnostic and correctly treat module parameters as kernel-dependent signals rather than conclusive qualification tests.
- The stated CoCo SEV-SNP baseline (upstream kernel 6.16.1 or later, SEV firmware 1.55 or later, and attestation report version 3 or later) matches the current official guide as reviewed on 2026-09-12.
- The Intel TDX boot parameters and same-platform QGS requirement match the current Intel enabling guide.
- The `rg` commands require ripgrep to be installed; this does not affect their correctness, but operators on minimal host installations may need to install it or use an equivalent `grep` command.
- The post appropriately cautions that distribution backports and vendor support matrices can affect version requirements.
