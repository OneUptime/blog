# How to Set Up SSO for ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SSO, Authentication, Cloud, Security, SAML, Identity Provider

Description: Learn how to configure Single Sign-On (SSO) for ClickHouse Cloud using SAML 2.0 to enable centralized identity management and secure access.

---

ClickHouse Cloud supports Single Sign-On (SSO) via SAML 2.0, allowing your organization to use an existing Identity Provider (IdP) such as Okta, Microsoft Entra ID, or Google Workspace to authenticate users. This eliminates the need for separate ClickHouse credentials and centralizes access control.

## Prerequisites

Before configuring SSO, ensure you have:

- A ClickHouse Cloud organization with an Admin role
- Access to an Identity Provider that supports SAML 2.0
- The ability to create SAML applications in your IdP

## Step 1 - Access SSO Settings in ClickHouse Cloud

Log in to the ClickHouse Cloud console at `console.clickhouse.cloud`. Navigate to your organization settings by clicking your organization name in the top-left corner, then select **Security** from the left menu.

## Step 2 - Retrieve the Service Provider Metadata

In the Security settings, find the **Single Sign-On** section. ClickHouse Cloud will display its Service Provider (SP) metadata, including:

- **ACS URL** (Assertion Consumer Service URL)
- **Entity ID** (SP Entity ID)
- **Metadata URL**

Copy these values - you will need them when configuring your IdP.

## Step 3 - Configure Your Identity Provider

### Okta Example

In Okta, create a new SAML 2.0 application:

1. Go to **Applications** and click **Create App Integration**
2. Select **SAML 2.0** and click **Next**
3. Set the **Single Sign On URL** to the ClickHouse ACS URL
4. Set the **Audience URI** to the ClickHouse Entity ID
5. Under **Attribute Statements**, map the following:

```text
email    ->  user.email
firstName -> user.firstName
lastName  -> user.lastName
```

### Microsoft Entra ID Example

In Microsoft Entra ID (formerly Azure AD), register an enterprise application:

1. Go to **Enterprise Applications** and click **New application**
2. Select **Create your own application** and choose **Integrate any other application you don't find in the gallery**
3. Under **Single sign-on**, select **SAML**
4. Set the **Identifier (Entity ID)** and **Reply URL (ACS URL)** from ClickHouse

## Step 4 - Upload IdP Metadata to ClickHouse Cloud

After configuring your IdP, download the IdP metadata XML file. In ClickHouse Cloud Security settings, upload this metadata file or paste the metadata URL.

```text
IdP Metadata URL example:
https://your-org.okta.com/app/exk.../sso/saml/metadata
```

## Step 5 - Test and Enable SSO

Click **Test SSO Configuration** to verify the integration. ClickHouse Cloud will attempt an SP-initiated login flow. Once the test passes, toggle **Enable SSO** to enforce SSO for all organization members.

## Managing Users with SSO

After enabling SSO, new users are provisioned on first login. You can map IdP groups to ClickHouse Cloud roles using SAML attribute mappings. Existing users will be prompted to link their accounts on next login.

## Security Best Practices

- Enable **Just-In-Time (JIT) provisioning** to automatically create accounts on first login
- Enforce MFA at the IdP level for an additional security layer
- Regularly audit users in the ClickHouse Cloud console under **Members**
- Set session timeout policies in your IdP to match your organization's security policy

## Summary

Setting up SSO for ClickHouse Cloud streamlines access management by integrating with your existing Identity Provider. By configuring SAML 2.0, you gain centralized user management, enforce consistent security policies, and reduce credential sprawl across your organization.
