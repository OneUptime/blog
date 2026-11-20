# Validation Summary: How to Create and Use a Resident OpenSSH FIDO2 Key on a Security Key

## Status

validated

## Post Type

Tutorial / operational guide with shell commands and an authorized_keys example.

## Technologies Covered

- OpenSSH client, server, ssh-keygen, ssh-add, and ssh-agent
- FIDO2 resident credentials, key handles, user presence, and user verification
- Ed25519 and ECDSA security-key SSH algorithms
- libfido2 and the OpenSSH security-key provider interface
- YubiKey authenticators and YubiKey Manager CLI
- Bash and Unix file permissions

## Sources Consulted

- [OpenSSH 8.2 release notes](https://www.openssh.org/txt/release-8.2): introduction of FIDO algorithms, resident credentials, provider architecture, and recovery commands.
- [OpenSSH 8.4 release notes](https://www.openssh.org/txt/release-8.4): client and authorized_keys verify-required options and credential protection.
- [ssh-keygen manual](https://man.openbsd.org/ssh-keygen): enrollment options, fingerprints, provider selection, and resident-key downloads.
- [ssh-add manual](https://man.openbsd.org/ssh-add): resident identity loading, provider selection, identity listings, and agent lifetimes.
- [ssh manual](https://man.openbsd.org/ssh): configuration selection, identity files, algorithm queries, and multiplexing controls.
- [ssh_config manual](https://man.openbsd.org/ssh_config): IdentityAgent, IdentitiesOnly, IdentityFile, PreferredAuthentications, and SecurityKeyProvider.
- [sshd manual](https://man.openbsd.org/sshd): authorized_keys syntax and user-presence/user-verification requirements.
- [OpenSSH 10.3p1 USB provider source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sk-usbhid.c), also inspected through its [complete raw source](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/sk-usbhid.c): credential protection, credential lookup, and internal user verification.
- [OpenSSH 10.3p1 ssh-keygen source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-keygen.c), also inspected through its [complete raw source](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/ssh-keygen.c): token overwrite confirmation and downloaded filenames, comments, and passphrases.
- [OpenSSH 10.3p1 ssh-agent source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-agent.c): PIN retry through an askpass helper during signing.
- [Yubico SSH guide](https://developers.yubico.com/SSH/Securing_SSH_with_FIDO2.html): device capabilities, firmware considerations, PINs, backup devices, and reset consequences.
- [YubiKey Manager FIDO commands](https://docs.yubico.com/software/yubikey/tools/ykman/FIDO_Commands.html): fido access change-pin syntax and purpose.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post is technically relevant and contains actionable implementation examples.
- Confirmed the distinction between a local reference file and the hardware-dependent signing credential. Recovery does not export an independently usable signing key or clone the authenticator.
- Confirmed the OpenSSH 8.2 and 8.4 feature boundaries. Although the Yubico guide describes downloads as requiring 8.3, OpenSSH's own 8.2 release notes explicitly document both ssh-keygen -K and ssh-add -K; the post correctly follows the upstream release notes.
- Confirmed enrollment flags, the ssh: application prefix, application/user credential scoping, token overwrite confirmation, and the separate local file passphrase. The pinned 10.3p1 provider requires credential protection for resident or verify-required enrollment.
- The ssh-keygen manual's PIN-only wording is narrower than the pinned provider implementation: its signing path explicitly supports authenticator-internal user verification. The post appropriately makes biometric support conditional on the authenticator.
- Confirmed the public-key algorithm spelling and authorized_keys verify-required option. Server enforcement and the default presence requirement are correctly distinguished from client generation options.
- Confirmed that downloads write reference/public files and do not restore original filenames, comments, or passphrases. Agent loading is a separate operation, and a public identity file can select a matching agent identity.
- Confirmed the one-hour agent lifetime syntax and the agent's askpass-based PIN retry. Loading an identity does not remove the need for the authenticator when signing.
- All seven Bash code blocks passed bash -n syntax checks. A local ssh -G check accepted the connection options and confirmed disabled agent use, IdentitiesOnly, public-key authentication preference, and disabled control-master behavior; this was configuration parsing only.
- All technical documentation and source URLs cited in the post resolved to the intended official resources. Live manuals can evolve; implementation-specific claims were also checked against the explicitly cited V_10_3_P1 tag.
- No authenticator enrollment, PIN changes, resident-key retrieval, agent loading, server authorization changes, or live authentication were performed. Hardware behavior and end-to-end access still depend on a compatible client build, authenticator capabilities, and server configuration as described in the post.
