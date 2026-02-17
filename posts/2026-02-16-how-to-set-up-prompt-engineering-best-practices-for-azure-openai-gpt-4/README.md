# How to Set Up Prompt Engineering Best Practices for Azure OpenAI GPT-4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, GPT-4, Prompt Engineering, AI, Best Practices, NLP

Description: Practical prompt engineering techniques for Azure OpenAI GPT-4 that improve response quality, consistency, and reliability in production applications.

---

Prompt engineering is the art and science of crafting inputs to language models to get the outputs you want. With GPT-4 on Azure OpenAI, the difference between a mediocre prompt and a well-engineered one can be the difference between a prototype that sort of works and a production system that reliably delivers value. In this post, I will share concrete prompt engineering techniques that I have found to work well with Azure OpenAI GPT-4, along with code examples you can adapt for your own applications.

## The Anatomy of a GPT-4 Prompt

Every Azure OpenAI chat completion request consists of an array of messages with three roles:

- **System**: Sets the model's behavior, personality, and constraints. This is processed once and applies to the entire conversation.
- **User**: The end user's input or question.
- **Assistant**: Previous model responses (used for multi-turn conversations).

The system message is where most of the prompt engineering happens. Here is the basic structure:

```python
messages = [
    {
        "role": "system",
        "content": "You are a technical support agent for Azure cloud services. "
                   "Answer questions accurately and concisely. If you are unsure "
                   "about something, say so rather than guessing."
    },
    {
        "role": "user",
        "content": "How do I resize a virtual machine?"
    }
]
```

## Technique 1: Be Specific About the Output Format

One of the most common problems is getting inconsistent output formats. If you need JSON, structured data, or a specific layout, tell the model exactly what you expect.

Bad prompt:
```
Analyze this customer feedback and tell me what you find.
```

Good prompt:
```
Analyze the following customer feedback. Return your analysis as JSON with these fields:
- sentiment: "positive", "negative", or "neutral"
- topics: array of topics mentioned
- urgency: "high", "medium", or "low"
- summary: one-sentence summary of the feedback

Return only valid JSON with no additional text.
```

Here is how this looks in code:

```python
def analyze_feedback(client, feedback_text):
    """
    Analyze customer feedback and return structured data.
    The prompt specifies the exact JSON format expected.
    """
    system_prompt = """You are a customer feedback analyst. Analyze the given feedback
and return your analysis as JSON with these exact fields:
- sentiment: "positive", "negative", or "neutral"
- topics: array of topic strings mentioned in the feedback
- urgency: "high", "medium", or "low" based on how time-sensitive the issue is
- summary: one-sentence summary

Return only valid JSON. No markdown formatting, no code blocks, just raw JSON."""

    response = client.chat.completions.create(
        model="gpt4-production",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": feedback_text}
        ],
        temperature=0.1,  # Low temperature for consistent structured output
        max_tokens=300
    )

    return json.loads(response.choices[0].message.content)
```

## Technique 2: Use Few-Shot Examples

Showing the model examples of desired behavior is often more effective than describing the behavior in words. Include 2-3 examples in your system prompt or as initial conversation turns.

```python
messages = [
    {
        "role": "system",
        "content": "Convert natural language descriptions into SQL queries for a PostgreSQL database."
    },
    # Few-shot example 1
    {
        "role": "user",
        "content": "Find all users who signed up last month"
    },
    {
        "role": "assistant",
        "content": "SELECT * FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE);"
    },
    # Few-shot example 2
    {
        "role": "user",
        "content": "Count orders by status"
    },
    {
        "role": "assistant",
        "content": "SELECT status, COUNT(*) as order_count FROM orders GROUP BY status ORDER BY order_count DESC;"
    },
    # Actual user query
    {
        "role": "user",
        "content": "Show me the top 10 customers by total spend"
    }
]
```

The model learns from these examples what style of SQL to write, what conventions to follow, and how detailed the output should be.

## Technique 3: Chain of Thought Prompting

For complex reasoning tasks, ask the model to think through the problem step by step. This significantly improves accuracy for tasks that require multiple logical steps.

```python
system_prompt = """You are a cloud architecture advisor. When answering questions:
1. First, identify the key requirements from the question.
2. Then, consider 2-3 possible Azure services that could meet those requirements.
3. Compare the options on cost, scalability, and complexity.
4. Recommend the best option with a clear justification.

Always show your reasoning before giving the final recommendation."""
```

This technique works because it forces the model to generate intermediate reasoning tokens, which improves the quality of the final answer. Without chain-of-thought, the model might jump to a conclusion that misses important considerations.

## Technique 4: Set Boundaries and Constraints

Tell the model what it should not do. This is especially important for customer-facing applications where wrong answers can have real consequences.

