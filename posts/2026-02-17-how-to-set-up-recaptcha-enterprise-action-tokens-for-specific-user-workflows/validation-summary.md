# Validation Summary: How to Set Up reCAPTCHA Enterprise Action Tokens for Specific User Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud reCAPTCHA Enterprise
- reCAPTCHA score-based website keys
- reCAPTCHA Enterprise JavaScript API
- reCAPTCHA Enterprise Python client library
- Google Cloud CLI
- Flask

## Sources Consulted
- Google Cloud SDK reference for `gcloud recaptcha keys create`: https://cloud.google.com/sdk/gcloud/reference/recaptcha/keys/create
- Google Cloud reCAPTCHA documentation for installing score-based keys on websites: https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages
- Google Cloud reCAPTCHA documentation for creating assessments for websites: https://docs.cloud.google.com/recaptcha/docs/create-assessment-website
- Google Cloud reCAPTCHA documentation for Cloud Armor WAF action-token and session-token integrations: https://docs.cloud.google.com/recaptcha/docs/implement-waf-ca
- Google Cloud reCAPTCHA token attributes for Cloud Armor: https://docs.cloud.google.com/recaptcha/docs/token-attr-ca
- Google Cloud reCAPTCHA REST reference for `projects.assessments.annotate`: https://docs.cloud.google.com/recaptcha/docs/reference/rest/v1/projects.assessments/annotate

## Issues Found
- The post described the backend assessment flow as "action tokens," which conflicts with Google Cloud's WAF-specific "action-token" terminology. I updated the title and body language to "action-scoped tokens" and added a note distinguishing score-based backend assessments from WAF action-token keys evaluated by Cloud Armor.
- The opening comparison implied session tokens are a general backend assessment feature. I clarified that session tokens apply to WAF integrations such as Cloud Armor.
- The frontend section did not state the two-minute assessment window for tokens returned by `grecaptcha.enterprise.execute()`. I added that timing requirement.
- A frontend comment said the fallback would submit without a token, but the sample only displays an error. I corrected the comment to avoid suggesting an insecure fallback.
- The annotation example mapped labels such as `credential_stuffing`, `account_takeover`, and `spam` to unrelated annotation reason enums. I replaced the mapping with documented reason values such as `CORRECT_PASSWORD`, `INCORRECT_PASSWORD`, `PASSED_TWO_FACTOR`, `FAILED_TWO_FACTOR`, and `SOCIAL_SPAM`.

## Review Notes
The `gcloud` CLI was not installed locally, so command syntax was verified against the official Google Cloud SDK reference instead of local `--help` output. The Python backend sample uses current reCAPTCHA Enterprise client concepts and validates token validity, action, score, reasons, and assessment name in line with the official assessment examples.
