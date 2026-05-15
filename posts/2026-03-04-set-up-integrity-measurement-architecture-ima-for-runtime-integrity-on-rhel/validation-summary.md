# Validation Summary: How to Set Up IMA for Runtime Integrity on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux Integrity Measurement Architecture (IMA)
- Extended Verification Module (EVM)
- TPM 2.0 PCRs
- grubby
- Linux audit logs

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Extending, customizing, and troubleshooting kernel integrity subsystem": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/extending-customizing-and-troubleshooting-kernel-integrity-subsystem
- Red Hat Enterprise Linux 8 documentation, "Enabling IMA and EVM": https://docs.redhat.com/ja/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/enabling-integrity-measurement-architecture-and-extended-verification-module_enhancing-security-with-the-kernel-integrity-subsystem
- Linux kernel documentation, "The kernel's command-line parameters": https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- IMA documentation, "IMA Policy": https://ima-doc.readthedocs.io/en/latest/ima-policy.html
- IMA documentation, "Policy Syntax": https://ima-doc.readthedocs.io/en/latest/policy-syntax.html
- IMA documentation, "IMA Event Log": https://ima-doc.readthedocs.io/en/latest/event-log-format.html
- tpm2-tools manual page, "tpm2_pcrread": https://www.mankier.com/1/tpm2_pcrread

## Issues Found
- The introduction overstated IMA behavior by saying files are checked every time they are accessed. I changed this to describe the policy-driven kernel hooks used by IMA, such as execution, executable mmap, and root reads under the TCB policy.
- The measurement log path used `/sys/kernel/security/ima/ascii_runtime_measurements`. I updated it to the newer documented path `/sys/kernel/security/integrity/ima/ascii_runtime_measurements`.
- The measurement log field description and example were incorrect for the default `ima-ng` template. I changed them to `PCR_number template_digest template_name file_hash filename`.
- The appraisal setup omitted `evm=fix`, which Red Hat documents when enabling IMA appraisal fix mode with EVM. I added `evm=fix` to the `grubby` command.
- The appraisal description said appraisal verifies integrity before allowing execution. I broadened this to "access to protected files" because `appraise_tcb` appraises protected/root-owned files according to policy, not only executions.
- The custom policy section incorrectly used `ima_policy=/etc/ima/ima-policy` as a kernel command-line argument. The kernel `ima_policy=` parameter accepts built-in policy names, while RHEL loads `/etc/ima/ima-policy` during boot. I replaced the invalid `grubby` command with a runtime policy test command using `/sys/kernel/security/integrity/ima/policy`.

## Review Notes
The post is technically valid after these fixes. In a future revision, the author could add more production caveats around Secure Boot, signed IMA policies, and recovery steps for malformed policies, but those additions are beyond the scope of correcting the existing tutorial.
