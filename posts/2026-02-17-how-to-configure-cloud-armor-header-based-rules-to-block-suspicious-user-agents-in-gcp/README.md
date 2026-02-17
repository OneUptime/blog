# How to Configure Cloud Armor Header-Based Rules to Block Suspicious User-Agents in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, User-Agent, HTTP Headers, Web Security

Description: Create Cloud Armor security rules that inspect HTTP User-Agent headers to block known malicious bots, scrapers, and vulnerability scanners from reaching your application.

---

The User-Agent header is one of the most useful signals for identifying suspicious traffic. While it can be spoofed, many bots, scrapers, and vulnerability scanners still identify themselves through distinctive User-Agent strings. Blocking these at the Cloud Armor level means they never reach your backend, saving you both compute resources and potential security headaches.

This guide shows you how to build Cloud Armor rules that inspect User-Agent headers to filter out unwanted traffic.

## Why Block Based on User-Agent?

A quick look at any web server's access logs reveals a steady stream of automated traffic. Some of it is benign (search engine crawlers), but much of it is not:

- Vulnerability scanners like Nikto, SQLMap, and Nessus
- Scraping tools like Scrapy and HTTrack
- Outdated or fake HTTP libraries making suspicious requests
- Bots with empty or obviously fake User-Agent strings

Blocking these at the edge with Cloud Armor is faster and cheaper than handling them in your application code.

## Step 1: Create a Security Policy

If you do not have one already:

```bash
# Create a Cloud Armor security policy
gcloud compute security-policies create ua-filter-policy \
  --description="Filter traffic based on User-Agent headers" \
  --project=your-project-id
```

## Step 2: Block Known Malicious User-Agents

Start by blocking well-known vulnerability scanners and attack tools:

```bash
# Block known vulnerability scanners and attack tools
gcloud compute security-policies rules create 1000 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(nikto|sqlmap|nessus|openvas|nmap|masscan|zgrab|nuclei).*')" \
  --action=deny-403 \
  --description="Block known vulnerability scanners"
```

Notice the `.lower()` call before `.matches()`. This ensures the match is case-insensitive, which is important because User-Agent strings can use any capitalization.

## Step 3: Block Scraping Tools

Block common web scraping frameworks:

```bash
# Block scraping tools and frameworks
gcloud compute security-policies rules create 1100 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(scrapy|httrack|wget|curl\\/|python-requests|go-http-client|java\\/|libwww-perl).*')" \
  --action=deny-403 \
  --description="Block common scraping tools"
```

Be thoughtful about what you block here. `curl` and `python-requests` are used by legitimate tools too. If your application has an API that partners or customers call using these libraries, you might want to exclude those paths or IP ranges:

```bash
# Block scraping tools but allow them on API paths
gcloud compute security-policies rules create 1050 \
  --security-policy=ua-filter-policy \
  --expression="request.path.matches('/api/.*')" \
  --action=allow \
  --description="Allow all traffic to API paths (checked before UA block)"

gcloud compute security-policies rules create 1100 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(scrapy|httrack|wget|python-requests).*')" \
  --action=deny-403 \
  --description="Block scraping tools on non-API paths"
```

## Step 4: Block Empty or Missing User-Agents

Legitimate browsers always send a User-Agent header. Requests without one are almost always automated:

```bash
# Block requests with no User-Agent header
gcloud compute security-policies rules create 1200 \
  --security-policy=ua-filter-policy \
  --expression="!has(request.headers['user-agent']) || request.headers['user-agent'] == ''" \
  --action=deny-403 \
  --description="Block requests without User-Agent header"
```

Be careful with this rule if your backend serves API endpoints that are called by services or scripts that might not set a User-Agent.

## Step 5: Block Outdated Browser User-Agents

Very old browser User-Agents are rarely from real users. They are typically from bots using outdated User-Agent strings:

```bash
# Block extremely outdated browser versions often used by bots
gcloud compute security-policies rules create 1300 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].matches('.*(MSIE [1-8]\\.|Chrome\\/[1-3][0-9]\\.).*')" \
  --action=deny-403 \
  --description="Block outdated browser User-Agents"
```

