# Validation Summary: How to Set Up IMA for Runtime Integrity on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Integrity Measurement Architecture (IMA)
- IMA appraisal policies
- grubby kernel command-line management
- ima-evm-utils / evmctl
- Linux audit logs

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Extending, customizing, and troubleshooting kernel integrity subsystem": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/extending-customizing-and-troubleshooting-kernel-integrity-subsystem_assembly_managing-kernel-command-line-parameters-with-uki
- Linux kernel ABI documentation for `/sys/kernel/security/*/ima/policy`: https://git.zx2c4.com/linux-dev/tree/Documentation/ABI/testing/ima_policy
- IMA policy syntax documentation: https://ima-doc.readthedocs.io/en/latest/policy-syntax.html
- ima-evm-utils `evmctl(1)` manual: https://manpages.debian.org/testing/ima-evm-utils/evmctl.1.en.html
- IMA and EVM concepts documentation: https://ima-doc.readthedocs.io/en/latest/ima-concepts.html

## Issues Found
- The introduction implied all IMA operation compares files against known-good values. Updated it to distinguish measurement from appraisal, because measurement records hashes while appraisal verifies hashes or signatures.
- The boot parameters combined `ima_policy=tcb` with `ima_appraise=fix`. Changed this to `ima_policy=appraise_tcb` so the fix-mode appraisal setup matches the RHEL 9 documentation.
- The custom policy used `func=FILE_MMAP` for executable mappings. Updated it to `func=MMAP_CHECK`, the current policy function name documented by IMA policy syntax.
- The policy loading command used `sudo cat ... > /sys/...`, where shell redirection would not run under sudo. Replaced it with `sudo tee ... < /etc/ima/ima-policy`.
- The signing-key example generated only a public key file and did not load a verification key into the `.ima` keyring. Updated it to create a DER certificate and load it with `keyctl padd asymmetric`, matching the keyring requirement for IMA signature verification.

## Review Notes
This remains a simplified guide. A production RHEL 9 deployment should follow Red Hat's full guidance for trusted IMA CA/code-signing certificates, Secure Boot behavior, dracut integration for loading `/etc/keys/ima` at boot, and careful appraisal policy testing before enforcement.
