# Validation Summary: How to Configure Ping Identity with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Ping Identity
- PingFederate
- PingOne
- SAML 2.0
- Single Sign-On (SSO)

## Sources Consulted
- Rancher: Configure PingIdentity (SAML) https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-pingidentity
- Rancher source: `pkg/auth/providers/saml/saml_client.go` https://github.com/rancher/rancher/blob/main/pkg/auth/providers/saml/saml_client.go
- Rancher source: `pkg/apis/management.cattle.io/v3/authn_types.go` https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authn_types.go
- PingFederate: Importing SP metadata https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/pf_importing_sp_metadata.html
- PingFederate: Accessing SP connections https://docs.pingidentity.com/pingfederate/12.2/administrators_reference_guide/help_spconnectionstasklet_connmgmtstate.html
- PingFederate: Configuring protocol settings https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/help_spbrowserssotasklet_spprotocolsettingsstate.html
- PingFederate: Choosing SAML profiles https://docs.pingidentity.com/pingfederate/12.0/administrators_reference_guide/help_spbrowserssotasklet_selectsamlprofilesstate.html
- PingFederate: Setting up an attribute contract https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/help_assertioncreationtasklet_createattributecontractstate.html
- PingFederate: Metadata export https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/pf_metadata_export.html
- PingOne: Adding an application https://docs.pingidentity.com/pingone/applications/p1_applications_add_applications.html
- PingOne: Editing an application - SAML https://docs.pingidentity.com/pingone/applications/p1_edit_application_saml.html
- PingOne: IdP metadata for SAML applications https://docs.pingidentity.com/pingone/applications/p1_downloadidpmetadataapps.html

## Issues Found
- The post instructed readers to download Rancher's Ping SAML metadata before Rancher can generate valid metadata. I corrected the flow to use the entity ID and ACS URL for the initial IdP setup, and I moved the metadata download guidance to after the Rancher configuration has been saved.
- The Rancher configuration omitted the required service provider private key and certificate. I added the `openssl` example and the missing `Private Key` and `Certificate` fields to match Rancher's required SAML configuration.
- The PingFederate navigation and export instructions used outdated or ambiguous UI wording. I updated them to the current `Applications > Integration > SP Connections` flow and clarified the proper metadata update/export path.
- The Browser SSO profile step implied optional SAML profiles were mandatory. I changed it to reflect that SP-initiated SSO is the required profile, while SLO and IdP-initiated SSO are optional depending on the deployment.
- The group mapping section included an overly specific LDAP example that could produce unusable group values in Rancher. I replaced it with accurate guidance that Rancher uses the `groups` assertion values exactly as sent, so PingFederate should transform directory values as needed.
- The Rancher UI step said to select `Ping` and described a separate `Test` flow. I corrected the provider name to `Ping Identity` and aligned the validation flow with Rancher's documented enable-and-validate behavior.
- The PingOne section used incorrect navigation and metadata download locations. I updated it to the current `Applications > Applications` workflow, clarified that SLO is configured after the app is created, and corrected where to obtain the IdP metadata.

## Review Notes
- Verified in Rancher source that the Ping SAML endpoints exist at `/v1-saml/ping/saml/metadata`, `/v1-saml/ping/saml/acs`, and `/v1-saml/ping/saml/slo`.
- Rancher requires `idpMetadataContent`, `spCert`, `spKey`, `groupsField`, `displayNameField`, `userNameField`, `uidField`, and `rancherApiHost` for Ping SAML configuration.
- Attribute names such as `displayName`, `userName`, `uid`, and `groups` do not have to be those exact strings, but the values configured in Rancher must match the attribute names emitted by PingFederate or PingOne.