## Step 6: Allow Known Good Bots

Before your deny rules, add allow rules for legitimate bots you want to permit:

```bash
# Allow Google crawlers (verify with IP range separately for full protection)
gcloud compute security-policies rules create 800 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(googlebot|google-inspectiontool|bingbot|slurp).*')" \
  --action=allow \
  --description="Allow known search engine crawlers"
```

For better security, combine User-Agent matching with IP verification using named IP lists to prevent User-Agent spoofing.

## Putting It All Together

Here is a complete rule set with proper priority ordering:

```bash
# Priority 800: Allow verified good bots
gcloud compute security-policies rules create 800 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(googlebot|bingbot).*')" \
  --action=allow

# Priority 900: Allow API paths regardless of User-Agent
gcloud compute security-policies rules create 900 \
  --security-policy=ua-filter-policy \
  --expression="request.path.matches('/api/v[0-9]+/.*')" \
  --action=allow

# Priority 1000: Block vulnerability scanners
gcloud compute security-policies rules create 1000 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(nikto|sqlmap|nessus|nuclei|zgrab|masscan).*')" \
  --action=deny-403

# Priority 1100: Block scraping tools
gcloud compute security-policies rules create 1100 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(scrapy|httrack|python-requests|libwww-perl).*')" \
  --action=deny-403

# Priority 1200: Block missing User-Agent
gcloud compute security-policies rules create 1200 \
  --security-policy=ua-filter-policy \
  --expression="!has(request.headers['user-agent']) || request.headers['user-agent'] == ''" \
  --action=deny-403

# Priority 2147483647: Default allow
gcloud compute security-policies rules update 2147483647 \
  --security-policy=ua-filter-policy \
  --action=allow
```

## Monitoring and Refining

After deploying, monitor what is being blocked:

```bash
# View blocked requests and their User-Agent values
gcloud logging read \
  'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="ua-filter-policy" AND jsonPayload.enforcedSecurityPolicy.configuredAction="DENY"' \
  --project=your-project-id \
  --limit=30 \
  --format="table(timestamp, jsonPayload.enforcedSecurityPolicy.priority, httpRequest.userAgent, httpRequest.remoteIp)"
```

This output shows you exactly which rules are firing and what User-Agents triggered them. Use this to refine your rules over time.

## Dealing with User-Agent Spoofing

Sophisticated bots spoof legitimate browser User-Agents. For these, User-Agent filtering alone is not enough. Combine it with other signals:

```bash
# Suspicious: Claims to be Chrome browser but has no Accept-Language header
gcloud compute security-policies rules create 1400 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].matches('.*Chrome/.*') && !has(request.headers['accept-language'])" \
  --action=deny-403 \
  --description="Block Chrome-spoofing bots missing Accept-Language"
```

Real browsers send a set of standard headers. Bots often only set User-Agent and miss others like Accept-Language, Accept-Encoding, or Accept.

## Rate Limiting as a Complement

For bots that use legitimate User-Agents, pair header rules with rate limiting:

```bash
# Rate limit traffic from suspicious but not blocked User-Agents
gcloud compute security-policies rules create 1500 \
  --security-policy=ua-filter-policy \
  --expression="has(request.headers['user-agent']) && request.headers['user-agent'].lower().matches('.*(curl|wget|python).*')" \
  --action=throttle \
  --rate-limit-threshold-count=20 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --description="Rate limit suspicious tool User-Agents"
```

## Wrapping Up

User-Agent based filtering in Cloud Armor is a quick and effective first line of defense against automated traffic. It will not catch everything - sophisticated bots spoof their User-Agents - but it catches a surprising amount of low-effort automated traffic that would otherwise consume your backend resources. Start with blocking obvious scanners and scrapers, monitor the results, then gradually tighten the rules. Combined with rate limiting, IP-based rules, and reCAPTCHA integration, User-Agent filtering becomes part of a comprehensive bot management strategy.
