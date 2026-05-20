# Validation Summary: How to Generate SSH Key Pairs (RSA, Ed25519) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH
- SSH key pairs
- RSA
- Ed25519
- ssh-keygen
- ssh-agent
- ssh-add
- SSH client configuration

## Sources Consulted
- Ubuntu/OpenSSH local `ssh-keygen(1)` man page from OpenSSH_9.6p1 Ubuntu-3ubuntu13.16.
- Ubuntu/OpenSSH local `ssh-add(1)` man page from OpenSSH_9.6p1 Ubuntu-3ubuntu13.16.
- Ubuntu/OpenSSH local `ssh_config(5)` man page from OpenSSH_9.6p1 Ubuntu-3ubuntu13.16.
- OpenSSH manual pages index: https://www.openssh.org/manual.html
- OpenSSH release notes for Ed25519 support since OpenSSH 6.5: https://www.openssh.org/releasenotes.html
- RFC 8709, Ed25519 and Ed448 Public Key Algorithms for the Secure Shell (SSH) Protocol: https://www.rfc-editor.org/rfc/rfc8709
- NIST SP 800-57 Part 1 Rev. 5 security-strength tables for RSA and ECC key sizes: https://doi.org/10.6028/NIST.SP.800-57pt1r5
- Ubuntu `ssh_config(5)` man page for `IdentityFile`, `IdentitiesOnly`, and `AddKeysToAgent`: https://manpages.ubuntu.com/manpages/jammy/man5/ssh_config.5.html

## Issues Found
- The post stated that 256-bit Ed25519 provides equivalent or better security than 4096-bit RSA. NIST security-strength guidance maps 256-bit ECC-style keys to roughly the 128-bit security-strength category, while 3072-bit RSA is also in that category and 4096-bit RSA is commonly treated as stronger than 3072-bit RSA. The wording was changed to say Ed25519 provides strong security comparable to large RSA keys.
- The SSH agent shell snippet was described as making agent setup persistent across sessions. The snippet auto-starts an agent and loads a key for new shell sessions, but it does not by itself preserve a decrypted key across reboots or unrelated login sessions. The wording was corrected to describe what the snippet actually does.

## Review Notes
The `ssh-keygen`, `ssh-add`, `ssh-agent`, `ssh-copy-id`, and `ssh_config` examples are syntactically valid for modern Ubuntu/OpenSSH systems. OpenSSH 9.6 currently defaults to Ed25519 when `ssh-keygen` is run without arguments, but keeping `-t ed25519` in the tutorial is explicit and correct. The `-E md5` fingerprint example is valid, though SHA256 remains the default and preferred fingerprint format for routine verification.
