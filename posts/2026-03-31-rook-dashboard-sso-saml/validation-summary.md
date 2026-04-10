# Validation Summary: How to Configure Dashboard SSO with SAML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph Dashboard (MGR module)
- SAML 2.0 (Single Sign-On protocol)
- python3-saml / OneLogin SAML library
- Kubernetes (kubectl exec commands)
- Identity Providers (Okta, Azure AD, Keycloak)

## Sources Consulted
- Ceph Dashboard official documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Red Hat Ceph Storage 5 Dashboard Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/dashboard_guide/
- SUSE SES Dashboard Configuration: https://documentation.suse.com/ses/7.1/html/ses-all/dashboard-initial-configuration.html
- IBM Ceph Storage Documentation: https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=access-enabling-single-sign-ceph-dashboard
- Ceph SSO service source code on GitHub: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/services/sso.py

## Issues Found

### Issue 1: Incorrect 5th parameter in `sso setup saml2` command (Critical)
- **What was wrong**: The blog listed a "SSL verify (true/false)" as the 5th parameter of `ceph dashboard sso setup saml2` and passed `"false"` in the example command. This parameter does not exist. The actual command signature is: `ceph dashboard sso setup saml2 <ceph_dashboard_base_url> <idp_metadata> {<idp_username_attribute>} {<idp_entity_id>} {<sp_x_509_cert>} {<sp_private_key>}`.
- **What was changed**: Removed the `"false"` argument and the fabricated `"username"` IdP entity ID from the example command. Updated the parameter list to correctly describe parameters 5 and 6 as SP X.509 certificate path and SP private key path (both optional, for signed assertions).
- **Why**: Passing `"false"` as the 5th parameter would be interpreted as an SP X.509 certificate file path, causing the command to fail. The parameter description was misleading and could cause user confusion.

### Issue 2: Incorrect `ac-user-create` command syntax (Significant)
- **What was wrong**: The command `ceph dashboard ac-user-create --enabled alice@example.com administrator` placed the `--enabled` flag before the positional username argument and omitted the required password parameter. This would fail or produce unexpected behavior.
- **What was changed**: Fixed to `ceph dashboard ac-user-create alice@example.com "" administrator --enabled --force-password`, which correctly orders positional arguments (username, password, role) before flags, provides an empty password string for SSO-only users, and includes `--force-password` to allow the empty password.
- **Why**: The Ceph CLI expects positional arguments (`username`, `password`, `rolename`) before optional flags. SSO-only users still require a password parameter (even if empty) and `--force-password` to bypass password strength validation.

## Review Notes
- The `python3-saml` library prerequisite check (`import onelogin.saml2`) is correct and important — without this library, SAML SSO will not function.
- The SP metadata URL path `/auth/saml2/metadata` is confirmed correct per official documentation.
- The `ceph dashboard sso enable saml2`, `ceph dashboard sso disable`, and `ceph dashboard sso status` commands are all correct.
- Port 8443 is correctly identified as the default HTTPS port for the Ceph Dashboard.
- The SAML attribute statement XML example is reasonable for illustration, though actual attribute names will vary by IdP configuration.
- The post correctly notes that SSO users must be pre-created in the Dashboard — Ceph Dashboard does not auto-provision users from SAML assertions.
