# Customize a Kata Confidential Guest and Recalculate Its Measurements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Security, Linux, Kubernetes

Description: Rebuild a Kata confidential guest reproducibly, preserve its boot integrity chain, and calculate new SNP or TDX reference values before rollout.

---

Adding a certificate, diagnostic binary, or GPU dependency to a Kata confidential guest changes more than a filesystem. It can change the bytes that attestation approves and, for a disk-backed root filesystem, the integrity chain connecting that filesystem to measured boot.

Treat the result as a new guest release. Rebuild from a pinned recipe, calculate the measurements for its actual boot flow, and prove that the new values match verified canary evidence before making them acceptable to production Trustee.

## Inventory the Existing Guest Bundle

Resolve the RuntimeClass handler to its Kata configuration and record the firmware, kernel, initrd, guest disk, and kernel command line actually used. Record CPU model, vCPU count, hypervisor version, and TEE type as well.

Do not confuse the application container image with the guest OS image. The guest contains Kata agent and attestation components; the application is pulled or mounted later. The [Kata OSBuilder documentation](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/README.md) explains the distinction between rootfs directory, disk image, and initrd.

Create an artifact inventory on the trusted build machine:

```bash
sha256sum firmware.fd vmlinuz guest-initrd.img guest-rootfs.img \
  > guest-artifacts.sha256
```

Include only files used by your boot flow. These hashes identify artifacts for provenance and distribution. They are not interchangeable with SNP launch measurements or TDX registers.

## Change the Build Recipe

Start from the exact Kata/CoCo release sources and dependency versions of the known-good guest. Add your change to the reproducible rootfs recipe or overlay, not by modifying a production node's installed image.

Keep the change narrow. A CA certificate may belong in measured Init-Data-supported configuration instead of a guest rebuild, depending on the component and release. A new kernel module must match the guest kernel, not the host kernel. A new binary may require libraries absent from a minimal rootfs.

Preserve the release's Kata agent, AA, and CDH build features and startup configuration. A generic OSBuilder image does not automatically contain the confidential-computing components or policy enforcement your deployment expects.

On the Linux build environment, inspect the packaging scripts supported by the pinned release:

```bash
./tools/osbuilder/initrd-builder/initrd_builder.sh -h
./tools/osbuilder/image-builder/image_builder.sh -h
```

Avoid hand-repacking archives with ad hoc ownership or timestamp changes unless the release recipe explicitly does that. Record tool versions, file modes, package versions, and build inputs so differences between builds can be explained.

## Repack for the Existing Boot Flow

For an initrd-based guest, the documented builder accepts a prepared rootfs and an output path:

```bash
sudo -E ./tools/osbuilder/initrd-builder/initrd_builder.sh \
  -o ./out/guest-initrd.img ./rootfs
```

Prepare `out` first and retain the release's `AGENT_INIT` setting and other build environment. The command packages an already correct confidential rootfs; it does not construct that rootfs for you.

For disk-backed guests, the [image builder](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/image-builder/image_builder.sh) manages filesystem creation and, when `MEASURED_ROOTFS=yes`, verity metadata. Rebuild using the release's filesystem type, layout, and wrapper settings. Preserve the emitted root-hash parameters with the guest artifact bundle.

When a boot flow uses dm-verity and the root filesystem changes, regenerate its verity tree and root hash, then place the new root hash where the boot flow authenticates it. A measured kernel that mounts an unauthenticated mutable disk does not establish the integrity of that disk. CoCo's [OS image trust explanation](https://github.com/confidential-containers/confidentialcontainers.org/blob/main/content/en/blog/2024/building-trust-into-os-images-for-coco.md) describes this transitive chain.

## Calculate SNP Measurements from Exact Inputs

For a supported QEMU direct-boot SNP guest, `sev-snp-measure` calculates a launch measurement from firmware, kernel, initrd, command line, and CPU launch settings. The documented command structure is:

```bash
sev-snp-measure --mode snp \
  --vcpus "$GUEST_VCPUS" \
  --vcpu-type "$GUEST_CPU_TYPE" \
  --ovmf ./firmware.fd \
  --kernel ./vmlinuz \
  --initrd ./out/guest-initrd.img \
  --append "$GUEST_CMDLINE"
```

Set every variable from the resolved launch recipe. Check the [tool's supported CPU and VMM options](https://github.com/virtee/sev-snp-measure) and pin the tool version. Do not use example defaults when your launch uses different VMSA state, firmware variables, guest features, or an SVSM.

A change in vCPU count can change the calculation even when the guest files are identical. A disk-rootfs hash may influence the measurement indirectly through authenticated kernel arguments or initrd content. The calculation must match that full chain.

## Calculate TDX Values for Its Measurement Chain

TDX distinguishes initial TD measurement from runtime measurement register extensions. Determine whether the launch uses TDVF, td-shim, measured event logs, or a cloud-specific vTPM flow. There is no universal `sha384sum guest.img` replacement for this process.

The [CoCo reference-values repository](https://github.com/confidential-containers/reference-values) demonstrates pinned measurement plugins for supported release artifacts. Review its configured target and plugin inputs before adapting it to a custom build. A plugin that measures a kernel does not automatically calculate every reference value your AS policy requires.

Derive expected values from trusted artifacts, then compare with hardware-verified canary evidence and event logs. If they differ, investigate component versions and launch parameters. Do not simply promote the observed registers from an untrusted host into the allowlist.

## Validate and Promote the Bundle

Boot the custom guest with a harmless workload and staging KBS. Verify normal startup, required modules and certificates, restrictive agent policy behavior, image handling, and approved canary secret release. Exercise a changed initrd or invalid root filesystem to ensure integrity enforcement fails as expected.

Save the artifact inventory, build provenance, measurement tool version, launch settings, policy revision, and approved reference values as one release record. Stage that record in Trustee before the production canary, then retire the old reference values after the intended rollback window.

## Conclusion

A custom confidential guest is complete only when its packaging, boot integrity, measurement calculation, and release policy agree. Preserve the existing build flow, derive new expectations from trusted inputs, and validate the entire bundle with a canary before granting it production secrets.

## Official Documentation

- [Kata OSBuilder](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/README.md)
- [Kata initrd builder](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/initrd-builder/initrd_builder.sh)
- [Kata image builder and verity handling](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/image-builder/image_builder.sh)
- [CoCo OS image trust chain](https://github.com/confidential-containers/confidentialcontainers.org/blob/main/content/en/blog/2024/building-trust-into-os-images-for-coco.md)
- [SEV-SNP measurement calculator](https://github.com/virtee/sev-snp-measure)
- [CoCo reference-values tooling](https://github.com/confidential-containers/reference-values)
