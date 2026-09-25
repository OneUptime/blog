# Validation Summary: How to Test PCI DSS Idle-Session Reauthentication on Workstations and Jump Hosts

## Status

validated

## Post Type

Technical testing guide. Although it contains no executable code blocks or commands, it includes implementation details about session enforcement, OpenSSH settings, shell timeouts, and reauthentication testing, so a technical review is appropriate.

## Technologies Covered

- PCI DSS v4.0.1 Requirement 8.2.8 and PAN display protection
- Workstation screen locks and centrally managed inactivity policies
- Remote Desktop Protocol (RDP) and jump hosts
- OpenSSH client-alive checks, channel timeouts, and connection reuse
- Interactive shell timeouts and terminal multiplexers
- Browser sessions, single sign-on (SSO), and administrative consoles

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — confirmed the referenced library includes PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirement 8.2.8, printed page 185](https://stratumone.net/wp-content/uploads/2025/01/PCI-DSS-v4_0_1.pdf) — PCI SSC-authored standard consulted through a third-party hosted copy. The official library's PDF endpoint returned an access error; the direct download attempt returned HTTP 403.
- [PCI SSC FAQ 1147](https://www.pcisecuritystandards.org/faqs/1147/) — unattended-console protection, screen locking, and continued legitimate processing.
- [PCI SSC FAQ 1071](https://www.pcisecuritystandards.org/faqs/1071/) — browser PAN display and timeout controls.
- [OpenSSH sshd_config manual](https://man.openbsd.org/sshd_config) — ClientAliveInterval, ClientAliveCountMax, ChannelTimeout, and the distinction between closing a channel and closing an SSH connection.
- [OpenSSH 9.2 release notes](https://www.openssh.org/txt/release-9.2) — introduction of server-side ChannelTimeout.
- [GNU Bash: Interactive Shell Behavior](https://www.gnu.org/software/bash/manual/html_node/Interactive-Shell-Behavior) — indexed official documentation confirms that TMOUT applies while waiting for a command after the primary prompt; direct page retrieval failed.
- [OpenBSD tmux manual](https://man.openbsd.org/tmux) — persistent sessions, detachment, and reattachment.
- [Microsoft: Interactive logon — Machine inactivity limit](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/interactive-logon-machine-inactivity-limit) — workstation locking based on user-input inactivity.
- [Microsoft: ADMX_TerminalServer Policy CSP](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-terminalserver) — idle RDP disconnection and the separate policy for ending sessions.
- [OpenID Connect Core 1.0, section 3.1.2.1](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) — existing authentication can support silent sign-in, while reauthentication can be requested explicitly.

## Issues Found

No technical issues found.

## Review Notes

- Confirmed the distinction between reauthentication after more than 15 minutes of inactivity and the defined testing procedure's configuration limit of 15 minutes or less. The standard permits enforcement at the system or application level and does not require legitimate unattended processing to stop.
- Confirmed that client-alive responses demonstrate client responsiveness, not human presence. ChannelTimeout measures channel inactivity and does not necessarily prevent another channel from opening over the existing connection. Server-side support began in OpenSSH 9.2; the post appropriately advises checking the installed version and complete design.
- Shell prompt timeouts do not provide universal coverage for foreground programs or multiplexed sessions. The post correctly treats them as controls requiring behavioral verification.
- RDP locking, disconnection, and termination are distinct outcomes. The guide correctly calls for observing the outcome and testing reconnection rather than treating disconnection alone as proof of reauthentication.
- Silent SSO and terminal reattachment are valid test cases. Their actual behavior depends on the deployed identity provider, application, endpoint policy, and remote-access configuration.
- The linked PCI FAQs and OpenSSH manual resolve to the intended resources. The PCI library link is valid, although it points to the library rather than directly to the requirement.
- The evidence collection, synthetic-data use, timing, and bypass checks are practical testing recommendations. This review checked their technical basis; it did not execute timed tests against a deployed environment or certify PCI DSS compliance.
- No code, CLI syntax, or configuration snippets required execution. README.md was left unchanged.
