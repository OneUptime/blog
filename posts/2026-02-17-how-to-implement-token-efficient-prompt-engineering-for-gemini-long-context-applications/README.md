# How to Implement Token-Efficient Prompt Engineering for Gemini Long Context Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Prompt Engineering, Token Optimization

Description: Learn practical techniques for writing token-efficient prompts for Gemini long context applications to reduce costs and improve latency on Vertex AI.

---

Gemini's million-token context window is a game changer, but tokens still cost money and take time to process. I have seen teams burn through their API budgets by carelessly stuffing everything into the context without thinking about efficiency. The good news is that with some thoughtful prompt engineering, you can dramatically reduce token usage without sacrificing output quality.

In this post, I will share the techniques I use to write token-efficient prompts for long-context Gemini applications.

## Why Token Efficiency Matters

Every token you send to Gemini costs money. For Gemini 2.0 Flash, input tokens are cheaper than output tokens, but when you are processing thousands of long documents per day, it adds up fast. Beyond cost, fewer tokens means lower latency - the model processes your request faster. And staying under token limits means you can fit more useful content into each request.

## Measuring Token Usage

Before optimizing, you need to measure. Gemini provides a token counting API that lets you check token counts before sending requests.

This code measures token usage for different prompt strategies:

```python
import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

model = GenerativeModel("gemini-2.0-flash")

def count_and_report(label, content):
    """Count tokens and report the result."""
    token_count = model.count_tokens(content)
    print(f"{label}: {token_count.total_tokens:,} tokens")
    return token_count.total_tokens

# Compare different prompt styles for the same task
verbose_prompt = """
I would really like you to help me with something. Could you please take
a look at the following text and provide me with a comprehensive and detailed
summary? I would like the summary to cover all the main points and key
takeaways. Please make sure to include any important details that would be
relevant for someone who hasn't read the original text. Here is the text:
"""

concise_prompt = "Summarize the key points from this text:"

count_and_report("Verbose prompt", verbose_prompt)
count_and_report("Concise prompt", concise_prompt)
```

## Technique 1 - Trim Prompt Instructions

The fastest win is cutting unnecessary words from your instructions. Models do not need politeness, filler words, or redundant explanations. Be direct.

Here is a before-and-after comparison:

```python
# Before: 89 tokens of instruction
before = """
Hello! I am working on a project and I would really appreciate your help.
Could you please analyze the following server log entries and identify any
errors or warnings that might indicate a problem? I would like you to focus
on the most critical issues first, and for each issue, please explain what
might be causing it and suggest a potential fix. Thank you so much for your
help with this!

Server logs:
{logs}
"""

# After: 27 tokens of instruction - same result quality
after = """Analyze these server logs. For each error or warning:
1. Severity (critical/warning/info)
2. Likely cause
3. Suggested fix

Logs:
{logs}
"""

count_and_report("Verbose instruction", before)
count_and_report("Concise instruction", after)
```

## Technique 2 - Compress Context Documents

When feeding long documents into the context, remove content that is not relevant to the task. This sounds obvious, but many developers dump entire files when they only need specific sections.

```python
def extract_relevant_sections(document, keywords):
    """Extract only paragraphs containing relevant keywords."""
    paragraphs = document.split("\n\n")
    relevant = []

    for para in paragraphs:
        para_lower = para.lower()
        if any(kw.lower() in para_lower for kw in keywords):
            relevant.append(para)

    return "\n\n".join(relevant)

# Example: analyzing a long document for security issues
with open("full_report.txt", "r") as f:
    full_document = f.read()

# Instead of sending the full 50-page report...
full_tokens = count_and_report("Full document", full_document)

# ...extract only security-relevant sections
security_sections = extract_relevant_sections(
    full_document,
    keywords=["security", "vulnerability", "risk", "threat", "breach", "CVE"]
)
filtered_tokens = count_and_report("Filtered sections", security_sections)

savings = (1 - filtered_tokens / max(full_tokens, 1)) * 100
print(f"Token savings: {savings:.0f}%")
```

## Technique 3 - Use Structured Input Formats

Structured formats like JSON or key-value pairs are more token-efficient than natural language for conveying data.

```python
# Natural language format - more tokens
natural_format = """
The server named web-prod-01 is located in the us-central1 region. It is
running on an n2-standard-8 machine type. The current CPU utilization is
87 percent and memory usage is at 72 percent. The server has been running
for 45 days since last restart. There are currently 1,247 active connections.
"""

# Structured format - fewer tokens, same information
structured_format = """Server: web-prod-01
Region: us-central1
Type: n2-standard-8
CPU: 87%
Memory: 72%
Uptime: 45d
Connections: 1247"""

count_and_report("Natural format", natural_format)
count_and_report("Structured format", structured_format)
```

## Technique 4 - Optimize Few-Shot Examples

Few-shot examples improve output quality but consume tokens. Use the minimum number of examples needed, and keep each example concise.

