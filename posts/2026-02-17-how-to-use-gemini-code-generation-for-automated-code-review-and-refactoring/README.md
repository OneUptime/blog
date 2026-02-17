# How to Use Gemini Code Generation for Automated Code Review and Refactoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Code Review, Refactoring

Description: Learn how to use Gemini's code generation capabilities on Vertex AI for automated code review, refactoring suggestions, and code quality improvement.

---

Code review is one of those tasks that every team knows is important but struggles to do consistently well. Reviewers are busy, reviews get delayed, and some issues slip through. Gemini's code understanding capabilities can help by automating parts of the review process - catching common issues, suggesting refactors, and maintaining code quality standards.

I have been experimenting with automated code review using Gemini for the past few months, and it is particularly good at pattern-level issues: security vulnerabilities, performance anti-patterns, and code style inconsistencies. Let me show you how to build an automated review system.

## Setting Up the Code Review Model

The key to good code reviews is a well-crafted system instruction that defines your team's standards.

This code configures a model for code review:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Configure a model specifically for code review
code_reviewer = GenerativeModel(
    "gemini-2.0-flash",
    system_instruction="""You are a senior software engineer conducting code reviews.

Review Style:
- Be specific and actionable in your feedback
- Reference line numbers when pointing out issues
- Categorize issues by severity: critical, warning, suggestion
- Explain WHY something is a problem, not just what to change
- Acknowledge good patterns when you see them

Review Checklist:
1. Security vulnerabilities (SQL injection, XSS, secrets in code)
2. Error handling (missing try/catch, unhandled edge cases)
3. Performance issues (N+1 queries, unnecessary allocations)
4. Code readability (naming, complexity, documentation)
5. Best practices for the specific language/framework
6. Test coverage gaps
"""
)
```

## Reviewing a Code Change

Pass a code diff or a code file to the model for review.

```python
def review_code(code, language="python", context=""):
    """Review a code snippet and return structured feedback."""
    prompt = f"""Review this {language} code:

```{language}
{code}
```

{f"Context: {context}" if context else ""}

Provide your review in this format:
1. Summary (one paragraph)
2. Issues found (categorized by severity)
3. Refactoring suggestions
4. Overall assessment
"""

    response = code_reviewer.generate_content(prompt)
    return response.text

# Example: review a Python function
code_to_review = '''
def get_user_data(user_id):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    result = cursor.fetchone()
    return {"name": result[1], "email": result[2]}
'''

review = review_code(
    code_to_review,
    language="python",
    context="This function is called from a web API endpoint"
)
print(review)
```

## Reviewing Git Diffs

In practice, you review changes, not entire files. Here is how to review a git diff:

```python
def review_diff(diff_text, pr_description=""):
    """Review a git diff for issues and improvements."""
    prompt = f"""Review this code change (git diff format):

```diff
{diff_text}
```

{"PR Description: " + pr_description if pr_description else ""}

Focus on:
1. Does this change introduce any bugs or regressions?
2. Are there security concerns with the changes?
3. Is the code maintainable and well-structured?
4. Are there missing edge cases or error handling?
5. Would you approve this PR? Why or why not?
"""

    response = code_reviewer.generate_content(prompt)
    return response.text

# Example diff
diff = '''
--- a/api/handlers.py
+++ b/api/handlers.py
@@ -45,6 +45,15 @@ class UserHandler:
+    async def delete_user(self, request):
+        user_id = request.match_info.get("id")
+        await self.db.execute(
+            "DELETE FROM users WHERE id = ?", (user_id,)
+        )
+        await self.db.execute(
+            "DELETE FROM sessions WHERE user_id = ?", (user_id,)
+        )
+        return web.json_response({"status": "deleted"})
'''

review = review_diff(
    diff,
    pr_description="Add endpoint to delete user and their sessions"
)
print(review)
```

## Automated Refactoring Suggestions

Beyond finding issues, Gemini can suggest concrete refactors with working code.

```python
def suggest_refactoring(code, language="python", goals=None):
    """Suggest refactoring improvements with working code."""
    goal_text = ""
    if goals:
        goal_text = "Refactoring goals:\n" + "\n".join(f"- {g}" for g in goals)

    prompt = f"""Refactor this {language} code to improve its quality.

Original code:
```{language}
{code}
```

{goal_text}

For each refactoring:
1. Explain what you changed and why
2. Show the refactored code
3. Note any behavioral differences
"""

    response = code_reviewer.generate_content(prompt)
    return response.text

# Example: refactor a messy function
messy_code = '''
def process_order(order):
    if order["status"] == "new":
        if order["total"] > 100:
            if order["customer"]["type"] == "premium":
                discount = order["total"] * 0.2
                order["total"] = order["total"] - discount
                order["discount_applied"] = True
            else:
                if order["total"] > 500:
                    discount = order["total"] * 0.1
                    order["total"] = order["total"] - discount
                    order["discount_applied"] = True
                else:
                    order["discount_applied"] = False
        else:
            order["discount_applied"] = False
        order["status"] = "processed"
        save_order(order)
        send_confirmation(order["customer"]["email"], order)
        if order.get("discount_applied"):
            log_discount(order["id"], discount)
    return order
'''

