# Validation Summary: How to Set Up Integrity Measurement Architecture (IMA) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux Integrity Measurement Architecture (IMA)
- Extended Verification Module (EVM)
- GRUB kernel command-line parameters with `grubby`
- `ima-evm-utils` and `evmctl`
- Linux extended attributes

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Enhancing security with the kernel integrity subsystem, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/enhancing-security-with-the-kernel-integrity-subsystem_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 10 documentation: Extending, customizing, and troubleshooting kernel integrity subsystem, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/extending-customizing-and-troubleshooting-kernel-integrity-subsystem
- Linux kernel command-line parameter documentation, https://docs.kernel.org/admin-guide/kernel-parameters.html
- IMA documentation: IMA Policy, https://ima-doc.readthedocs.io/en/latest/ima-policy.html
- IMA documentation: IMA Configuration, https://ima-doc.readthedocs.io/en/latest/ima-configuration.html
- `evmctl(1)` manual from ima-evm-utils, https://manpages.debian.org/testing/ima-evm-utils/evmctl.1.en.html

## Issues Found
- The post used `ima_policy=tcb ima_appraise=fix` for appraisal. `tcb` is a measurement policy, while RHEL documentation uses `ima_policy=appraise_tcb` with `ima_appraise=fix` for the built-in appraisal policy. Updated the boot parameter example and explanation.
- RHEL guidance says to enable EVM together with IMA appraisal and uses `evm=fix` during fix mode. Added `evm=fix` to the fix-mode boot parameters and removed it when switching to enforce mode.
- The enforce-mode example only added `ima_appraise=enforce`, which could leave stale `ima_appraise=fix` and `evm=fix` arguments in place. Added `--remove-args="ima_appraise=fix evm=fix"` before adding enforce mode.
- The signing example wrote keys under `/etc/keys` without creating the directory and used `getfattr` without installing the package that provides it. Added `sudo mkdir -p /etc/keys` and included the `attr` package.
- The signing section implied that generating a local public key was enough for appraisal verification. Clarified that the corresponding public key or certificate must be trusted by the kernel IMA keyring.

## Review Notes
The corrected commands follow RHEL's documented fix-mode appraisal flow. Production deployments still require careful key enrollment, policy testing, and relabeling before enforce mode because a bad IMA policy or missing reference values can make systems fail to boot or deny access to files.
