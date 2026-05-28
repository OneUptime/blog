# Validation Summary: How to Integrate reCAPTCHA Enterprise with Google Cloud Armor for Bot Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Armor
- reCAPTCHA Enterprise / Google Cloud Fraud Defense
- Google Cloud CLI
- Terraform Google provider
- HTTP(S) load balancing
- Cloud Logging

## Sources Consulted
- Google Cloud reCAPTCHA docs: Integrate with Google Cloud Armor for websites: https://docs.cloud.google.com/recaptcha/docs/implement-waf-ca
- Google Cloud reCAPTCHA docs: Features for integration with Google Cloud Armor: https://docs.cloud.google.com/recaptcha/docs/features-ca
- Google Cloud reCAPTCHA docs: reCAPTCHA token attributes for Google Cloud Armor: https://docs.cloud.google.com/recaptcha/docs/token-attr-ca
- Google Cloud Armor docs: Bot management overview: https://docs.cloud.google.com/armor/docs/bot-management
- Google Cloud Armor docs: Configure bot management: https://docs.cloud.google.com/armor/docs/configure-bot-management
- Google Cloud Armor docs: Rules language reference: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor docs: Request logging: https://cloud.google.com/armor/docs/request-logging
- Google Cloud SDK reference: gcloud recaptcha keys create: https://cloud.google.com/sdk/gcloud/reference/recaptcha/keys/create
- Terraform Registry: google_recaptcha_enterprise_key: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/recaptcha_enterprise_key
- Terraform Registry: google_compute_security_policy: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_security_policy

## Issues Found
- The sequence diagram showed Cloud Armor calling reCAPTCHA for each token assessment. Updated it to show Cloud Armor decoding token attributes inline, matching Google Cloud Armor's documented behavior.
- The prerequisite IAM role named "Cloud Armor Admin" was not the documented role for these operations. Updated the prerequisites to use Compute Security Admin, Compute Network Admin, and reCAPTCHA Enterprise Admin.
- The `gcloud recaptcha keys create` example used API enum-style values such as `SESSION_TOKEN` and `CA`. Updated the CLI examples and explanation to use the current `gcloud` values: `session-token`, `action-token`, `challenge-page`, and `ca`.
- The action-token frontend example reused the session-token script URL and site key placeholder. Updated it to use an action-token key and the documented `X-Recaptcha-Token` request header flow.
- The post associated a session-token key with `--recaptcha-redirect-site-key`. Updated it to use a separate challenge-page key for redirect challenges and clarified that session/action keys are associated with rules that evaluate tokens.
- The Cloud Armor rules used the incorrect `recaptcha.score` and `recaptcha.action` fields. Updated them to the documented Cloud Armor attributes: `token.recaptcha_session.score`, `token.recaptcha_action.score`, and `token.recaptcha_action.action`.
- Added `--recaptcha-session-site-keys` and `--recaptcha-action-site-keys` to the rule examples so Cloud Armor validates tokens against the intended reCAPTCHA keys.
- The redirect examples used `GOOGLE_RECAPTCHA` as a `gcloud` redirect type. Updated CLI examples to use the documented `google-recaptcha` value.
- The challenge description said users receive a new token with a higher score after passing the challenge. Updated it to explain that successful assessment issues a reCAPTCHA exemption cookie.
- The Terraform example used the session-token key as `redirect_site_key` and referenced the key `.id`. Added a separate challenge-page key, used its `.name` for `redirect_site_key`, and added `session_token_site_keys` under `expr_options`.
- The logging section referenced reCAPTCHA fields at the top level. Updated it to reference `securityPolicyRequestData.recaptchaActionToken` and `securityPolicyRequestData.recaptchaSessionToken`.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference rather than local `--help` output. The examples are technically aligned with current documentation, but production policies should usually add explicit handling for missing or invalid reCAPTCHA tokens before a default allow rule.
