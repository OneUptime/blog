# Validation Summary: How to Set Up a Free Status Page in 10 Minutes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OneUptime Status Pages
- OneUptime public status page API
- OneUptime status page subscribers
- OneUptime private status pages, SSO, and SCIM
- OneUptime self-hosting with Docker Compose
- DNS CNAME records for custom domains
- curl

## Sources Consulted
- OneUptime Pricing Plans: https://oneuptime.com/pricing
- OneUptime Status Page product page: https://oneuptime.com/product/status-page
- OneUptime Public Status Page API documentation: https://oneuptime.com/docs/status-pages/public-api
- OneUptime Docker Compose installation documentation: https://oneuptime.com/docs/installation/docker-compose
- OneUptime Status Page API reference: https://oneuptime.com/reference/status-page
- OneUptime Status Page Subscriber API reference: https://oneuptime.com/reference/status-page-subscriber
- OneUptime Status Page Domain API reference: https://oneuptime.com/reference/en/status-page-domain
- OneUptime Status Page Group API reference: https://oneuptime.com/reference/status-page-group
- OneUptime Status Page SSO API reference: https://oneuptime.com/reference/status-page-s-s-o
- OneUptime SCIM documentation: https://oneuptime.com/docs/identity/scim
- Local Docker Compose CLI check: `docker compose version`

## Issues Found
- The account creation step referred to clicking "Start Free Trial." Current OneUptime pricing and product pages use "Get Started" / "Get started free" for the free plan, while "Free 14 day trial" applies to paid plans. Changed the instruction to click "Get Started."
- The free tier was described generally as including status pages. Current pricing specifies 1 public status page and 100 subscribers on the free plan. Updated the sentence to state those limits.
- The post listed optional custom domain support without noting plan limits. Current pricing separates free status page limits from paid custom-domain/private-page capabilities. Added "depending on your plan" wording and a short note under Custom Domains.
- The private status page section did not mention that private status page features are paid-plan features. Updated the introduction to that section to avoid implying private pages are included in the free plan.
- The SSO section said "SAML or OAuth." The OneUptime Status Page SSO reference documents SAML 2.0 configuration. Changed the instruction to "SAML 2.0."
- The self-hosting example used `git clone https://github.com/OneUptime/oneuptime`, then `docker-compose up -d`. The official Docker Compose installation docs use the `release` branch, copying `config.example.env` to `config.env`, editing secrets, and running `npm start` or `docker compose`. Replaced the snippet with the documented `release` branch clone, config copy, secret edit note, and `npm start`.

## Review Notes
The public status page API `curl -X POST https://oneuptime.com/status-page-api/.../:statusPageId` examples match the official OneUptime public API documentation. The local environment has modern `docker compose` available, while the legacy `docker-compose` command is not installed; the post now avoids the legacy command.
