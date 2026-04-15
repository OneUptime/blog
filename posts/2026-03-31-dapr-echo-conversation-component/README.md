# How to Use the Dapr Echo Conversation Component for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Echo, Testing, LLM, Mock

Description: Learn how to use the Dapr Echo Conversation component to test LLM integrations locally without calling real AI APIs, enabling faster development and CI/CD pipelines.

---

The Dapr Echo Conversation component is a mock LLM provider that echoes back the input as the response. It allows you to test your Conversation API integration, verify request formatting, and build CI/CD pipelines without incurring LLM API costs or requiring network access to AI providers.

## What the Echo Component Does

The echo component returns the input message as the response output. If you send `"Hello"`, you get `"Hello"` back. This is useful for:

- Verifying your application correctly calls the Conversation API
- Testing error handling around LLM responses
- Running integration tests in CI without API keys
- Rapid local development iteration

## Setting Up the Echo Component

```yaml
# components/echo-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.echo
  version: v1
```

No API keys, no secrets, no network connectivity required.

## Using the Echo Component Locally

```bash
# Start your app with the echo component
dapr run \
  --app-id my-llm-app \
  --app-port 6001 \
  --resources-path ./components \
  -- node app.js

# Test the echo component
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/llm-provider/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {"content": "This is a test message", "role": "user"}
    ]
  }'
```

Response:

```json
{
  "outputs": [
    {
      "result": "This is a test message",
      "parameters": {}
    }
  ]
}
```

## Writing Tests with the Echo Component

Use the echo component for unit and integration tests:

```javascript
// app.test.js
const request = require('supertest');
const app = require('./app');

describe('LLM Integration', () => {
  describe('POST /api/analyze', () => {
    it('should call Dapr Conversation and return result', async () => {
      // The echo component returns the input - verify the full flow
      const response = await request(app)
        .post('/api/analyze')
        .send({ text: 'Analyze this product review' });

      expect(response.status).toBe(200);
      // Echo returns the prompt, so verify result contains our text
      expect(response.body.analysis).toContain('Analyze this product review');
    });

    it('should handle empty text gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ text: '' });

      expect(response.status).toBe(400);
    });
  });
});
```

Run tests:

```bash
# Start Dapr with echo component
dapr run \
  --app-id test-app \
  --app-port 6001 \
  --resources-path ./components/test \
  -- npm test
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test LLM Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Dapr CLI
        run: |
          wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
          dapr init

      - name: Set up echo component
        run: |
          mkdir -p test-components
          cat > test-components/echo-llm.yaml << 'EOF'
          apiVersion: dapr.io/v1alpha1
          kind: Component
          metadata:
            name: llm-provider
          spec:
            type: conversation.echo
            version: v1
          EOF

      - name: Run integration tests
        run: |
          dapr run \
            --app-id test-app \
            --app-port 6001 \
            --resources-path ./test-components \
            -- npm test
```

## Switching Between Echo and Real Providers

Use a script to toggle between echo (testing) and real (production) components:

```bash
#!/bin/bash
# setup-components.sh

ENV=${1:-"dev"}

if [ "$ENV" = "test" ]; then
  cat > components/llm-provider.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.echo
  version: v1
EOF
  echo "Using echo component for testing"
elif [ "$ENV" = "prod" ]; then
  cp components/llm-openai.yaml components/llm-provider.yaml
  echo "Using OpenAI for production"
fi
```

```bash
# Use echo for tests
./setup-components.sh test
npm test

# Use OpenAI for dev
./setup-components.sh prod
dapr run --app-id my-app -- node app.js
```

## Summary

The Dapr Echo Conversation component is an invaluable tool for development and testing, providing a cost-free, no-network mock for LLM integrations. Using it in CI/CD pipelines ensures your Conversation API integration is always validated without requiring real AI provider credentials in test environments.