```python
system_prompt = """You are a medical information assistant for a healthcare website.

IMPORTANT CONSTRAINTS:
- Never provide specific medical diagnoses. Always recommend consulting a healthcare professional.
- Do not recommend specific medications or dosages.
- If asked about emergency symptoms (chest pain, difficulty breathing, severe bleeding),
  immediately advise calling emergency services.
- Only discuss information that is publicly available in peer-reviewed medical literature.
- If you are not confident in an answer, say "I am not sure about that - please consult
  your doctor for accurate medical advice."
- Never claim to be a doctor or medical professional."""
```

## Technique 5: Use Temperature and Parameters Wisely

Azure OpenAI GPT-4 has several parameters that affect output quality:

```python
response = client.chat.completions.create(
    model="gpt4-production",
    messages=messages,
    temperature=0.3,     # 0 = deterministic, 1 = creative. Use low for factual tasks.
    max_tokens=500,      # Limit response length
    top_p=0.95,          # Nucleus sampling - usually leave at default
    frequency_penalty=0, # Penalize repetition (0-2)
    presence_penalty=0   # Encourage new topics (0-2)
)
```

General guidance on temperature:

- **0.0-0.3**: Use for factual answers, data extraction, classification, code generation.
- **0.4-0.7**: Use for balanced tasks like summarization, general Q&A, content drafting.
- **0.8-1.0**: Use for creative writing, brainstorming, generating diverse options.

## Technique 6: Structured System Prompts with Sections

For complex applications, organize your system prompt into clear sections. This helps the model understand the hierarchy of instructions.

```python
system_prompt = """# Role
You are a senior DevOps engineer helping users troubleshoot Azure infrastructure issues.

# Knowledge Base
You are an expert in: Azure VMs, AKS, Azure Networking, Azure Storage, and Azure Monitor.
You have limited knowledge of: Azure AI services, Power Platform, Dynamics 365.
For topics outside your expertise, say "That is outside my area of expertise" and suggest
where the user can find help.

# Response Format
- Start with a brief assessment of the likely issue (1-2 sentences).
- List the diagnostic steps the user should follow, numbered.
- Include relevant Azure CLI commands when applicable.
- End with a "Next Steps" section if the issue might require escalation.

# Constraints
- Never suggest deleting resources without confirming with the user first.
- Always warn about potential downtime before suggesting changes to production resources.
- If a command could incur costs, mention it."""
```

## Technique 7: Prompt Versioning and Testing

Treat prompts like code. Version them, test them, and track changes.

```python
# Store prompts as versioned constants
PROMPTS = {
    "feedback_analyzer_v1": {
        "system": "Analyze customer feedback and return sentiment.",
        "version": "1.0",
        "last_updated": "2026-01-15"
    },
    "feedback_analyzer_v2": {
        "system": """Analyze customer feedback. Return JSON with:
- sentiment: positive/negative/neutral
- topics: array of topics
- urgency: high/medium/low
Return only valid JSON.""",
        "version": "2.0",
        "last_updated": "2026-02-01"
    }
}

def get_prompt(name, version="latest"):
    """
    Retrieve a versioned prompt by name.
    Allows easy A/B testing and rollback.
    """
    if version == "latest":
        # Find the highest version for this prompt name
        matching = {k: v for k, v in PROMPTS.items() if k.startswith(name)}
        return max(matching.values(), key=lambda x: x["version"])
    return PROMPTS.get(f"{name}_v{version}")
```

## Technique 8: Handle Edge Cases in the Prompt

Think about what could go wrong and address it in the prompt. What if the user's input is empty? What if it is in a different language? What if it contains contradictory instructions?

```python
system_prompt = """You are a data extraction assistant.

# Edge Case Handling
- If the input text is empty or contains only whitespace, respond with: {"error": "empty_input"}
- If the input is not in English, attempt to process it anyway but add a "language" field to the output.
- If the input contains contradictory information, extract all values and add a "conflicts" field listing the contradictions.
- If you cannot extract a required field, set it to null rather than guessing."""
```

## Common Mistakes to Avoid

**Over-engineering prompts**: Start simple and add complexity only when needed. A 2000-token system prompt is expensive and may confuse the model more than it helps.

**Ignoring the system message**: Putting all instructions in the user message means they get repeated every turn in a conversation, wasting tokens.

**Not testing with adversarial inputs**: Your prompt might work perfectly with polite, well-formed inputs but fall apart when users type gibberish, try to jailbreak, or send unexpected formats.

**Using vague instructions**: "Be helpful and accurate" tells the model nothing it does not already know. Be specific about what helpful and accurate mean in your context.

## Wrapping Up

Good prompt engineering is iterative. Start with a clear, specific system prompt. Test it with real user inputs. Identify failure modes. Add constraints and examples to address those failures. Version your prompts and track their performance over time. The techniques in this post provide a solid foundation, but the specific prompts that work best will depend on your use case and your users. Treat prompt development with the same rigor you would apply to any other engineering task, and you will get consistently better results from GPT-4.
