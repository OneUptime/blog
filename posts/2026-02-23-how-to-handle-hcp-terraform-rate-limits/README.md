# How to Handle HCP Terraform Rate Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Rate Limits, API, Performance Optimization

Description: Understand HCP Terraform API rate limits, how to detect when you hit them, and strategies for building resilient automation.

---

If you build automation around the HCP Terraform API - CI/CD pipelines, custom tooling, monitoring scripts - you will eventually hit rate limits. HCP Terraform enforces rate limits to protect the platform and ensure fair usage. Knowing these limits, detecting when you are approaching them, and building retry logic into your tools is essential for reliable automation.

## Understanding HCP Terraform Rate Limits

HCP Terraform uses rate limiting on its API to prevent abuse and ensure all customers get fair access. The limits apply per API token and vary by endpoint.

The general rate limit for most API endpoints is 30 requests per second. Some endpoints have lower limits, particularly those that trigger heavy operations like creating runs or uploading configuration versions.

When you exceed the limit, the API returns a `429 Too Many Requests` response with headers telling you when you can retry.

## Detecting Rate Limits

Rate limit information comes in the HTTP response headers:

```bash
# Make an API call and inspect rate limit headers
curl -s -D- \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces" 2>&1 | \
  grep -i "x-ratelimit\|retry-after"

# Look for these headers:
# X-RateLimit-Limit: 30        (max requests per second)
# X-RateLimit-Remaining: 28    (remaining requests in current window)
# X-RateLimit-Reset: 1677000000 (Unix timestamp when limit resets)
```

When you hit the limit, the response looks like this:

```bash
# 429 response
# HTTP/1.1 429 Too Many Requests
# Retry-After: 1
# Content-Type: application/vnd.api+json
#
# {
#   "errors": [
#     {
#       "status": "429",
#       "title": "too many requests"
#     }
#   ]
# }
```

## Building Retry Logic

Any automation that calls the HCP Terraform API should handle rate limits gracefully. Here is a robust retry function:

```bash
#!/bin/bash
# api-call-with-retry.sh
# Makes an API call with exponential backoff on rate limits

api_call() {
  local url=$1
  local method=${2:-GET}
  local data=${3:-}
  local max_retries=5
  local retry=0
  local backoff=1

  while [ $retry -lt $max_retries ]; do
    if [ -n "$data" ]; then
      RESPONSE=$(curl -s -w "\n%{http_code}" \
        --request "$method" \
        --header "Authorization: Bearer $TF_TOKEN" \
        --header "Content-Type: application/vnd.api+json" \
        --data "$data" \
        "$url")
    else
      RESPONSE=$(curl -s -w "\n%{http_code}" \
        --header "Authorization: Bearer $TF_TOKEN" \
        --header "Content-Type: application/vnd.api+json" \
        "$url")
    fi

    # Extract HTTP status code (last line)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "429" ]; then
      # Rate limited - back off and retry
      retry=$((retry + 1))
      echo "Rate limited. Retrying in ${backoff}s (attempt $retry/$max_retries)" >&2
      sleep $backoff
      backoff=$((backoff * 2))  # Exponential backoff
    elif [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
      # Success
      echo "$BODY"
      return 0
    else
      # Other error
      echo "Error: HTTP $HTTP_CODE" >&2
      echo "$BODY" >&2
      return 1
    fi
  done

  echo "Max retries exceeded" >&2
  return 1
}

# Usage
api_call "https://app.terraform.io/api/v2/organizations/my-org/workspaces"
```

## Python Implementation with Retry

If you are building tools in Python, use a library like `requests` with retry logic:

```python
# tfc_client.py
import time
import requests

class TFCClient:
    def __init__(self, token, base_url="https://app.terraform.io/api/v2"):
        self.token = token
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.api+json"
        })

    def _request(self, method, path, data=None, max_retries=5):
        """Make an API request with rate limit handling."""
        url = f"{self.base_url}/{path}"
        backoff = 1

        for attempt in range(max_retries):
            response = self.session.request(method, url, json=data)

            if response.status_code == 429:
                # Rate limited - use Retry-After header if available
                retry_after = int(response.headers.get("Retry-After", backoff))
                print(f"Rate limited. Waiting {retry_after}s (attempt {attempt + 1})")
                time.sleep(retry_after)
                backoff *= 2
                continue

            response.raise_for_status()
            return response.json()

        raise Exception("Max retries exceeded due to rate limiting")

    def list_workspaces(self, org):
        """List all workspaces in an organization."""
        return self._request("GET", f"organizations/{org}/workspaces")

    def get_run(self, run_id):
        """Get details for a specific run."""
        return self._request("GET", f"runs/{run_id}")

    def create_run(self, workspace_id, message="API-triggered run"):
        """Create a new run."""
        data = {
            "data": {
                "type": "runs",
                "attributes": {"message": message},
                "relationships": {
                    "workspace": {
                        "data": {"type": "workspaces", "id": workspace_id}
                    }
                }
            }
        }
        return self._request("POST", "runs", data=data)


# Usage
client = TFCClient(token="your-api-token")
workspaces = client.list_workspaces("my-org")
```

