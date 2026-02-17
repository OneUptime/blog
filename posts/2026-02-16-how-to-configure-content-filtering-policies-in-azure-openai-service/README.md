# How to Configure Content Filtering Policies in Azure OpenAI Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, Content Filtering, Safety, AI Governance, Responsible AI

Description: A practical guide to configuring and customizing content filtering policies in Azure OpenAI Service to keep your AI applications safe and compliant.

---

Azure OpenAI Service comes with built-in content filtering that screens both the prompts users send and the responses the model generates. These filters are designed to catch harmful content before it reaches your users or before it influences the model's output. Unlike the OpenAI API, where content moderation is optional and separate, Azure bakes it directly into the service. This is one of the key reasons enterprises choose Azure OpenAI over the direct OpenAI API.

In this post, I will explain how the default content filters work, how to customize them for your specific use case, and how to handle filtered requests gracefully in your application.

## How Default Content Filtering Works

Every request to Azure OpenAI passes through a content filtering pipeline that evaluates both the input (prompt) and the output (completion). The filter checks for four harm categories:

- **Hate**: Content that attacks or discriminates against people based on protected characteristics.
- **Sexual**: Sexually explicit content.
- **Violence**: Content describing or promoting violence.
- **Self-harm**: Content related to self-harm or suicide.

Each category is evaluated at four severity levels:

- **Safe**: No harmful content detected.
- **Low**: Mildly harmful content.
- **Medium**: Moderately harmful content.
- **High**: Severely harmful content.

By default, Azure OpenAI blocks content rated Medium or higher in all four categories. This means Low severity content is allowed through, while Medium and High severity content is blocked.

When content is blocked, the API returns a 400 error with a specific error code indicating which filter was triggered.

## Creating a Custom Content Filter

Azure OpenAI Studio lets you create custom content filter configurations that you can apply to specific deployments. This is useful when you need to tighten or (in limited cases) loosen the default filters.

### Step 1: Open Content Filters in Azure OpenAI Studio

Navigate to Azure OpenAI Studio (oai.azure.com). Click on "Content filters" in the left sidebar. You will see the default filter configuration and any custom configurations you have created.

### Step 2: Create a New Filter Configuration

Click "Create content filter." Give it a descriptive name like `strict-production-filter` or `medical-content-filter`.

You will see a table with the four harm categories and separate columns for input and output filtering. For each category, you can set the threshold to one of:

- **Low, Medium, High**: Blocks content at that severity level and above.
- **High only**: Only blocks the most severe content.
- **Off**: Disables filtering for that category (requires approval from Microsoft for most accounts).

Here is an example configuration for a customer-facing chatbot where you want strict filtering:

| Category | Input Filter | Output Filter |
|----------|-------------|---------------|
| Hate | Low and above | Low and above |
| Sexual | Low and above | Low and above |
| Violence | Medium and above | Low and above |
| Self-harm | Low and above | Low and above |

This configuration blocks almost all potentially harmful content. The violence input filter is set slightly looser at Medium because users might legitimately describe a problem involving minor conflict without malicious intent.

### Step 3: Configure Additional Filters

Beyond the four main harm categories, Azure OpenAI offers additional filtering options:

**Jailbreak detection (Prompt Shields)**: This filter detects attempts to manipulate the model into bypassing its safety guidelines. It catches techniques like "ignore your instructions and do X" or indirect prompt injection attacks embedded in user-provided documents.

```
Enable prompt shields: Yes
- User prompt attack detection: Enabled
- Document attack detection: Enabled
```

**Protected material detection**: This filter checks if the model's output contains known copyrighted text (like song lyrics, news articles, or book passages). You can block or annotate such content.

**Groundedness detection**: For RAG scenarios, this filter checks whether the model's response is grounded in the provided context or if it is hallucinating information.

### Step 4: Apply the Filter to a Deployment

After creating your custom filter configuration, go to "Deployments" in Azure OpenAI Studio. Select the deployment you want to protect. In the deployment settings, change the content filter from "Default" to your custom configuration.

You can apply different filter configurations to different deployments. For example, you might use strict filters on your production chatbot deployment and more relaxed filters on an internal research deployment.

## Handling Filtered Content in Your Application

When the content filter blocks a request, the API returns an error response. Your application needs to handle this gracefully.

