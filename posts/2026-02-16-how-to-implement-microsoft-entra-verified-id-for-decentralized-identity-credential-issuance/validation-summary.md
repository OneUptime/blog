# Validation Summary: How to Use Microsoft Entra Verified ID

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra Verified ID
- Microsoft Entra ID
- W3C Verifiable Credentials
- Decentralized Identifiers (DIDs)
- Azure Key Vault
- Azure CLI
- Node.js
- Express
- MSAL Node
- Verified ID Request Service REST API

## Sources Consulted
- Microsoft Learn: Quick Microsoft Entra Verified ID setup - https://learn.microsoft.com/en-us/entra/verified-id/verifiable-credentials-configure-tenant-quick
- Microsoft Learn: Advanced Microsoft Entra Verified ID setup - https://learn.microsoft.com/en-us/entra/verified-id/verifiable-credentials-configure-tenant
- Microsoft Learn: Rules and display definition reference - https://learn.microsoft.com/en-us/entra/verified-id/rules-and-display-definitions-model
- Microsoft Learn: Request Service REST API issuance specification - https://learn.microsoft.com/en-us/entra/verified-id/issuance-request-api
- Microsoft Learn: Call the Request Service REST API - https://learn.microsoft.com/en-us/entra/verified-id/get-started-request-api
- Microsoft Learn: Azure CLI `az keyvault` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Express documentation: `express.json()` middleware - https://expressjs.com/en/api.html#express.json

## Issues Found
- The prerequisites incorrectly required Microsoft Entra ID P1 or P2 and Global Administrator. Current Microsoft documentation lists Microsoft Entra ID Free support and recommends Authentication Policy Administrator, with Application Administrator needed for app registration tasks. Updated the prerequisite bullets.
- The Azure Key Vault example enabled Azure RBAC authorization and used an RBAC role assignment. Current Microsoft Verified ID advanced setup requires the Vault access policy permission model for the Key Vault. Updated the CLI example to create the vault with access policies and grant key permissions with `az keyvault set-policy`.
- The display definition snippet used JavaScript-style comments inside a `json` block and represented `claims` as an object. Microsoft's display definition model requires valid JSON and a `claims` array of objects with `claim`, `label`, and `type`. Removed comments and corrected the schema.
- The rules definition snippet used JavaScript-style comments inside a `json` block and had an `inputClaim` mismatch with the issuance request. Removed comments and aligned the `idTokenHints` mapping with the claims supplied by the issuance API request.
- The Express sample used `req.body` without registering JSON body parsing middleware. Added `app.use(express.json());`.

## Review Notes
The Request Service API endpoint, application scope `3db474b9-6a0c-4840-96ac-1fceb342124f/.default`, issuance and presentation request shapes, `validityInterval` semantics, and DID/domain explanation are consistent with current Microsoft documentation. The local environment did not have Azure CLI installed, so Azure CLI behavior was checked against Microsoft Learn instead of local `az --help`.
