# How to Call External HTTP APIs from Google Cloud Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, HTTP APIs, Integration, REST APIs

Description: Learn how to call external HTTP APIs from Google Cloud Workflows, including authentication, header management, response parsing, and error handling for third-party services.

---

Cloud Workflows is not limited to calling Google Cloud services. You can call any HTTP endpoint - third-party APIs, SaaS webhooks, internal services, or public APIs. This makes Workflows a versatile orchestration tool that can coordinate across your entire tech stack, not just within GCP.

In this guide, I will cover how to make HTTP calls to external APIs, handle authentication, parse responses, and deal with the quirks of real-world APIs.

## Making Basic HTTP Calls

The `http.get` and `http.post` built-in functions handle HTTP requests.

```yaml
# basic-http-calls.yaml
main:
  steps:
    # Simple GET request to a public API
    - get_request:
        call: http.get
        args:
          url: https://jsonplaceholder.typicode.com/posts/1
        result: get_response

    # POST request with a JSON body
    - post_request:
        call: http.post
        args:
          url: https://jsonplaceholder.typicode.com/posts
          body:
            title: "New Post"
            body: "This is the content"
            userId: 1
          headers:
            Content-Type: "application/json"
        result: post_response

    # PUT request for updates
    - put_request:
        call: http.put
        args:
          url: https://jsonplaceholder.typicode.com/posts/1
          body:
            title: "Updated Post"
            body: "Updated content"
          headers:
            Content-Type: "application/json"
        result: put_response

    # DELETE request
    - delete_request:
        call: http.delete
        args:
          url: https://jsonplaceholder.typicode.com/posts/1
        result: delete_response

    - return_results:
        return:
          get_status: ${get_response.code}
          post_id: ${post_response.body.id}
          put_status: ${put_response.code}
          delete_status: ${delete_response.code}
```

## Authentication Methods

Different APIs use different authentication methods. Here are the most common patterns.

### API Key in Header

```yaml
# api-key-auth.yaml
main:
  steps:
    - call_with_api_key:
        call: http.get
        args:
          url: https://api.weatherapi.com/v1/current.json
          query:
            q: "London"
          headers:
            # Pass the API key in a header
            X-API-Key: "your-api-key-here"
        result: weather

    - return_weather:
        return: ${weather.body}
```

### API Key in Query Parameter

```yaml
main:
  steps:
    - call_with_query_key:
        call: http.get
        args:
          url: https://api.openweathermap.org/data/2.5/weather
          query:
            q: "London"
            appid: "your-api-key-here"
            units: "metric"
        result: weather

    - return_temp:
        return:
          city: ${weather.body.name}
          temperature: ${weather.body.main.temp}
```

### Bearer Token Authentication

```yaml
main:
  steps:
    - call_with_bearer_token:
        call: http.get
        args:
          url: https://api.github.com/user/repos
          headers:
            Authorization: "Bearer ghp_your_token_here"
            Accept: "application/vnd.github.v3+json"
            User-Agent: "CloudWorkflow"
        result: repos

    - return_repos:
        return:
          count: ${len(repos.body)}
```

### Basic Authentication

```yaml
main:
  steps:
    - call_with_basic_auth:
        call: http.get
        args:
          url: https://api.example.com/protected/resource
          headers:
            # Base64 encoded username:password
            Authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ="
        result: protected_data

    - return_data:
        return: ${protected_data.body}
```

### OAuth2 Token Flow

For APIs that require OAuth2, first get a token, then use it.

```yaml
# oauth2-flow.yaml
main:
  steps:
    # Step 1: Get an access token
    - get_token:
        call: http.post
        args:
          url: https://auth.example.com/oauth/token
          body:
            grant_type: "client_credentials"
            client_id: "your-client-id"
            client_secret: "your-client-secret"
            scope: "read:data"
          headers:
            Content-Type: "application/x-www-form-urlencoded"
        result: token_response

    - extract_token:
        assign:
          - access_token: ${token_response.body.access_token}

    # Step 2: Use the token to call the API
    - call_api:
        call: http.get
        args:
          url: https://api.example.com/data
          headers:
            Authorization: ${"Bearer " + access_token}
        result: api_response

    - return_data:
        return: ${api_response.body}
```

## Using Secrets Manager for API Keys

Never hardcode API keys in your workflow definition. Use Secret Manager instead.

```yaml
# secrets-workflow.yaml
main:
  steps:
    # Fetch the API key from Secret Manager
    - get_api_key:
        call: googleapis.secretmanager.v1.projects.secrets.versions.accessString
        args:
          secret_id: "external-api-key"
          project_id: "my-gcp-project"
        result: api_key

    # Use the secret in the API call
    - call_external_api:
        call: http.get
        args:
          url: https://api.example.com/data
          headers:
            X-API-Key: ${api_key}
        result: api_response

    - return_data:
        return: ${api_response.body}
```

## Handling Query Parameters

Use the `query` parameter to cleanly pass URL query parameters.

```yaml
main:
  params: [args]
  steps:
    - search_api:
        call: http.get
        args:
          url: https://api.example.com/search
          query:
            q: ${args.search_term}
            page: ${args.page}
            per_page: 20
            sort: "relevance"
            order: "desc"
        result: search_results

    - return_results:
        return:
          total: ${search_results.body.total_count}
          items: ${search_results.body.items}
```

## Parsing Different Response Formats

