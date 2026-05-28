# Validation Summary: How to Integrate reCAPTCHA Enterprise with Cloud Armor for Bot Management in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Google Cloud Armor
- reCAPTCHA Enterprise
- Google Cloud CLI
- Cloud Logging
- HTTP(S) load balancing

## Sources Consulted
- Google Cloud Armor bot management configuration: https://docs.cloud.google.com/armor/docs/configure-bot-management
- Google Cloud Armor custom rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- reCAPTCHA integration with Google Cloud Armor for websites: https://docs.cloud.google.com/recaptcha/docs/implement-waf-ca
- reCAPTCHA token attributes for Google Cloud Armor: https://docs.cloud.google.com/recaptcha/docs/token-attr-ca
- Google Cloud CLI reference for `gcloud recaptcha keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/recaptcha/keys/create
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud Armor request logging: https://docs.cloud.google.com/armor/docs/request-logging

## Issues Found
- The original reCAPTCHA key command created a standard score key, not a Cloud Armor WAF session-token key. Added `--waf-feature=session-token` and `--waf-service=ca`.
- The frontend example manually executed reCAPTCHA and wrote a cookie, which matches neither Cloud Armor session-token guidance nor the required action-token header flow. Replaced it with the documented session-token script URL using `waf=session`.
- The post used the non-existent Cloud Armor expression path `token.recaptcha_enterprise.score`. Replaced it with `token.recaptcha_session.score` for session-token scoring.
- The post used `--recaptcha-redirect-site-key` as if it linked the score key to all Cloud Armor scoring rules. Clarified that this flag associates a separate challenge-page key for `google-recaptcha` redirects.
- The score-based Cloud Armor rules did not associate the session-token key with token validation. Added `--recaptcha-session-site-keys=YOUR_SESSION_TOKEN_SITE_KEY` to the relevant rules.
- The missing-token redirect rule checked `!has(token.recaptcha_enterprise.score)`. Replaced it with `!token.recaptcha_session.valid`, which matches the documented session-token validity attribute.
- The token expiry guidance said tokens are typically valid for a few minutes. Updated it to the documented default of 30 minutes for session tokens, with periodic refresh while the reCAPTCHA JavaScript remains active.

## Review Notes
The example remains focused on session tokens. Action tokens are also supported by Cloud Armor, but they use `token.recaptcha_action.*` attributes and the `X-Recaptcha-Token` request header, so mixing both approaches in one short tutorial would need a larger rewrite.
