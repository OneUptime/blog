# Validation Summary: How to Switch RHEL to the FUTURE Crypto Policy for Stronger Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- System-wide cryptographic policies
- FUTURE crypto policy
- update-crypto-policies
- TLS
- OpenSSL
- OpenSSH
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 8 Security hardening: system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 10 Security hardening: system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/security_hardening/security_hardening

## Issues Found
- The introduction stated that FUTURE requires 2048-bit minimum RSA keys with 3072-bit recommended. Red Hat documentation for RHEL 8, RHEL 9, and RHEL 10 states that FUTURE accepts RSA keys and Diffie-Hellman parameters only if they are at least 3072 bits. Updated the introduction to say 3072-bit minimum RSA keys.

## Review Notes
- The `update-crypto-policies --show` and `update-crypto-policies --set FUTURE` commands match Red Hat documentation.
- Red Hat documentation recommends restarting the system after changing the system-wide crypto policy so already running services and applications pick up the new settings. Restarting individual crypto-using services can work for scoped deployments, but a reboot is the documented comprehensive approach.
- Red Hat notes that the exact algorithms and key sizes in predefined crypto policies can change during a RHEL release lifecycle, so future reviews should re-check the active RHEL version documentation.