refactoring = suggest_refactoring(
    messy_code,
    goals=[
        "Reduce nesting depth",
        "Improve readability",
        "Make the discount logic testable",
        "Add proper error handling"
    ]
)
print(refactoring)
```

## Batch Code Review Pipeline

For reviewing multiple files or an entire codebase, build a batch processing pipeline.

```python
import os

class CodeReviewPipeline:
    """Automated code review pipeline for a codebase."""

    def __init__(self):
        self.reviewer = code_reviewer
        self.results = []

    def review_file(self, file_path):
        """Review a single code file."""
        with open(file_path, "r") as f:
            code = f.read()

        # Determine language from extension
        ext_to_lang = {
            ".py": "python", ".js": "javascript", ".ts": "typescript",
            ".go": "go", ".java": "java", ".rs": "rust"
        }
        ext = os.path.splitext(file_path)[1]
        language = ext_to_lang.get(ext, "unknown")

        review = review_code(code, language, context=f"File: {file_path}")

        return {
            "file": file_path,
            "language": language,
            "review": review,
            "lines": len(code.split("\n"))
        }

    def review_directory(self, directory, extensions=None):
        """Review all code files in a directory."""
        if extensions is None:
            extensions = [".py", ".js", ".ts"]

        files_to_review = []
        for root, dirs, files in os.walk(directory):
            # Skip common non-code directories
            dirs[:] = [d for d in dirs if d not in [
                "node_modules", ".git", "__pycache__", "venv", ".venv"
            ]]
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    files_to_review.append(os.path.join(root, file))

        print(f"Reviewing {len(files_to_review)} files...")

        for file_path in files_to_review:
            try:
                result = self.review_file(file_path)
                self.results.append(result)
                print(f"  Reviewed: {file_path}")
            except Exception as e:
                print(f"  Failed: {file_path} - {e}")

        return self.results

    def generate_report(self):
        """Generate a summary report of all reviews."""
        report = "# Code Review Report\n\n"
        report += f"Files reviewed: {len(self.results)}\n\n"

        for result in self.results:
            report += f"## {result['file']}\n"
            report += f"Language: {result['language']} | Lines: {result['lines']}\n\n"
            report += result["review"] + "\n\n---\n\n"

        return report

# Usage
pipeline = CodeReviewPipeline()
pipeline.review_directory("src/", extensions=[".py"])
report = pipeline.generate_report()
print(report)
```

## Security-Focused Reviews

Create a specialized reviewer focused on security vulnerabilities.

```python
security_reviewer = GenerativeModel(
    "gemini-2.0-flash",
    system_instruction="""You are a security-focused code reviewer.

Focus exclusively on security issues:
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Authentication and authorization flaws
- Insecure deserialization
- Hardcoded secrets or credentials
- Insecure cryptographic practices
- Path traversal vulnerabilities
- Server-side request forgery (SSRF)
- Insecure direct object references

For each finding:
1. Severity: Critical / High / Medium / Low
2. CWE reference if applicable
3. Exact code location
4. Exploitation scenario
5. Recommended fix with code example
"""
)

def security_review(code, language="python"):
    """Run a security-focused review on code."""
    response = security_reviewer.generate_content(
        f"Perform a security review of this {language} code:\n\n```{language}\n{code}\n```"
    )
    return response.text
```

## Generating Unit Tests

Gemini can also generate test cases for code that lacks coverage.

```python
def generate_tests(code, language="python", framework="pytest"):
    """Generate unit tests for a given code snippet."""
    prompt = f"""Generate comprehensive unit tests for this {language} code using {framework}.

```{language}
{code}
```

Requirements:
- Cover all public functions and methods
- Include edge cases and error scenarios
- Use descriptive test names that explain what is being tested
- Include setup and teardown if needed
- Add comments explaining the test strategy
"""

    response = code_reviewer.generate_content(prompt)
    return response.text

# Generate tests for a function
code = '''
def calculate_shipping(weight_kg, distance_km, express=False):
    if weight_kg <= 0 or distance_km <= 0:
        raise ValueError("Weight and distance must be positive")

    base_rate = 2.50
    per_kg = 0.50
    per_km = 0.01

    cost = base_rate + (weight_kg * per_kg) + (distance_km * per_km)

    if express:
        cost *= 1.5

    if weight_kg > 30:
        cost += 10.00  # Heavy package surcharge

    return round(cost, 2)
'''

tests = generate_tests(code)
print(tests)
```

## Wrapping Up

Automated code review with Gemini does not replace human reviewers - it augments them. The model catches pattern-level issues consistently, suggests refactors with working code, and can run security scans across entire codebases. Use it as a first pass before human review to catch the easy stuff, so human reviewers can focus on architecture and design decisions. Monitor your automated review pipeline's accuracy and usefulness with tools like OneUptime, and refine your system instructions based on team feedback.
