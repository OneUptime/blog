# How to Integrate OpenTelemetry Trace Links into Your Pull Request Review Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pull Requests, Code Review, CI/CD, GitHub Actions

Description: Automatically attach OpenTelemetry trace links to pull requests so reviewers can inspect real trace data alongside code changes.

Code review typically focuses on the code diff. But when a pull request changes application behavior, reviewers benefit from seeing the actual traces the changed code produces. By running integration tests that generate traces and attaching links to those traces in the PR, you give reviewers a way to verify that the instrumentation is correct and the performance is acceptable.

## The Workflow

Here is how it works:

1. A developer opens a pull request
2. CI builds the application and deploys it to a preview environment
3. Integration tests run and produce traces
4. A CI step extracts trace IDs from the test output
5. A GitHub Action posts a comment on the PR with links to the traces in Jaeger

## Setting Up the Preview Environment

Your CI pipeline needs a place to run the application with a collector and Jaeger. Docker Compose works well for this:

```yaml
# docker-compose.ci.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      OTEL_SERVICE_NAME: pr-preview
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    volumes:
      - ./ci/collector-config.yaml:/etc/otelcol/config.yaml
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

## Writing Tests That Capture Trace IDs

Your integration tests need to extract the trace ID from responses. Most instrumented servers return the trace ID in a response header (like `traceparent`) or you can parse it from the OpenTelemetry context:

```javascript
// tests/integration.test.js
const axios = require('axios');
const fs = require('fs');

const traceIds = [];

async function captureTraceId(response) {
  // Extract trace ID from the W3C traceparent header
  const traceparent = response.headers['traceparent'];
  if (traceparent) {
    // traceparent format: 00-<trace-id>-<span-id>-<flags>
    const traceId = traceparent.split('-')[1];
    traceIds.push(traceId);
  }
}

describe('API Integration Tests', () => {
  afterAll(() => {
    // Write collected trace IDs to a file for CI to pick up
    fs.writeFileSync(
      'trace-ids.json',
      JSON.stringify(traceIds, null, 2)
    );
  });

  test('GET /api/orders returns orders', async () => {
    const response = await axios.get('http://localhost:3000/api/orders');
    await captureTraceId(response);
    expect(response.status).toBe(200);
  });

  test('POST /api/orders creates an order', async () => {
    const response = await axios.post('http://localhost:3000/api/orders', {
      customer_id: 'test-123',
      items: [{ sku: 'WIDGET-1', quantity: 2 }],
    });
    await captureTraceId(response);
    expect(response.status).toBe(201);
  });

  test('GET /api/orders/:id returns order details', async () => {
    const response = await axios.get('http://localhost:3000/api/orders/test-123');
    await captureTraceId(response);
    expect(response.status).toBe(200);
  });
});
```

## The GitHub Actions Workflow

Create `.github/workflows/pr-traces.yml`:

```yaml
name: PR Integration Tests with Traces

on:
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose -f docker-compose.ci.yml up -d --build

      - name: Wait for services to be ready
        run: |
          for i in {1..30}; do
            curl -s http://localhost:3000/health && break
            sleep 2
          done

      - name: Run integration tests
        run: npm test -- --testPathPattern=integration

      - name: Wait for traces to be flushed
        run: sleep 10

      - name: Generate trace links comment
        id: traces
        run: |
          JAEGER_URL="http://localhost:16686"
          COMMENT="## Trace Links from Integration Tests\n\n"
          COMMENT+="The following traces were captured during integration tests:\n\n"

          if [ -f trace-ids.json ]; then
            for TRACE_ID in $(cat trace-ids.json | jq -r '.[]'); do
              COMMENT+="- [Trace ${TRACE_ID:0:8}...](${JAEGER_URL}/trace/${TRACE_ID})\n"
            done
          else
            COMMENT+="No traces captured.\n"
          fi

          # Save the comment to a file
          echo -e "$COMMENT" > trace-comment.md

      - name: Upload trace data as artifact
        uses: actions/upload-artifact@v4
        with:
          name: trace-data
          path: |
            trace-ids.json
            trace-comment.md

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const comment = fs.readFileSync('trace-comment.md', 'utf8');

            // Check if we already posted a trace comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.find(c =>
              c.body.includes('Trace Links from Integration Tests')
            );

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body: comment,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: comment,
              });
            }

      - name: Stop services
        if: always()
        run: docker compose -f docker-compose.ci.yml down
```

## Making Traces Accessible

The tricky part is that Jaeger running in CI is ephemeral. Once the CI job finishes, the container is gone. There are a few solutions:

**Option 1: Use a persistent Jaeger instance.** Send traces to a shared staging Jaeger that the team can access. Update the collector config to export to this instance.

**Option 2: Export trace screenshots.** Take screenshots of the Jaeger waterfall view and attach them to the PR as images.

**Option 3: Export trace JSON.** Save the trace data as a CI artifact that reviewers can download and import into their local Jaeger.

```bash
# Export traces as JSON from Jaeger API
for TRACE_ID in $(cat trace-ids.json | jq -r '.[]'); do
  curl -s "http://localhost:16686/api/traces/${TRACE_ID}" > "trace-${TRACE_ID}.json"
done
```

## What Reviewers Get

When a reviewer opens the pull request, they see a comment listing the traces from integration tests. Each link opens the corresponding trace in Jaeger, showing the full span waterfall. The reviewer can verify:

- New spans appear where expected
- Attribute names follow conventions
- No unexpected errors or high latencies
- Trace context propagates correctly across service calls

This turns observability review into a natural part of the code review process instead of something that gets checked after deployment when it is harder to fix.
