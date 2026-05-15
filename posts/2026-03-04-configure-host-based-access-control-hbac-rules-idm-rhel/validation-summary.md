# Validation Summary: How to Configure Host-Based Access Control (HBAC) Rules in IdM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux Identity Management (IdM)
- FreeIPA
- Host-Based Access Control (HBAC)
- IPA CLI
- SSSD

## Sources Consulted
- Red Hat Enterprise Linux 8 Documentation: Configuring host-based access control rules - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_idm_users_groups_hosts_and_access_control_rules/configuring-host-based-access-control-rules_managing-users-groups-hosts
- FreeIPA HBAC rule CLI reference - https://ipa.show/reference/hbacrule/
- FreeIPA hbactest API documentation - https://freeipa.readthedocs.io/en/ipa-4-11/api/hbactest.html
- SSSD IPA provider manual page reference for `ipa_hbac_refresh` - https://manpages.debian.org/stretch/sssd-ipa/sssd-ipa.5.en.html

## Issues Found
- The post initially showed disabling the default `allow_all` rule before creating and testing replacement HBAC rules. Red Hat documentation warns that disabling `allow_all` first denies access to all hosts for all users. I changed the command comment and follow-up text to make clear that `allow_all` should be disabled only after replacement rules are created and tested.
- The `ipa hbactest` example used `--rules=dev-server-access,admin-access`. Red Hat's CLI example repeats `--rules` for multiple rules, so I changed it to `--rules=dev-server-access` and `--rules=admin-access`.
- The SSSD propagation note said changes may take a few minutes. SSSD's IPA provider has configurable HBAC refresh behavior, so I changed the wording to say propagation depends on the client's SSSD refresh settings.

## Review Notes
The remaining IPA CLI commands and HBAC concepts align with the Red Hat IdM and FreeIPA references checked. The examples assume the referenced users, groups, hosts, host groups, and HBAC services already exist or are created as shown.
