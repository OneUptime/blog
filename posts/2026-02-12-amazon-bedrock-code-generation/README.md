# How to Use Amazon Bedrock for Code Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, Code Generation, AI, Developer Tools

Description: Practical guide to using Amazon Bedrock for generating, reviewing, and refactoring code with foundation models in your development workflows.

---

Code generation with AI has moved past the novelty stage. It's a genuine productivity tool now, and Amazon Bedrock puts several capable code-generation models at your fingertips without infrastructure hassle. Whether you need to scaffold boilerplate, convert between languages, write tests, or refactor messy legacy code, Bedrock can handle it.

The trick is knowing how to prompt these models effectively for code tasks. Vague requests give you vague code. Specific, well-structured prompts give you code you can actually use. Let's get into the details.

## Setting Up for Code Generation

The foundation models available through Bedrock vary in their code generation abilities. Claude models are strong all-around, and Amazon's own Titan models work well for simpler tasks. Pick the model that balances quality with cost for your use case.

```python
import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def generate_code(prompt, language="python", temperature=0.2):
    """Generate code using Bedrock with language-specific instructions."""

    system_prompt = f"""You are an expert {language} developer.
When generating code:
- Write clean, production-quality code
- Include error handling
- Add concise inline comments for non-obvious logic
- Follow {language} best practices and conventions
- Do not include explanations outside the code unless asked"""

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 4096,
            'temperature': temperature,
            'system': system_prompt,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

## Generating Functions from Descriptions

The most common use case is generating a function from a natural language description. The more specific your description, the better the output.

```python
# Generate a function with specific requirements
result = generate_code("""
Write a Python function called 'retry_with_backoff' that:
- Takes a callable, max_retries (default 3), and base_delay (default 1.0)
- Retries the callable on any exception
- Uses exponential backoff with jitter
- Logs each retry attempt
- Returns the result on success or raises the last exception after max retries
- Type hints for all parameters and return value
""")

print(result)
```

This produces something like the following.

```python
import time
import random
import logging
from typing import TypeVar, Callable

logger = logging.getLogger(__name__)
T = TypeVar('T')

def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    base_delay: float = 1.0
) -> T:
    """Execute a function with exponential backoff retry logic."""
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return func()
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                # Calculate delay with exponential backoff and jitter
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                logger.warning(
                    f"Attempt {attempt + 1} failed: {e}. "
                    f"Retrying in {delay:.2f}s..."
                )
                time.sleep(delay)
            else:
                logger.error(
                    f"All {max_retries + 1} attempts failed. "
                    f"Last error: {e}"
                )

    raise last_exception
```

## Code Review and Analysis

Beyond generation, these models are excellent at reviewing existing code. You can build an automated code review pipeline that catches issues before they reach human reviewers.

```python
def review_code(code, language="python", focus=None):
    """Perform an AI-powered code review."""

    focus_instruction = ""
    if focus:
        focus_instruction = f"\nPay special attention to: {focus}"

    prompt = f"""Review the following {language} code for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style and readability
5. Missing error handling
{focus_instruction}

For each issue found, provide:
- The specific line or section
- What the problem is
- How to fix it

Code to review:
```{language}
{code}
```"""

    return generate_code(prompt, language, temperature=0.1)

# Example: review code with a security focus
vulnerable_code = """
import sqlite3

def get_user(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")
    return cursor.fetchone()

def save_password(user_id, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(f"UPDATE users SET password = '{password}' WHERE id = {user_id}")
    conn.commit()
"""

review = review_code(vulnerable_code, focus="security")
print(review)
```

## Language Translation

Converting code between languages is another strong use case. This is particularly useful during migration projects.

```python
def translate_code(code, source_lang, target_lang):
    """Convert code from one language to another."""

    prompt = f"""Convert the following {source_lang} code to {target_lang}.
Maintain the same functionality and logic.
Use idiomatic {target_lang} patterns and conventions.
Preserve all comments but translate them if needed.

{source_lang} code:
```{source_lang}
{code}
```

Provide only the {target_lang} code, no explanations."""

    return generate_code(prompt, target_lang, temperature=0.1)

# Convert Python to Go
python_code = """
from typing import List, Optional

def binary_search(arr: List[int], target: int) -> Optional[int]:
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return None
"""

