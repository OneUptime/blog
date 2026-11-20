# Validation Summary: OpenSSH 9.8+ Flood Limits: `MaxStartups` and `PerSourcePenalties`

## Status

validated

## Post Type

Technical configuration guide and operational tutorial.

## Technologies Covered

- OpenSSH 9.8+ server and SSH client
- SSH unauthenticated connection limits and source penalties
- IPv4/IPv6 source grouping, NAT, and proxy considerations
- Shell commands and awk output filtering
- systemd service reloads and journal inspection

## Sources Consulted

- [OpenSSH 9.8 release notes](https://www.openssh.org/txt/release-9.8): feature introduction, default enablement, and NAT/proxy implications.
- [OpenSSH 9.9 release notes](https://www.openssh.org/txt/release-9.9): reduced login-grace penalty default and timeout jitter.
- [Current sshd_config manual](https://man.openbsd.org/sshd_config): connection limits, time settings, source grouping, penalty options, exemptions, and configuration syntax.
- [sshd manual](https://man.openbsd.org/sshd): version reporting, configuration selection, validation modes, command-line overrides, and SIGHUP behavior.
- [ssh manual](https://man.openbsd.org/ssh): destination syntax and disabling connection sharing with `-S none`.
- [OpenSSH 9.8p1 configuration manual source](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/sshd_config.5#L1573): original penalty definitions and defaults.
- [OpenSSH 9.8p1 configuration parser](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/servconf.c): global-only settings, penalty sub-option parsing, default values, and effective configuration output.
- [OpenSSH 9.9p1 configuration parser](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/servconf.c): ten-second configured grace penalty default.
- [OpenSSH 9.8p1 penalty implementation](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/srclimit.c) and [9.9p1 implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/srclimit.c): original login-grace expiry behavior.
- [OpenSSH 10.3p1 penalty implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/srclimit.c): expiry accumulation, strict minimum comparison, and maximum accumulation.
- [OpenSSH 9.8p1 listener implementation](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/sshd.c#L528): admission ordering, random rejection calculation, and refusal logging.
- [systemctl manual](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html): service configuration reload semantics.
- [journalctl manual](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html) and [systemd.time manual](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html): unit filtering and relative time syntax.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post contains relevant implementation guidance and qualifies for technical validation.
- Confirmed the distinction between concurrent unauthenticated connections and a connections-per-second quota, including the stated rejection thresholds and upstream default.
- Confirmed that the example options are global in OpenSSH 9.8p1. Its parser independently fills penalty sub-options and can enable penalties when a later line sets an unset duration, even after an earlier `no` setting.
- Confirmed the historical caveat: the configured grace penalty changed from twenty seconds in 9.8p1 to ten in 9.9p1, but both tagged penalty implementations select the crash duration for grace expiry. The post correctly distinguishes configured values from actual behavior.
- Confirmed that penalty accumulation is tied to connection outcomes and elapsed time, so three incorrect passwords are not a reliable ban threshold. The cited 10.3p1 implementation activates a deferred penalty only when its remaining duration exceeds the minimum.
- Confirmed that source exemptions do not bypass the separate MaxStartups check and that source grouping cannot distinguish users sharing one apparent address.
- Ran `/usr/sbin/sshd -V`, which reported OpenSSH 10.3p1. Tested the combined example configuration and exemption list using an isolated temporary configuration and generated Ed25519 host key. Both `sshd -t -f` and `sshd -T -f` exited successfully. The effective output matched the supplied connection limit, grace time, address masks, penalty durations, and exemption addresses.
- Reviewed shell syntax and the awk field filter. Checked linked official resources and the referenced tagged source locations; source files were inspected through GitHub's raw content endpoint.
- This was a documentation/source review plus local configuration validation. No running SSH service was reconfigured or reloaded, and no connection floods, remote authentication tests, or vendor-specific behavior tests were performed. The post appropriately requires staging tests and verification with the deployed binary and service configuration.
