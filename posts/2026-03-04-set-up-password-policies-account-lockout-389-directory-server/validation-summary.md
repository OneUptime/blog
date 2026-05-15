# Validation Summary: How to Set Up Password Policies and Account Lockout in 389 Directory Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- 389 Directory Server / Red Hat Directory Server
- LDAP
- `dsconf`
- `ldappasswd`
- Password policies and account lockout

## Sources Consulted
- Red Hat Directory Server 13 Security and access control: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/security_and_access_control/index
- Red Hat Directory Server 12 Securing Red Hat Directory Server: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/securing_red_hat_directory_server/index
- Red Hat Directory Server 12 User management and authentication: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/user_management_and_authentication/user_management_and_authentication
- Red Hat Directory Server 11 Administration Guide, managing password policy: https://docs.redhat.com/en/documentation/red_hat_directory_server/11/html/administration_guide/user_account_management-managing_the_password_policy
- 389 Directory Server generated `dsconf(8)` manual: https://man.archlinux.org/man/extra/389-ds-base/dsconf.8.en
- 389 Directory Server generated `dsidm(8)` manual: https://man.archlinux.org/man/extra/389-ds-base/dsidm.8.en
- 389 Directory Server password reset how-to: https://www.port389.org/docs/389ds/howto/howto-passwordreset.html
- Local OpenLDAP `ldappasswd` and `ldapmodify` help output for command-line option syntax.

## Issues Found
- `--pwdminlength` is not the current `dsconf pwpolicy set` option for minimum password length. Changed it to `--pwdminlen` in both global and local policy examples.
- `--pwdexp` is not the documented `dsconf` option for enabling password expiration. Changed it to `--pwdexpire`.
- `--pwdinhistory` is not the current `dsconf` option. Changed the history example to enable history with `--pwdhistory=on` and set the count with `--pwdhistorycount=5`.
- `--pwdmaxfailure` is not the documented account lockout option. Changed it to `--pwdmaxfailures`.
- `--pwdfailurecountinterval` is not the documented `dsconf` option. Changed it to `--pwdresetfailcount`.
- `dsidm account unlock` is documented for account activation/inactivation workflows, while password-policy lockout state is stored in `passwordRetryCount` and `accountUnlockTime`. Changed the unlock example to remove those operational attributes with `ldapmodify`, matching the 389 Directory Server password reset guidance.
- The OpenLDAP command-line tools should use `-x` for simple authentication with `-D` and `-W`. Added `-x` to the `ldappasswd` and `ldapmodify` examples and changed the `ldapmodify` example to use a heredoc for the LDIF input.

## Review Notes
The account lockout behavior can differ by the `passwordLegacyPolicy` setting: with legacy password policy enabled, Red Hat documents that lockout happens one failed attempt later than `--pwdmaxfailures`. The post's baseline remains valid, but future revisions could mention this caveat.