## Common Rate Limit Scenarios

### Scenario 1: Bulk Workspace Updates

Updating variables or settings across many workspaces:

```bash
#!/bin/bash
# bulk-update.sh
# Update a variable across many workspaces with rate limit handling

WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces?page%5Bsize%5D=100" | \
  jq -r '.data[].id')

for WS_ID in $WORKSPACES; do
  # Add a small delay between requests to avoid rate limits
  sleep 0.1

  curl -s \
    --request POST \
    --header "Authorization: Bearer $TF_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --data '{
      "data": {
        "type": "vars",
        "attributes": {
          "key": "TF_LOG",
          "value": "",
          "category": "env"
        }
      }
    }' \
    "https://app.terraform.io/api/v2/workspaces/$WS_ID/vars" > /dev/null

  echo "Updated $WS_ID"
done
```

### Scenario 2: Polling for Run Status

Checking run status in a loop:

```bash
#!/bin/bash
# wait-for-run.sh
# Poll for run completion with appropriate intervals

RUN_ID=$1
POLL_INTERVAL=5  # Start with 5 seconds between checks

while true; do
  STATUS=$(curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/runs/$RUN_ID" | \
    jq -r '.data.attributes.status')

  echo "Run status: $STATUS"

  case $STATUS in
    applied|planned_and_finished|discarded|errored|canceled|force_canceled)
      echo "Run completed with status: $STATUS"
      break
      ;;
    *)
      # Still in progress - wait before checking again
      sleep $POLL_INTERVAL
      ;;
  esac
done
```

Do not poll more frequently than every 3-5 seconds. Aggressive polling wastes API calls and pushes you toward rate limits.

### Scenario 3: Paginated List Operations

When fetching large lists, handle pagination without overwhelming the API:

```bash
#!/bin/bash
# paginated-fetch.sh
# Fetch all workspaces with pagination and rate limit awareness

ORG="my-org"
PAGE=1
ALL_WORKSPACES=""

while true; do
  RESPONSE=$(curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/organizations/$ORG/workspaces?page%5Bnumber%5D=$PAGE&page%5Bsize%5D=100")

  # Extract workspace names
  NAMES=$(echo "$RESPONSE" | jq -r '.data[].attributes.name')
  ALL_WORKSPACES="$ALL_WORKSPACES\n$NAMES"

  # Check if there are more pages
  NEXT=$(echo "$RESPONSE" | jq -r '.meta.pagination["next-page"]')
  if [ "$NEXT" = "null" ]; then
    break
  fi

  PAGE=$NEXT
  # Small delay between pages
  sleep 0.2
done

echo -e "$ALL_WORKSPACES" | sort
```

## Strategies to Reduce API Calls

Minimize your API usage to stay well under limits:

- **Cache responses** when data does not change frequently (workspace lists, variable sets)
- **Use webhooks** instead of polling for run status changes
- **Batch operations** where possible
- **Use page sizes** of 100 (the maximum) to reduce pagination requests
- **Avoid redundant calls** - check if the state you want already exists before making changes

```bash
# Use webhook notifications instead of polling
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "notification-configurations",
      "attributes": {
        "destination-type": "generic",
        "enabled": true,
        "name": "run-status-webhook",
        "url": "https://my-app.example.com/webhook/terraform",
        "triggers": ["run:completed", "run:errored"]
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/notification-configurations"
```

## Monitoring Rate Limit Usage

Track your rate limit consumption to stay ahead of problems:

```bash
#!/bin/bash
# rate-limit-check.sh
# Check current rate limit status

RESPONSE=$(curl -s -D /tmp/headers \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/my-org")

LIMIT=$(grep -i "x-ratelimit-limit" /tmp/headers | awk '{print $2}' | tr -d '\r')
REMAINING=$(grep -i "x-ratelimit-remaining" /tmp/headers | awk '{print $2}' | tr -d '\r')

echo "Rate limit: $REMAINING / $LIMIT remaining"

if [ "${REMAINING:-0}" -lt 5 ]; then
  echo "WARNING: Running low on API rate limit"
fi
```

## Summary

Rate limits in HCP Terraform exist to protect the platform and all its users. Build your automation with retry logic and exponential backoff from the start. Add small delays between bulk operations, use webhooks instead of polling, and cache responses where possible. These practices make your tooling resilient and ensure you stay well within the API's limits even as your automation scales.
