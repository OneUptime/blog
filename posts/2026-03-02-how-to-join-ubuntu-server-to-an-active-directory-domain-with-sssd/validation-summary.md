# Validation Summary: How to Join Ubuntu Server to an Active Directory Domain with SSSD

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered

- Ubuntu Server (22.04 / 24.04 LTS)
- Active Directory (AD)
- realmd / `realm` CLI
- SSSD (System Security Services Daemon) with the AD provider
- adcli
- Kerberos (krb5-user)
- chrony (NTP)
- netplan (network configuration)
- PAM (pam_mkhomedir, pam-auth-update)
- oddjob / oddjob-mkhomedir
- sudoers / visudo

## Sources Consulted

- realm(8) — https://manpages.ubuntu.com/manpages/jammy/man8/realm.8.html
- realmd freedesktop docs — https://www.freedesktop.org/software/realmd/docs/realm.html
- sss_cache(8) — https://manpages.ubuntu.com/manpages/jammy/man8/sss_cache.8.html
- sssd-ad(5) — https://manpages.debian.org/testing/sssd-ad/sssd-ad.5.en.html
- sssd-ldap(5) — https://manpages.ubuntu.com/manpages/jammy/man5/sssd-ldap.5.html
- sssd-ldap-attributes(5) — https://manpages.ubuntu.com/manpages/jammy/man5/sssd-ldap-attributes.5.html
- Netplan reference — https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Red Hat Identity Management / Windows Integration Guide (realmd join/leave behavior)

## Issues Found

1. **Netplan `gateway4` is deprecated** in Ubuntu 22.04+ (netplan ≥ 0.103). Replaced the `gateway4: 192.168.1.1` line with the recommended `routes:` stanza (`to: default`, `via: 192.168.1.1`) so the example doesn't emit a deprecation warning on supported Ubuntu releases.

2. **Misleading SSSD config comments**:
   - The comment "Group membership lookup (tokenGroups is faster for AD)" was attached to `ldap_id_mapping = True`, but `ldap_id_mapping` controls algorithmic UID/GID mapping from the AD objectSID — it is unrelated to tokenGroups (a separate option, `ldap_use_tokengroups`). Replaced with an accurate comment.
   - The block labeled "Filter out system accounts" set `ldap_user_extra_attrs` / `ldap_user_ssh_public_key` / `ad_gpo_access_control`. None of those options filter system accounts; the first two configure extra LDAP attributes and the SSH public-key attribute, and the third disables GPO-based access control. Removed the two unrelated lines (which used the unrelated `altSecurityIdentities` attribute and would have been misleading to copy/paste) and relabeled the remaining `ad_gpo_access_control = disabled` line with an accurate comment.

3. **`sss_cache -u jsmith` comment was wrong** — the post described it as "View cached user info", but `sss_cache -u <user>` *expires/invalidates* the user's cache entry; it does not display cached data. Corrected the comment.

4. **`realm leave` descriptions were swapped/incorrect**:
   - Default `realm leave` does NOT remove the computer account from AD (it only unjoins locally), but the post claimed it did.
   - `realm leave --remove` actually removes the AD computer account and requires the DC to be reachable; the post described this as "Force leave if DC is unreachable", which is the opposite of its real behavior.
   - Corrected both descriptions to reflect the actual semantics.

## Review Notes

- The Kerberos realm/uppercase convention, package list, `realm discover` / `realm join` / `realm permit` syntax, `pam-auth-update --enable mkhomedir`, sudoers escaping for groups containing spaces (`%domain\ admins`), and `chrony` configuration are all correct.
- `realm join --computer-ou=...` is valid; note the OU must already exist in AD.
- The post uses `use_fully_qualified_names = False` and then shows a sudoers example with `jsmith@corp.example.com` — this still works, but readers using short names should be aware both forms appear in the post.
- `ad_gpo_access_control = disabled` disables Group Policy–based access control. Modern SSSD (>=1.13) defaults this to `enforcing`. Leaving it disabled is a reasonable choice for environments not relying on AD GPOs for Linux access, but admins should be aware they're opting out of GPO enforcement.
- For environments needing to truly filter system/local accounts from SSSD lookups, the appropriate options are `filter_users` / `filter_groups` in the `[nss]` section (not the attributes that were originally listed).
