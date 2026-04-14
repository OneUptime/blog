# How to Switch LLM Providers Without Changing Code Using Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, LLM, Provider Switching, AI, Microservice

Description: Learn how to switch between LLM providers like OpenAI, Anthropic, and Ollama without changing application code using Dapr Conversation component abstraction.

---

One of the most powerful features of the Dapr Conversation API is provider abstraction - your application code calls a named component, and the underlying LLM provider is configured separately. This means switching from OpenAI to Anthropic, or from a cloud provider to a local Ollama instance, requires only a component configuration change.

## How Provider Abstraction Works

Your application always calls the same endpoint pattern:

```text
POST /v1.0-alpha1/conversation/{component-name}/converse
```

The `component-name` maps to a component YAML that defines the provider. Change the component, change the provider - no code changes required.

## Defining Multiple Provider Components

Create component files for each provider:

```yaml
# components/llm-openai.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.openai
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: openai-secret
        key: api-key
    - name: model
      value: "gpt-4o"
```

```yaml
# components/llm-anthropic.yaml (alternative)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.anthropic
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: anthropic-secret
        key: api-key
    - name: model
      value: "claude-3-5-sonnet-20241022"
```

```yaml
# components/llm-ollama.yaml (local/offline)
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
    - name: endpoint
      value: "http://localhost:11434/v1"
```

## Application Code (Provider-Agnostic)

Your application always uses the same component name:

```python
import requests

DAPR_URL = "http://localhost:3500"
LLM_COMPONENT = "llm-provider"  # Always the same

def ask_llm(question: str, temperature: float = 0.5) -> str:
    """Call the configured LLM provider - no provider-specific code here."""
    response = requests.post(
        f"{DAPR_URL}/v1.0-alpha1/conversation/{LLM_COMPONENT}/converse",
        json={
            "inputs": [{"content": question, "role": "user"}],
            "temperature": temperature
        }
    )
    response.raise_for_status()
    return response.json()['outputs'][0]['result']

# This exact code works with ANY provider - no changes needed
result = ask_llm("Explain microservices in one paragraph")
print(result)
```

## Switching Providers

**Development (local Ollama):**

```bash
# Use the Ollama component
cp components/llm-ollama.yaml components/llm-provider.yaml
dapr run --app-id my-app --components-path ./components -- python app.py
```

**Staging (OpenAI):**

```bash
# Use the OpenAI component
cp components/llm-openai.yaml components/llm-provider.yaml
dapr run --app-id my-app --components-path ./components -- python app.py
```

**Production (Anthropic via Kubernetes):**

```bash
# Apply the Anthropic component
kubectl apply -f components/llm-anthropic.yaml
kubectl rollout restart deployment/my-app
```

## Environment-Based Provider Selection

Use Helm values to select providers per environment:

```yaml
# values-dev.yaml
llmProvider: ollama

# values-prod.yaml
llmProvider: anthropic
```

```yaml
# k8s/component-template.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.{{ .Values.llmProvider }}
  version: v1
  metadata:
    {{- if eq .Values.llmProvider "anthropic" }}
    - name: key
      secretKeyRef:
        name: anthropic-secret
        key: api-key
    - name: model
      value: "claude-3-5-sonnet-20241022"
    {{- else if eq .Values.llmProvider "ollama" }}
    - name: model
      value: "llama3.2"
    - name: endpoint
      value: "http://ollama:11434/v1"
    {{- end }}
```

Deploy:

```bash
helm upgrade my-app ./chart -f values-prod.yaml
```

## Fallback Pattern with Multiple Components

Implement a fallback when the primary provider fails:

```python
PROVIDERS = ["llm-provider-primary", "llm-provider-fallback"]

def ask_with_fallback(question: str) -> str:
    for component in PROVIDERS:
        try:
            response = requests.post(
                f"{DAPR_URL}/v1.0-alpha1/conversation/{component}/converse",
                json={"inputs": [{"content": question, "role": "user"}]},
                timeout=10
            )
            if response.ok:
                return response.json()['outputs'][0]['result']
        except Exception as e:
            print(f"Provider {component} failed: {e}, trying next...")
    raise Exception("All LLM providers failed")
```

## Summary

Dapr Conversation's component abstraction enables true provider portability - application code calls a named component, and switching providers requires only a configuration file change. This architecture supports development with local models, staging with mid-tier providers, and production with enterprise models without any application code modifications.