```python
import openai

client = openai.AzureOpenAI(
    api_key="your-api-key",
    api_version="2024-02-01",
    azure_endpoint="https://your-resource.openai.azure.com/"
)

def safe_completion(messages):
    """
    Send a completion request with proper handling for content filter blocks.
    Returns the response text or a user-friendly error message.
    """
    try:
        response = client.chat.completions.create(
            model="gpt4-production",
            messages=messages,
            max_tokens=500
        )
        return {
            "success": True,
            "content": response.choices[0].message.content
        }

    except openai.BadRequestError as e:
        error_body = e.body
        # Check if this is a content filter error
        if error_body and "content_filter" in str(error_body).lower():
            return {
                "success": False,
                "content": "Your request could not be processed because it was "
                           "flagged by our content safety filters. Please rephrase "
                           "your question and try again.",
                "filter_reason": str(error_body)
            }
        # Re-raise if it is a different type of bad request
        raise

    except openai.RateLimitError:
        return {
            "success": False,
            "content": "The service is currently busy. Please try again in a moment."
        }
```

### Inspecting Filter Results

When content is not blocked but passes through the filter, you can inspect the filter results in the response to see the severity ratings. This is useful for logging and monitoring.

```python
response = client.chat.completions.create(
    model="gpt4-production",
    messages=[{"role": "user", "content": "Tell me about conflict resolution."}],
    max_tokens=500
)

# Check the content filter results on the response
if hasattr(response.choices[0], 'content_filter_results'):
    filters = response.choices[0].content_filter_results
    print(f"Hate: {filters.get('hate', {}).get('severity', 'safe')}")
    print(f"Sexual: {filters.get('sexual', {}).get('severity', 'safe')}")
    print(f"Violence: {filters.get('violence', {}).get('severity', 'safe')}")
    print(f"Self-harm: {filters.get('self_harm', {}).get('severity', 'safe')}")
```

## Annotations and Logging

For compliance and auditing purposes, you may want to log content filter annotations even when content is not blocked. This gives you visibility into the types of content flowing through your application.

The Azure OpenAI API includes filter annotations in the response when content passes through but is flagged at a low severity level. You can capture these annotations and send them to your logging infrastructure.

Consider building a dashboard that tracks:

- Number of blocked requests per day, broken down by filter category.
- Distribution of severity levels across all requests.
- Most common user inputs that trigger filters.
- Trends over time to detect potential abuse patterns.

## Common Scenarios and Filter Configurations

**Healthcare applications**: Medical discussions often involve descriptions of injuries, symptoms, and bodily functions. You may need to request adjusted violence and sexual content thresholds to avoid false positives while still blocking genuinely harmful content.

**Education platforms**: Educational content about history may reference violence. Consider using Medium and above thresholds for violence to allow factual historical discussions while still catching graphic or gratuitous content.

**Customer service bots**: Use the strictest settings. There is rarely a legitimate reason for a customer service bot to discuss any of the harm categories.

**Creative writing tools**: These may need more permissive settings, but be cautious. Work with Microsoft support to understand what adjustments are possible and what approval processes are required.

## Monitoring Filter Performance

Azure OpenAI integrates with Azure Monitor. Enable diagnostic settings to send content filter events to a Log Analytics workspace. You can then use KQL queries to analyze filter activity.

```kql
// Find all blocked requests in the last 24 hours
AzureDiagnostics
| where TimeGenerated > ago(24h)
| where Category == "ContentFilter"
| where resultType_s == "Blocked"
| summarize BlockedCount = count() by filterCategory_s
| order by BlockedCount desc
```

This data is valuable for tuning your filter configurations. If you see a high volume of false positives in a particular category, you may need to adjust your thresholds. If you see a high volume of legitimate blocks, it might indicate that users are testing the boundaries of your application.

## Wrapping Up

Content filtering in Azure OpenAI is not just a checkbox - it is a critical component of responsible AI deployment. The default filters provide a solid baseline, but custom configurations let you tailor the filtering to your specific use case and risk tolerance. Always handle filtered content gracefully in your application, log filter events for compliance, and monitor filter performance to catch both false positives and genuine abuse. Getting content filtering right is one of the most important things you can do when building AI-powered applications for production use.