go_code = translate_code(python_code, "Python", "Go")
print(go_code)
```

## Test Generation

Writing tests is tedious but essential. Let the model generate test cases based on your implementation.

```python
def generate_tests(code, language="python", framework="pytest"):
    """Generate unit tests for the given code."""

    prompt = f"""Generate comprehensive unit tests for the following {language} code using {framework}.
Include:
- Happy path tests
- Edge cases (empty inputs, None/null, boundary values)
- Error cases that should raise exceptions
- Use descriptive test names that explain what is being tested

Code to test:
```{language}
{code}
```"""

    return generate_code(prompt, language, temperature=0.3)

# Generate tests for a function
implementation = """
def calculate_shipping(weight_kg: float, destination: str, express: bool = False) -> float:
    if weight_kg <= 0:
        raise ValueError("Weight must be positive")

    base_rates = {"domestic": 5.0, "international": 15.0}
    if destination not in base_rates:
        raise ValueError(f"Unknown destination: {destination}")

    cost = base_rates[destination] + (weight_kg * 2.5)

    if express:
        cost *= 1.5

    if weight_kg > 30:
        cost += 20.0  # Overweight surcharge

    return round(cost, 2)
"""

tests = generate_tests(implementation)
print(tests)
```

## Refactoring Existing Code

When you're staring at legacy code that works but is hard to maintain, AI-assisted refactoring can save hours.

```python
def refactor_code(code, language="python", goals=None):
    """Refactor code according to specified goals."""

    goals_list = goals or [
        "Improve readability",
        "Reduce complexity",
        "Follow SOLID principles",
        "Add proper type hints"
    ]

    goals_text = "\n".join(f"- {g}" for g in goals_list)

    prompt = f"""Refactor the following {language} code with these goals:
{goals_text}

Important:
- Maintain the exact same external behavior
- Explain significant changes with brief comments
- Break large functions into smaller, focused ones where appropriate

Original code:
```{language}
{code}
```"""

    return generate_code(prompt, language, temperature=0.2)
```

## Building a Code Generation Pipeline

For team use, wrap the generation capabilities in a simple API that standardizes prompts and handles common patterns.

```python
class CodeAssistant:
    """A wrapper around Bedrock for common code generation tasks."""

    def __init__(self, model_id='anthropic.claude-3-sonnet-20240229-v1:0'):
        self.client = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.model_id = model_id

    def _invoke(self, system, user_message, temperature=0.2):
        response = self.client.invoke_model(
            modelId=self.model_id,
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 4096,
                'temperature': temperature,
                'system': system,
                'messages': [{'role': 'user', 'content': user_message}]
            })
        )
        result = json.loads(response['body'].read())
        return result['content'][0]['text']

    def generate_docstring(self, code, style="google"):
        """Generate documentation strings for code."""
        return self._invoke(
            f"You are a technical writer. Generate {style}-style docstrings.",
            f"Add comprehensive docstrings to this code:\n```\n{code}\n```"
        )

    def explain_code(self, code):
        """Explain what a piece of code does in plain English."""
        return self._invoke(
            "You explain code clearly to developers of varying experience levels.",
            f"Explain what this code does, step by step:\n```\n{code}\n```"
        )

    def suggest_improvements(self, code, language="python"):
        """Suggest improvements without rewriting the code."""
        return self._invoke(
            f"You are a senior {language} developer doing code review.",
            f"Suggest improvements for this code. List each suggestion with the reasoning.\n```{language}\n{code}\n```"
        )

# Usage
assistant = CodeAssistant()
docs = assistant.generate_docstring(implementation)
print(docs)
```

## Best Practices

Keep temperature low for code generation - 0.1 to 0.3 works best. Higher temperatures introduce randomness that leads to syntax errors and inconsistent patterns.

Always review generated code before using it. The model might produce code that looks correct but has subtle bugs, especially with complex business logic.

Be specific about your requirements. Mention the framework version, coding standards, and any constraints. "Write a REST endpoint" is much less useful than "Write a FastAPI endpoint that accepts a JSON body with fields name and email, validates both, and returns a 201 with the created user."

For code-heavy workflows that involve processing lots of files, [Bedrock batch inference](https://oneuptime.com/blog/post/amazon-bedrock-batch-inference/view) can save you significant costs compared to real-time invocations.
