# Validation Summary: Customize a Kata Confidential Guest and Recalculate Its Measurements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kata Containers and OSBuilder
- Kubernetes RuntimeClass
- AMD SEV-SNP and `sev-snp-measure`
- Intel TDX
- dm-verity
- Trustee, KBS, and attestation reference values

## Sources Consulted
- [Kata Containers OSBuilder documentation at the pinned commit](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/README.md)
- [Kata initrd builder at the pinned commit](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/initrd-builder/initrd_builder.sh)
- [Kata image builder at the pinned commit](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/tools/osbuilder/image-builder/image_builder.sh)
- [Kata Containers Developer Guide](https://github.com/kata-containers/kata-containers/blob/main/docs/Developer-Guide.md)
- [CoCo: Building Trust into OS Images for Confidential Containers](https://github.com/confidential-containers/confidentialcontainers.org/blob/main/content/en/blog/2024/building-trust-into-os-images-for-coco.md)
- [virtee SEV-SNP measurement calculator documentation](https://github.com/virtee/sev-snp-measure)
- [CoCo reference-values tooling](https://github.com/confidential-containers/reference-values)

## Issues Found
- The initrd-builder example used plain `sudo` while telling readers to retain `AGENT_INIT` and other build environment variables. Changed it to `sudo -E`, consistent with Kata's documented build commands, so those variables reach the builder.
- The post described verity handling as a general image-builder behavior and instructed every changed disk rootfs to regenerate verity data. Clarified that the pinned builder generates verity metadata when `MEASURED_ROOTFS=yes`, and that regeneration applies to boot flows using dm-verity.

## Review Notes
- The post pins Kata links to a specific commit, which makes its builder behavior reproducible. Deployments using another release should inspect that release's scripts and options.
- `sev-snp-measure` supports the shown flags. Its result depends on exact launch inputs, including VMM/CPU state and guest features, as the post warns.
- TDX reference values depend on the actual firmware/shim and measurement-extension chain; the post correctly avoids presenting a universal file-hash command.
