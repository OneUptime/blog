# Validation Summary: How to Configure TPM 2.0 for Measured Boot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- TPM 2.0
- Measured boot
- UEFI Secure Boot
- tpm2-tools
- TPM PCRs and event logs
- IMA

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, Managing, monitoring, and updating the kernel: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/
- Red Hat Enterprise Linux 9 documentation, Security hardening: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- tpm2-tools tpm2_pcrread manual: https://tpm2-tools.readthedocs.io/en/stable/man/tpm2_pcrread.1/
- tpm2-tools tpm2_eventlog manual: https://tpm2-tools.readthedocs.io/en/stable/man/tpm2_eventlog.1/
- tpm2-tools tpm2_createak manual: https://tpm2-tools.readthedocs.io/en/latest/man/tpm2_createak.1/
- tpm2-tools tpm2_createek manual: https://tpm2-tools.readthedocs.io/en/stable/man/tpm2_createek.1/
- tpm2-tools tpm2_quote manual: https://tpm2-tools.readthedocs.io/en/stable/man/tpm2_quote.1/
- tpm2-tools TCTI configuration documentation: https://tpm2-tools.readthedocs.io/en/stable/man/common/tcti/
- Linux kernel TPM event log documentation: https://docs.kernel.org/6.6/security/tpm/tpm_event_log.html
- Linux TPM PCR Registry: https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/
- IMA and EVM concepts documentation: https://ima-doc.readthedocs.io/en/latest/ima-concepts.html

## Issues Found
- The PCR mapping described PCR 5 as only boot loader configuration. Updated it to include partition table measurements and some boot loader configuration, matching the Linux PCR registry.
- The PCR 8 and PCR 9 descriptions were too narrow. Updated PCR 8 to GRUB commands and kernel command line, and PCR 9 to files read by GRUB, including the kernel and initramfs.
- The installation section implied that `tpm2-abrmd` must be installed and enabled. Updated it to install `tpm2-tools` only, which is sufficient for the commands in the post on RHEL 9.
- The baseline workflow created dated files but later used `/root/pcr-baseline.txt` or a wildcard diff. Updated the examples to maintain `/root/pcr-baseline.txt` as the canonical baseline while also keeping a dated archival copy.
- The remote attestation example created an AK without saving the required context, public key, or name files, and assumed an EK handle already existed. Updated it to create an EK first, save `ak.ctx`, `ak.pub`, and `ak.name`, and add PCR output and a nonce to the quote command.
- The PCR repeatability statement was too absolute. Updated it to clarify that repeatability depends on the measured boot path and measured inputs remaining unchanged.

## Review Notes
The post is technically valid after the fixes. Future improvements could add quote verification with `tpm2_checkquote` and note that IMA requires an enabled measurement policy before runtime measurements are useful.
