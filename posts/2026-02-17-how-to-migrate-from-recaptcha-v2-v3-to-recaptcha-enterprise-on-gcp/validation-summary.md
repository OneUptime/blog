# Validation Summary: How to Migrate from reCAPTCHA v2/v3 to reCAPTCHA Enterprise on GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud reCAPTCHA / reCAPTCHA Enterprise
- reCAPTCHA Classic v2 and v3
- Google Cloud CLI (`gcloud recaptcha`)
- reCAPTCHA JavaScript API
- reCAPTCHA Enterprise Assessment API
- Python Google Cloud client library

## Sources Consulted
- Google Cloud reCAPTCHA migration guide: https://docs.cloud.google.com/recaptcha/docs/migrate-recaptcha
- Google Cloud reCAPTCHA migration overview: https://cloud.google.com/recaptcha/docs/migration-overview
- Google Cloud CLI reference for `gcloud recaptcha keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/recaptcha/keys/create
- Google Cloud CLI reference for `gcloud recaptcha keys migrate`: https://docs.cloud.google.com/sdk/gcloud/reference/recaptcha/keys/migrate
- Google Cloud guide for score-based web keys: https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages
- Google Cloud guide for checkbox web keys: https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages-with-checkbox
- Google Cloud Python create assessment sample: https://docs.cloud.google.com/recaptcha/docs/samples/recaptcha-enterprise-create-assessment
- Google Cloud REST reference for assessments and risk reasons: https://docs.cloud.google.com/recaptcha/docs/reference/rest/v1/projects.assessments

## Issues Found
- The post implied that migrating an existing Classic key always requires frontend changes and replacing `siteverify`. Google documents that migrated Classic keys can continue using existing frontend instrumentation and `siteverify`; I updated the comparison table, key migration note, and backend verification section to distinguish migrated keys from new Enterprise-style integrations.
- The `gcloud recaptcha keys create` examples used uppercase `SCORE` and `CHECKBOX` values. The current `gcloud` reference lists lowercase `score` and `checkbox`; I changed the examples accordingly.
- The score key command was described as a replacement for invisible v2. Current `gcloud` supports a separate `invisible` integration type, so I changed the score key description to v3 and added a note to use `--integration-type=invisible` when preserving invisible v2 behavior.
- The rollout and parallel comparison examples could route a token generated for one site key to the wrong backend verifier. I updated those examples to keep the frontend key and backend verifier paired, and to compare separate legacy and Enterprise tokens when new keys are used.
- The "Token format differences" troubleshooting note was too vague and implied interchangeable tokens. I replaced it with a key-pairing explanation consistent with the migration and Assessment API docs.

## Review Notes
The Python Assessment API sample is intentionally simplified and omits optional request context such as user IP address and user agent. Google samples include those fields for stronger risk analysis, so they would be useful additions in a future content improvement, but the current simplified code is technically valid for the migration concept.
