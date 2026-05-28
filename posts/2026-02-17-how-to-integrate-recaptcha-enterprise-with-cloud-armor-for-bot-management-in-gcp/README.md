# How to Integrate reCAPTCHA Enterprise with Cloud Armor for Bot Management in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, ReCAPTCHA Enterprise, Bot Management, Security

Description: Learn how to integrate Google reCAPTCHA Enterprise with Cloud Armor to build a robust bot management layer that protects your web applications from automated threats.

---

Bot traffic is a growing problem. Whether it is credential stuffing, scraping, or inventory hoarding, bots can chew through your infrastructure and damage your business. Google Cloud offers a powerful combination for dealing with this: reCAPTCHA Enterprise paired with Cloud Armor. Together, they let you assess incoming traffic risk and enforce policies at the edge, before requests even hit your backend.

In this guide, I will walk through the full integration - from setting up reCAPTCHA Enterprise to creating Cloud Armor security policies that use reCAPTCHA scores to make allow/deny decisions.

## Why Combine reCAPTCHA Enterprise with Cloud Armor?

reCAPTCHA Enterprise on its own gives you a risk score for each request. But acting on that score still requires application-level logic. Cloud Armor moves that enforcement to the load balancer layer, meaning you can block or throttle suspicious traffic before it reaches your services at all.

The integration works like this:

1. reCAPTCHA Enterprise generates tokens on the client side
2. The token is attached to requests as a cookie or header
3. Cloud Armor evaluates the token before forwarding the request and extracts the score
4. Based on the score, Cloud Armor applies your security policy (allow, deny, throttle, or redirect)

This is particularly useful for protecting login pages, checkout flows, and API endpoints that are common targets for automated abuse.

## Prerequisites

Before starting, make sure you have:

- A GCP project with billing enabled
- An external HTTP(S) load balancer already configured
- The reCAPTCHA Enterprise API enabled
- Cloud Armor enabled on your project
- `gcloud` CLI installed and authenticated

## Step 1: Create a reCAPTCHA Enterprise Key

First, create a reCAPTCHA Enterprise site key. You can use either a session token key or an action token key. Session tokens are good for continuous assessment, while action tokens are tied to specific user actions like form submissions.

Here is how to create a session token site key using gcloud:

```bash
# Create a reCAPTCHA Enterprise session token site key

gcloud recaptcha keys create \
  --display-name="cloud-armor-integration" \
  --web \
  --integration-type=score \
  --domains="yourdomain.com" \
  --waf-feature=session-token \
  --waf-service=ca \
  --project=your-project-id
```

Note the key ID that is returned. You will need it in the next steps.

## Step 2: Add the reCAPTCHA JavaScript to Your Frontend

You need to embed the reCAPTCHA Enterprise JavaScript on your web pages. This script generates tokens that Cloud Armor will later evaluate.

Add this script tag to your HTML pages:

```html
<!-- Load the reCAPTCHA Enterprise script with your site key -->
<script
  src="https://www.google.com/recaptcha/enterprise.js?render=YOUR_SITE_KEY&waf=session"
  async
  defer>
</script>
```

The reCAPTCHA JavaScript sets and refreshes the `recaptcha-ca-t` session-token cookie. The token gets sent along with subsequent requests, and Cloud Armor can inspect it at the edge.

## Step 3: Create a Cloud Armor Security Policy

Now create a Cloud Armor security policy that will evaluate reCAPTCHA tokens.

```bash
# Create a new Cloud Armor security policy
gcloud compute security-policies create recaptcha-bot-policy \
  --description="Bot management policy using reCAPTCHA Enterprise" \
  --project=your-project-id
```

## Step 4: Associate a Challenge Key with the Security Policy

If you want Cloud Armor to redirect missing or invalid tokens to a reCAPTCHA challenge page, create a separate challenge-page key:

```bash
# Create a reCAPTCHA Enterprise challenge-page key for redirects
gcloud recaptcha keys create \
  --display-name="cloud-armor-challenge" \
  --web \
  --integration-type=invisible \
  --allow-all-domains \
  --waf-feature=challenge-page \
  --waf-service=ca \
  --project=your-project-id
```

Then associate the challenge-page key with the Cloud Armor security policy:

```bash
# Update the security policy to use the reCAPTCHA options
gcloud compute security-policies update recaptcha-bot-policy \
  --recaptcha-redirect-site-key=YOUR_CHALLENGE_PAGE_SITE_KEY \
  --project=your-project-id
```

## Step 5: Add Score-Based Rules