Most APIs return JSON, but you may encounter other formats.

```yaml
main:
  steps:
    # JSON response - body is automatically parsed
    - json_api:
        call: http.get
        args:
          url: https://api.example.com/data.json
        result: json_response
    # Access fields directly: ${json_response.body.field_name}

    # Response with nested data
    - nested_data:
        assign:
          - items: ${json_response.body.data.items}
          - total: ${json_response.body.data.pagination.total}
          - first_item_name: ${json_response.body.data.items[0].name}

    # Handle response headers
    - check_headers:
        assign:
          - rate_limit_remaining: ${json_response.headers["X-RateLimit-Remaining"]}
          - content_type: ${json_response.headers["Content-Type"]}

    - return_parsed:
        return:
          items: ${items}
          total: ${total}
          rate_limit: ${rate_limit_remaining}
```

## Calling Paginated APIs

Many APIs return results in pages. Loop through them to collect all data.

```yaml
# paginated-api.yaml
main:
  steps:
    - init:
        assign:
          - all_items: []
          - current_page: 1
          - has_more: true

    - fetch_pages:
        for:
          value: page_num
          range: [1, 100]  # Safety limit - max 100 pages
          steps:
            - check_done:
                switch:
                  - condition: ${not(has_more)}
                    next: break

            - fetch_page:
                call: http.get
                args:
                  url: https://api.example.com/items
                  query:
                    page: ${current_page}
                    per_page: 50
                  headers:
                    Authorization: "Bearer token-here"
                result: page_response

            - collect_items:
                assign:
                  - all_items: ${list.concat(all_items, page_response.body.items)}
                  - has_more: ${page_response.body.has_next_page}
                  - current_page: ${current_page + 1}

            - log_progress:
                call: sys.log
                args:
                  text: ${"Fetched page " + string(current_page - 1) + ", total items: " + string(len(all_items))}

    - return_all:
        return:
          total_items: ${len(all_items)}
          items: ${all_items}
```

## Handling Rate Limits

External APIs often have rate limits. Build rate limit handling into your workflow.

```yaml
# rate-limit-handling.yaml
main:
  steps:
    - init:
        assign:
          - items_to_process: ["item1", "item2", "item3", "item4", "item5"]
          - results: []

    - process_with_rate_limiting:
        for:
          value: item
          in: ${items_to_process}
          steps:
            - call_api:
                try:
                  call: http.post
                  args:
                    url: https://api.example.com/process
                    body:
                      item: ${item}
                    headers:
                      Authorization: "Bearer token-here"
                  result: api_result
                except:
                  as: e
                  steps:
                    - check_rate_limit:
                        switch:
                          # 429 means we hit the rate limit
                          - condition: ${e.code == 429}
                            steps:
                              - wait_for_reset:
                                  call: sys.sleep
                                  args:
                                    seconds: 60  # Wait a minute
                              - retry_after_wait:
                                  call: http.post
                                  args:
                                    url: https://api.example.com/process
                                    body:
                                      item: ${item}
                                    headers:
                                      Authorization: "Bearer token-here"
                                  result: api_result
                          - condition: true
                            raise: ${e}

            - save_result:
                assign:
                  - results: ${list.concat(results, api_result.body)}

            # Add a small delay between requests to stay under rate limits
            - throttle:
                call: sys.sleep
                args:
                  seconds: 0.5

    - done:
        return:
          processed: ${len(results)}
          results: ${results}
```

## Calling Webhook APIs

Send data to webhook endpoints like Slack, PagerDuty, or custom integrations.

```yaml
# webhook-calls.yaml
main:
  params: [args]
  steps:
    # Send to Slack
    - notify_slack:
        call: http.post
        args:
          url: https://hooks.slack.com/services/T00/B00/xxx
          body:
            text: ${args.message}
            channel: "#alerts"
            username: "Workflow Bot"
        result: slack_result

    # Send to a custom webhook
    - send_webhook:
        call: http.post
        args:
          url: https://myapp.example.com/webhooks/workflow-complete
          body:
            event: "workflow_complete"
            timestamp: ${time.format(sys.now())}
            data: ${args.payload}
          headers:
            Content-Type: "application/json"
            X-Webhook-Secret: "shared-secret-here"
        result: webhook_result

    - done:
        return:
          slack_sent: ${slack_result.code == 200}
          webhook_sent: ${webhook_result.code == 200}
```

## Setting Timeouts

Always set appropriate timeouts for external API calls. The default might be too long or too short for your use case.

```yaml
main:
  steps:
    - quick_api:
        call: http.get
        args:
          url: https://fast-api.example.com/lookup
          timeout: 10  # 10 seconds - should be fast

    - slow_api:
        call: http.post
        args:
          url: https://slow-api.example.com/generate-report
          body:
            report_type: "annual"
          timeout: 300  # 5 minutes - this API is slow
```

## Wrapping Up

Calling external HTTP APIs from Cloud Workflows is straightforward once you know the patterns. Use the appropriate authentication method for each API, store secrets in Secret Manager instead of hardcoding them, handle rate limits and pagination gracefully, and always set explicit timeouts. The combination of HTTP calls, error handling, and retry logic gives you everything you need to integrate any REST API into your workflow pipeline. The key is treating external APIs as unreliable by default - always wrap calls in try/except, implement retries for transient errors, and have a fallback plan for when services are down.