```python
# Excessive examples - 6 examples when 2 would suffice
excessive_examples = """
Example 1:
Input: "Server CPU at 95% for 2 hours"
Output: {"severity": "critical", "category": "performance", "action": "scale_up"}

Example 2:
Input: "Disk usage reached 80%"
Output: {"severity": "warning", "category": "storage", "action": "cleanup"}

Example 3:
Input: "SSL certificate expires in 5 days"
Output: {"severity": "warning", "category": "security", "action": "renew_cert"}

Example 4:
Input: "Memory leak detected in worker process"
Output: {"severity": "critical", "category": "performance", "action": "restart_process"}

Example 5:
Input: "New deployment completed successfully"
Output: {"severity": "info", "category": "deployment", "action": "none"}

Example 6:
Input: "Database connection pool exhausted"
Output: {"severity": "critical", "category": "database", "action": "increase_pool"}
"""

# Optimized examples - 2 diverse examples that cover the pattern
optimized_examples = """
Examples:
"Server CPU at 95% for 2 hours" -> {"severity": "critical", "category": "performance", "action": "scale_up"}
"Disk usage reached 80%" -> {"severity": "warning", "category": "storage", "action": "cleanup"}
"""

count_and_report("6 examples", excessive_examples)
count_and_report("2 examples", optimized_examples)
```

## Technique 5 - Cache and Reuse Context

When multiple requests share the same context (like a document being queried repeatedly), use Gemini's context caching feature to avoid resending the same tokens.

```python
from vertexai.preview import caching

# Cache a large document that will be queried multiple times
with open("technical_manual.txt", "r") as f:
    manual_content = f.read()

# Create a cached content object
cached_content = caching.CachedContent.create(
    model_name="gemini-2.0-flash",
    contents=[manual_content],
    display_name="technical-manual-cache",
    # Cache expires after 1 hour
    ttl="3600s"
)

# Use the cached content for multiple queries - no need to resend the document
model_with_cache = GenerativeModel.from_cached_content(cached_content)

# Each query now only sends the question, not the full document
queries = [
    "What are the system requirements?",
    "How do I configure the network settings?",
    "What is the troubleshooting process for connection errors?",
]

for query in queries:
    response = model_with_cache.generate_content(query)
    print(f"Q: {query}")
    print(f"A: {response.text[:200]}...")
    print()
```

## Technique 6 - Control Output Length

Unnecessary long outputs waste tokens too. Set appropriate max_output_tokens and instruct the model to be concise.

```python
from vertexai.generative_models import GenerationConfig

# Configure generation to limit output tokens
config = GenerationConfig(
    max_output_tokens=256,   # Limit response length
    temperature=0.2,         # Lower temperature for more focused output
)

# Also instruct the model to be brief
prompt = """Classify this support ticket and suggest a response in under 50 words.

Ticket: "My invoice shows a charge I don't recognize from last month."

Format:
Category: [category]
Priority: [low/medium/high]
Suggested response: [brief response]"""

response = model.generate_content(prompt, generation_config=config)
print(response.text)
```

## Technique 7 - Batch Related Queries

Instead of making separate API calls for related queries, batch them into a single request.

```python
# Instead of 5 separate API calls...
logs = [
    "ERROR: Connection timeout to database",
    "WARNING: High memory usage on web-02",
    "ERROR: SSL handshake failed",
    "INFO: Deployment completed",
    "WARNING: Disk space below 20%",
]

# Bad: 5 separate calls (5x base overhead)
# for log in logs:
#     response = model.generate_content(f"Classify this log: {log}")

# Good: 1 batched call
batched_prompt = "Classify each log entry below. For each, give severity and category.\n\n"
for i, log in enumerate(logs, 1):
    batched_prompt += f"{i}. {log}\n"

response = model.generate_content(batched_prompt)
print(response.text)
```

## Measuring the Impact

Track your token usage over time to see how optimization efforts pay off.

```python
class TokenTracker:
    """Track token usage across requests."""

    def __init__(self):
        self.requests = []

    def track(self, prompt, response):
        """Record token usage for a request."""
        input_tokens = model.count_tokens(prompt).total_tokens
        output_tokens = model.count_tokens(response.text).total_tokens

        self.requests.append({
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens
        })

    def report(self):
        """Print a usage summary."""
        total_input = sum(r["input_tokens"] for r in self.requests)
        total_output = sum(r["output_tokens"] for r in self.requests)
        print(f"Total requests: {len(self.requests)}")
        print(f"Total input tokens: {total_input:,}")
        print(f"Total output tokens: {total_output:,}")
        print(f"Avg input per request: {total_input // max(len(self.requests), 1):,}")
```

## Wrapping Up

Token efficiency is about getting the same quality output with fewer tokens. The techniques here - trimming instructions, compressing context, using structured formats, optimizing examples, caching, controlling output, and batching - can reduce your token usage by 40-60% in most applications. Measure your baseline, apply these techniques, and track the improvement. Use monitoring tools like OneUptime to keep an eye on your API costs and latency as you optimize.
