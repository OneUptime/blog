# Validation Summary: How to Use Ansible with SSHFP DNS Records

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenSSH
- SSHFP DNS records
- DNSSEC
- BIND/nsupdate
- Amazon Route 53

## Sources Consulted
- RFC 4255, "Using DNS to Securely Publish Secure Shell (SSH) Key Fingerprints": https://www.rfc-editor.org/rfc/rfc4255
- RFC 6594, "Use of the SHA-256 Algorithm with RSA, DSA, and ECDSA in SSHFP Resource Records": https://www.rfc-editor.org/rfc/rfc6594
- RFC 7479, "Using Ed25519 in SSHFP Resource Records": https://www.rfc-editor.org/rfc/rfc7479
- IANA DNS SSHFP RR Parameters registry: https://www.iana.org/assignments/dns-sshfp-rr-parameters/dns-sshfp-rr-parameters.xhtml
- OpenSSH ssh_config(5) manual for VerifyHostKeyDNS behavior: https://man.openbsd.org/ssh_config
- OpenSSH ssh-keygen(1) manual for SSHFP generation: https://man.openbsd.org/ssh-keygen
- OpenSSH ssh-keyscan(1) manual for the -D SSHFP output option: https://man.openbsd.org/ssh-keyscan
- Ansible amazon.aws.route53 module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/route53_module.html
- BIND nsupdate manual documentation: https://bind9.readthedocs.io/en/latest/manpages.html#nsupdate-dynamic-dns-update-utility
- Local command/man-page checks for ssh, ssh-keygen, ssh-keyscan, nsupdate, dig, and ssh_config.

## Issues Found
- The post described SSHFP as eliminating prompts whenever fingerprints match. Updated the wording and diagram to state that OpenSSH only implicitly trusts secure DNS fingerprints; insecure fingerprints are handled like ask mode.
- The remote SSHFP generation command piped ssh-keyscan known_hosts output into ssh-keygen -r, which is not the intended format. Replaced it with ssh-keyscan -D, the OpenSSH-supported way to print SSHFP records from a scan.
- The nsupdate examples placed the TTL after the SSHFP RDATA. nsupdate expects update add domain-name ttl class type data. Updated the Ansible templates to transform ssh-keygen output into nsupdate's required field order.
- The Route53 example did not mention that SSHFP support in amazon.aws.route53 requires amazon.aws 9.2.0 or newer. Added a short inline version note.
- The automated management playbook used the command module with a heredoc and compared dig +short output to ssh-keygen output with different formats. Changed the heredoc task to shell and normalized the comparison.
- The host key rotation example generated a key at the existing host-key path while using creates for a different .new path, then referenced a static nsupdate file that was never created. Updated the example to generate a .new key pair, publish records from the new public key, create the nsupdate file, install the new key pair, and then restart sshd.
- The resolver section said to configure the resolver to validate DNSSEC while only showing public validating resolvers. Reworded it to "Use a DNSSEC-validating resolver."

## Review Notes
The examples are intentionally illustrative and still assume working DNS update credentials, correct Route53 permissions, DNSSEC validation on the client path, and hostnames that match the SSH names Ansible uses. The host key rotation example updates DNS before restarting sshd, but real production rotations should account for DNS TTL/cache propagation and active connection behavior.
