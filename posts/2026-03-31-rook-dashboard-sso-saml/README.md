# How to Configure Dashboard SSO with SAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, SSO, SAML, Security

Description: Configure SAML 2.0 single sign-on for the Ceph Dashboard to integrate with your organization's identity provider like Okta, Azure AD, or Keycloak.

---

## Overview

The Ceph Dashboard supports SAML 2.0 single sign-on (SSO), allowing users to authenticate with your corporate identity provider (IdP) instead of managing local dashboard passwords. This simplifies access management and enables centralized authentication policies.

## Prerequisites

SAML SSO in Ceph requires the `python3-saml` library inside the MGR container. Verify availability:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-mgr -- \
  python3 -c "import onelogin.saml2; print('SAML library available')"
```

## Generate the Service Provider Metadata

First, get the Dashboard's SAML Service Provider metadata to configure your IdP:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso show saml2
```

Or access the SP metadata URL from the Dashboard:

```yaml
https://<dashboard-host>:8443/auth/saml2/metadata
```

Download and provide this XML to your IdP administrator.

## Configure SAML in the Ceph Dashboard

Set up SSO with your IdP's metadata URL:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso setup saml2 \
  "https://dashboard.example.com:8443" \
  "https://idp.example.com/sso/saml/metadata" \
  "username"
```

Parameters:
1. Service Provider base URL (your Dashboard URL)
2. IdP metadata URL
3. Username attribute in SAML assertion (optional, defaults to `uid`)
4. IdP entity ID (optional, auto-detected from metadata)
5. SP X.509 certificate path (optional, for signed assertions)
6. SP private key path (optional, for signed assertions)

## Configure Attribute Mapping

Map SAML assertion attributes to Ceph Dashboard user fields:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso show saml2
# Verify attribute mapping configuration
```

The Dashboard expects a username attribute in the SAML response. Configure your IdP to send:

```xml
<!-- Example Okta SAML attribute statement -->
<saml:AttributeStatement>
  <saml:Attribute Name="username">
    <saml:AttributeValue>alice@example.com</saml:AttributeValue>
  </saml:Attribute>
  <saml:Attribute Name="email">
    <saml:AttributeValue>alice@example.com</saml:AttributeValue>
  </saml:Attribute>
</saml:AttributeStatement>
```

## Enable SSO

After configuring the IdP and testing attribute mapping:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso enable saml2

# Verify SSO is enabled
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso status
```

## Pre-create Dashboard Users for SSO

SSO users must exist in the Dashboard with assigned roles:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-create \
  alice@example.com \
  "" \
  administrator \
  --enabled \
  --force-password

# Users without local passwords can still log in via SSO
```

## Disable SSO

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard sso disable

# Return to local user authentication
```

## Summary

Ceph Dashboard SAML SSO integration requires generating SP metadata, configuring your IdP with this metadata, then running `ceph dashboard sso setup saml2` with the IdP's metadata URL and attribute mapping. Pre-creating dashboard users with matching usernames ensures SAML-authenticated users receive their assigned roles upon login.