This is where the real power comes in. You can create rules that take different actions based on the reCAPTCHA score. Scores range from 0.0 (very likely a bot) to 1.0 (very likely a human).

```bash
# Block traffic with very low reCAPTCHA scores (likely bots)
gcloud compute security-policies rules create 1000 \
  --security-policy=recaptcha-bot-policy \
  --expression="token.recaptcha_session.score < 0.2" \
  --recaptcha-session-site-keys=YOUR_SESSION_TOKEN_SITE_KEY \
  --action=deny-403 \
  --description="Block requests with very low reCAPTCHA scores"

# Throttle traffic with medium-low scores (suspicious)
gcloud compute security-policies rules create 2000 \
  --security-policy=recaptcha-bot-policy \
  --expression="token.recaptcha_session.score < 0.5" \
  --recaptcha-session-site-keys=YOUR_SESSION_TOKEN_SITE_KEY \
  --action=throttle \
  --rate-limit-threshold-count=10 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --description="Rate limit suspicious traffic with medium-low scores"

# Allow traffic with high scores (likely human)
gcloud compute security-policies rules create 3000 \
  --security-policy=recaptcha-bot-policy \
  --expression="token.recaptcha_session.score >= 0.5" \
  --recaptcha-session-site-keys=YOUR_SESSION_TOKEN_SITE_KEY \
  --action=allow \
  --description="Allow traffic with acceptable reCAPTCHA scores"
```

## Step 6: Attach the Policy to Your Backend Service

Apply the security policy to the backend service behind your load balancer:

```bash
# Attach the security policy to your backend service
gcloud compute backend-services update your-backend-service \
  --security-policy=recaptcha-bot-policy \
  --global \
  --project=your-project-id
```

## Step 7: Handle Token Expiry and Redirect Challenges

reCAPTCHA tokens expire after a short period. For cases where a token is missing or expired, you can configure Cloud Armor to redirect the user to a reCAPTCHA challenge page instead of outright blocking them.

```bash
# Redirect requests without valid tokens to a challenge page
gcloud compute security-policies rules create 500 \
  --security-policy=recaptcha-bot-policy \
  --expression="!token.recaptcha_session.valid" \
  --recaptcha-session-site-keys=YOUR_SESSION_TOKEN_SITE_KEY \
  --action=redirect \
  --redirect-type=google-recaptcha \
  --description="Redirect requests without reCAPTCHA tokens to challenge"
```

This is a better user experience than a hard block because legitimate users who happen to be missing a token (perhaps due to JavaScript not loading) get a chance to prove they are human.

## Monitoring and Tuning

Once the integration is live, monitor the results in Cloud Logging and the Cloud Armor dashboard:

```bash
# View Cloud Armor logs to see reCAPTCHA scores and actions taken
gcloud logging read \
  'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="recaptcha-bot-policy"' \
  --project=your-project-id \
  --limit=50 \
  --format=json
```

Pay attention to the distribution of scores. If you are seeing too many false positives (legitimate users getting blocked), raise the threshold. If bots are getting through, lower it. Most teams start with a block threshold around 0.2 and adjust from there.

You can also use the reCAPTCHA Enterprise dashboard in the Cloud Console to see score distributions, top actions, and overall assessment volumes.

## Combining with Other Cloud Armor Features

The reCAPTCHA integration works alongside other Cloud Armor features. You can combine it with:

- **IP-based rules** to always allow known good IPs regardless of score
- **Geographic restrictions** to block traffic from regions you do not serve
- **Rate limiting** as a secondary defense layer
- **Preconfigured WAF rules** to catch common web attacks like SQL injection

For example, you might allow traffic from your office IP without a reCAPTCHA check while requiring all other traffic to pass the score evaluation.

## Common Pitfalls

A few things to watch out for during integration:

- Make sure the reCAPTCHA script loads before the user submits the form, otherwise the token will be missing
- Session tokens are valid for 30 minutes by default, and reCAPTCHA refreshes them periodically while the JavaScript remains active on the page
- If you use a CDN in front of your load balancer, verify that the token header or cookie is being forwarded properly
- Test with both Chrome and non-Chrome browsers, as reCAPTCHA behavior can vary slightly

## Wrapping Up

Integrating reCAPTCHA Enterprise with Cloud Armor gives you a layered defense against bot traffic that operates at the network edge. The combination of client-side risk assessment and server-side enforcement is hard to beat. You get granular control over how aggressive your bot management is, and you can tune it over time as you see real traffic patterns. For any application exposed to the public internet, this is one of the most effective bot management setups available on GCP.
