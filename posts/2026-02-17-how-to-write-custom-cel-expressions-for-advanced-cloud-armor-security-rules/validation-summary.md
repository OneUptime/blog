# Validation Summary: How to Write Custom CEL Expressions for Advanced Cloud Armor Security Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Armor
- Common Expression Language (CEL)
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- RE2 regular expressions
- reCAPTCHA token attributes

## Sources Consulted
- Google Cloud Armor custom rules language attributes: https://docs.cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor security policy overview: https://docs.cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Armor request logging: https://docs.cloud.google.com/armor/docs/request-logging
- Google Cloud Armor verbose logging: https://cloud.google.com/armor/docs/verbose-logging
- Google Cloud CLI reference for `gcloud compute security-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create

## Issues Found
- The post listed `token.recaptcha_enterprise.score`, which is not a current Cloud Armor rule attribute. I changed it to the documented `token.recaptcha_action.score` and `token.recaptcha_session.score` attributes.
- Several examples accessed optional headers without checking for presence first. I added `has()` checks for `referer` and `user-agent` where needed so the examples follow Cloud Armor's recommended header-access pattern.
- The complex API example would have needed an additional `has()` check for `content-type`, but adding it would exceed Cloud Armor's documented five-subexpression limit. I removed that content-type condition from the single-rule example so the command stays valid.
- The country examples used placeholder region codes (`XX` and `YY`) in copyable commands. I changed them to real ISO 3166-1 alpha-2 examples (`AU` and `NZ`, or `AU` for the single-region API example).
- The SQL injection regex example used awkward escaping for quotes inside a CEL string. I changed that pattern to use a double-quoted CEL string so the single quote and escaped double quote are represented correctly.
- The rule evaluation description said Cloud Armor stops evaluating once a rule matches. I narrowed that to enforced rules and stated the documented behavior as applying the highest-priority matching rule, because preview rules can continue evaluation.
- The Cloud Logging command displayed `matchedFieldValue`, which is only populated in verbose logging for requests that match preconfigured WAF rules. I changed the output fields to policy name, priority, configured action, and outcome, which are documented for normal Cloud Armor request logs.

## Review Notes
Cloud Armor supports only up to five subexpressions in a single rule, so very complex examples may need to be split into multiple rules. Preview mode is supported on rule creation with `--preview`, and the official overview also documents enabling or disabling preview later with `rules update --preview` or `--no-preview`.
