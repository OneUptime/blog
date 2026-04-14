# How to Test Dapr Conversation API Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Testing, Local Development, LLM

Description: Learn how to test the Dapr Conversation API locally using the echo component, Ollama for real model testing, and integration test strategies for CI/CD pipelines.

---

Testing LLM integrations locally presents unique challenges - real API calls are slow, cost money, and require network access. This guide covers practical strategies for local Dapr Conversation testing using the echo component for unit tests and Ollama for integration tests.

## Testing Strategy Overview

| Test Type | Provider | Use Case |
|-----------|----------|----------|
| Unit tests | Echo component | Verify API calls, request format |
| Integration tests | Ollama (local) | Validate real LLM responses |
| E2E tests | Real provider | Pre-production validation |

## Setting Up Test Components

Create a `components/test/` directory for test-specific components:

```bash
mkdir -p components/test
```

```yaml
# components/test/echo-llm.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.echo
  version: v1
```

```yaml
# components/test/ollama-llm.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.ollama
  version: v1
  metadata:
    - name: model
      value: "llama3.2"
```

## Unit Testing with the Echo Component

```javascript
// test/conversation.test.js
const request = require('supertest');
const app = require('../app');

// When running with echo component, responses mirror inputs
describe('Conversation API Integration', () => {
  test('should successfully call LLM and return response', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: 'What is Kubernetes?' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer.length).toBeGreaterThan(0);
  });

  test('should handle empty question', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: '' });

    expect(res.status).toBe(400);
  });

  test('should handle LLM errors gracefully', async () => {
    // Test with an invalid component name to trigger error
    const res = await request(app)
      .post('/api/ask')
      .send({ question: 'test', provider: 'nonexistent-component' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
```

Run tests with the echo component:

```bash
dapr run \
  --app-id test-app \
  --app-port 6001 \
  --resources-path ./components/test \
  -- npm test
```

## Integration Testing with Ollama

For tests that need real LLM responses (response quality, format validation):

```python
# test/test_integration.py
import pytest
import subprocess
import time
import requests
import os

@pytest.fixture(scope="session", autouse=True)
def dapr_with_ollama():
    """Start Dapr with Ollama component for integration tests."""
    # Check Ollama is running
    try:
        requests.get("http://localhost:11434/api/tags", timeout=2)
    except:
        pytest.skip("Ollama not running, skipping integration tests")

    # Dapr is assumed to be running externally in CI
    yield

def test_real_llm_response_is_coherent():
    """Test that the LLM returns a coherent response."""
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/llm-provider/converse",
        json={
            "inputs": [{"content": "What is 2 + 2?", "role": "user"}],
            "parameters": {"temperature": 0.0}
        }
    )

    assert response.status_code == 200
    result = response.json()['outputs'][0]['result']

    # Verify the response mentions 4
    assert '4' in result

def test_response_contains_json_when_requested():
    """Test LLM can return structured JSON."""
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/llm-provider/converse",
        json={
            "inputs": [{
                "content": 'Return only valid JSON: {"status": "ok"}',
                "role": "user"
            }],
            "parameters": {"temperature": 0.0}
        }
    )

    assert response.status_code == 200
    result = response.json()['outputs'][0]['result']

    # Should be parseable JSON
    import json
    parsed = json.loads(result.strip())
    assert isinstance(parsed, dict)
```

## Testing Prompt Templates

Validate prompts produce expected output patterns:

```python
import re

def test_summary_format():
    """Test that summary prompt returns bullet points."""
    response = requests.post(
        "http://localhost:3500/v1.0-alpha1/conversation/llm-provider/converse",
        json={
            "inputs": [{
                "content": "Summarize this as exactly 3 bullet points: Kubernetes is a container orchestration system. It automates deployment. It manages scaling.",
                "role": "user"
            }]
        }
    )

    result = response.json()['outputs'][0]['result']
    # Count bullet points
    bullets = re.findall(r'^[\*\-\•]', result, re.MULTILINE)
    assert len(bullets) >= 3, f"Expected at least 3 bullet points, got: {result}"
```

## Makefile for Testing

```makefile
# Makefile
.PHONY: test test-unit test-integration

test-unit:
	dapr run \
		--app-id test-app \
		--app-port 6001 \
		--resources-path ./components/test \
		-- npm test

test-integration:
	dapr run \
		--app-id test-app \
		--app-port 6001 \
		--resources-path ./components/test/ollama \
		-- pytest test/test_integration.py -v

test: test-unit test-integration
```

## Summary

Local testing of Dapr Conversation uses two complementary approaches: the echo component for fast, cost-free unit tests that verify API call structure and error handling, and Ollama for integration tests that validate real LLM behavior without external API costs. This layered strategy keeps CI pipelines fast while ensuring quality.
