# Validation Summary: How to Configure Custom Domains with SSL Certificates on App Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine
- Google Cloud custom domain mappings
- Google-managed SSL certificates
- Google Cloud CLI (`gcloud`)
- DNS records (`A`, `AAAA`, `CNAME`, `TXT`)
- App Engine `app.yaml`
- App Engine `dispatch.yaml`

## Sources Consulted
- Google Cloud documentation: Mapping custom domains for App Engine - https://docs.cloud.google.com/appengine/docs/standard/mapping-custom-domains
- Google Cloud documentation: Securing custom domains with SSL for App Engine - https://docs.cloud.google.com/appengine/docs/standard/securing-custom-domains-with-ssl
- Google Cloud documentation: App Engine `app.yaml` reference - https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud documentation: App Engine `dispatch.yaml` reference - https://docs.cloud.google.com/appengine/docs/standard/reference/dispatch-yaml
- Google Cloud documentation: How requests are routed in App Engine - https://docs.cloud.google.com/appengine/docs/standard/how-requests-are-routed
- Google Cloud SDK reference: `gcloud app domain-mappings` - https://docs.cloud.google.com/sdk/gcloud/reference/app/domain-mappings
- Google Cloud SDK reference: `gcloud app domain-mappings create` - https://cloud.google.com/sdk/gcloud/reference/app/domain-mappings/create
- Google Cloud SDK reference: `gcloud app domain-mappings update` - https://docs.cloud.google.com/sdk/gcloud/reference/app/domain-mappings/update
- Google Cloud App Engine Admin API reference: `ManagedCertificate.ManagementStatus` - https://docs.cloud.google.com/python/docs/reference/appengine/latest/google.cloud.appengine_admin_v1.types.ManagementStatus

## Issues Found
- Updated the default App Engine URL example to include `REGION_ID.r.appspot.com` for apps created after February 2020, while noting the older `appspot.com` form for existing apps.
- Replaced the prerequisite of Owner or Editor with the more precise App Engine Admin role or equivalent domain mapping permissions.
- Clarified that wildcard domain mappings require manual certificates because App Engine managed certificates do not support wildcard mappings.
- Corrected the managed SSL certificate issuer statement: App Engine managed certificates are signed by either Google Trust Services or Let's Encrypt, not always Let's Encrypt.
- Corrected certificate management status names from `ACTIVE` and `FAILED_PERMANENTLY` to documented App Engine status values such as `OK`, `FAILED_RETRYING_NOT_VISIBLE`, and `FAILED_PERMANENT`.
- Updated the custom certificate domain mapping command to include `--certificate-management=manual`, which is required when assigning a manual certificate ID.
- Replaced the advice to delete and recreate a mapping after `FAILED_PERMANENT` with the documented approach of fixing DNS and updating the mapping to managed SSL.
- Removed an unsupported claim that managed certificates renew about 30 days before expiration; the official documentation says renewal occurs automatically before expiration.
- Tightened DNS wording to tell readers to add the records Google provides, rather than implying optional partial record sets improve redundancy.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI validation was performed against the official Google Cloud SDK command reference instead of local `--help` output.
- The `app.yaml` and `dispatch.yaml` snippets match the current App Engine configuration references for standard environment routing and HTTPS enforcement.
