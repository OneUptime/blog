# How to Use Dapr Conversation API for Code Assistance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Code Assistance, LLM, AI, Developer Tool

Description: Learn how to build code assistance features using the Dapr Conversation API, enabling code review, generation, and explanation services in microservice architectures.

---

Code assistance - reviewing PRs, generating boilerplate, explaining complex logic - is a valuable LLM application for developer tooling. The Dapr Conversation API provides the LLM integration layer for building these features in microservice architectures.

## Code Assistance Service

Build a multi-purpose code assistance service:

```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"
CODE_LLM = "mistral-conversation"  # Codestral model

SYSTEM_PROMPTS = {
    "review": """You are an expert code reviewer. Analyze code for:
- Security vulnerabilities (SQL injection, XSS, etc.)
- Performance issues
- Code style and best practices
- Bug potential
Format your response with sections: Security, Performance, Style, Bugs.""",

    "explain": """You are a code educator. Explain code clearly:
- What the code does overall
- How each important part works
- Any complex algorithms or patterns used
Use simple language suitable for intermediate developers.""",

    "refactor": """You are a software architect. Suggest improvements:
- Cleaner, more readable code
- Better design patterns
- Reduced complexity
Show the refactored version with explanations.""",

    "generate": """You are an expert programmer. Generate clean, production-ready code:
- Include error handling
- Add docstrings/comments
- Follow language best practices
Return only the code with inline comments.""",

    "test": """You are a testing expert. Generate comprehensive tests:
- Cover happy path, edge cases, and error scenarios
- Use clear test names describing the behavior
- Include setup and teardown where needed
Follow the specified testing framework conventions."""
}

@app.route('/api/code/review', methods=['POST'])
def review_code():
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'unknown')

    prompt = f"Review this {language} code:\n\n```{language}\n{code}\n```"

    return call_code_llm(prompt, "review")

@app.route('/api/code/explain', methods=['POST'])
def explain_code():
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'unknown')

    prompt = f"Explain this {language} code:\n\n```{language}\n{code}\n```"

    return call_code_llm(prompt, "explain")

@app.route('/api/code/generate', methods=['POST'])
def generate_code():
    data = request.get_json()
    description = data.get('description', '')
    language = data.get('language', 'python')
    context = data.get('context', '')

    prompt = f"""Write {language} code that: {description}
{"Context: " + context if context else ""}
Requirements:
- Include error handling
- Add docstrings/comments
- Follow {language} best practices
Return only the code with inline comments."""

    return call_code_llm(prompt, "generate")

@app.route('/api/code/tests', methods=['POST'])
def generate_tests():
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'python')
    framework = data.get('testFramework', 'pytest' if language == 'python' else 'jest')

    prompt = f"""Generate comprehensive {framework} tests for this {language} code.
Include edge cases, error scenarios, and happy path tests.

```{language}
{code}
```"""

    return call_code_llm(prompt, "test")

def call_code_llm(prompt: str, mode: str):
    system_prompt = SYSTEM_PROMPTS.get(mode, "")
    inputs = []
    if system_prompt:
        inputs.append({"content": system_prompt, "role": "system"})
    inputs.append({"content": prompt, "role": "user"})

    response = requests.post(
        f"{DAPR_URL}/v1.0-alpha1/conversation/{CODE_LLM}/converse",
        json={
            "inputs": inputs,
            "parameters": {"temperature": 0.2, "max_tokens": 1500}
        }
    )

    if not response.ok:
        return jsonify({"error": "LLM call failed"}), 500

    return jsonify({"result": response.json()['outputs'][0]['result']})

if __name__ == '__main__':
    app.run(port=6001)
```

## Testing Code Review

```bash
curl -X POST http://localhost:6001/api/code/review \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def get_user(user_id):\n    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n    return db.execute(query)"
  }'
```

## Code Generation Example

```bash
curl -X POST http://localhost:6001/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "language": "go",
    "description": "implements a thread-safe LRU cache with configurable capacity",
    "context": "Used for caching database query results in a high-concurrency service"
  }'
```

## Selecting the Right Model

Different models excel at different code tasks:

```python
def get_code_llm(task: str) -> str:
    model_map = {
        "generation": "mistral-conversation",  # Codestral
        "review": "anthropic-conversation",     # Claude for nuanced review
        "explanation": "openai-conversation",   # GPT-4 for clear explanations
        "local": "ollama-conversation"          # Codellama for offline use
    }
    return model_map.get(task, "openai-conversation")
```

## Summary

The Dapr Conversation API provides a clean foundation for code assistance services, allowing you to build code review, generation, and explanation features using any LLM provider. Selecting specialized models like Codestral for generation and Claude for review, and switching between them through component configuration, delivers the best results for each code task.
