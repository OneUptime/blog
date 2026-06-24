# How to Deploy GPT-4 Model in Azure OpenAI Service Using the Azure Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, OpenAI, GPT-4, AI, Cloud, Deployment, Machine Learning

Description: Step-by-step guide to deploying a GPT-4 model in Azure OpenAI Service through the Azure Portal with configuration tips and best practices.

---

Getting access to GPT-4.1 through Azure OpenAI Service gives you the power of OpenAI's models combined with the security, compliance, and enterprise features of Azure. Unlike using the OpenAI API directly, Azure OpenAI provides private networking, managed identity support, regional data residency, and content filtering out of the box. In this post, I will walk through the entire process of deploying a GPT-4.1 model using the Azure Portal.

## Prerequisites

Before you begin, make sure you have the following:

- An active Azure subscription. If you do not have one, you can create a free account at the Azure Portal.
- Access to Azure OpenAI Service in your subscription. Some models or modified content filtering features are limited access and may require a registration or request.
- Sufficient quota for GPT-4.1 in your desired region. Not every region supports every model or deployment type, so check the Azure OpenAI model availability page.

## Step 1: Create an Azure OpenAI Resource

Open the Azure Portal and navigate to "Create a resource." Search for "Azure OpenAI" in the marketplace. Click on the Azure OpenAI result and then click "Create."

You will need to fill in the following details:

- **Subscription**: Select your Azure subscription.
- **Resource group**: Choose an existing resource group or create a new one.
- **Region**: Pick a region that supports GPT-4.1 for the deployment type you plan to use.
- **Name**: Give your resource a unique name. This will form part of the endpoint URL.
- **Pricing tier**: Select Standard S0.

Click "Review + create" and then "Create" after validation passes. The deployment takes about a minute.

## Step 2: Navigate to Azure AI Foundry

Once the resource is deployed, go to the resource page and open it in Azure AI Foundry or navigate directly to ai.azure.com. Sign in with an account that has access to the resource.

Azure AI Foundry is the central hub where you manage model deployments, test prompts, configure content filters, and monitor usage. The interface is separate from the main Azure Portal, though the resources are linked.

## Step 3: Create a Model Deployment

In Azure AI Foundry, click on "Deployments" in the left sidebar. Then click "Create new deployment."

You will see a dialog with the following fields:

- **Model**: Select `gpt-4.1` from the dropdown. You may also see variants like `gpt-4.1-mini` or `gpt-4o` depending on availability.
- **Deployment name**: Give it a meaningful name like `gpt41-production` or `gpt41-dev`. This name is what you will reference in API calls.
- **Model version**: Choose the latest available version unless you have a specific reason to pin an older one.
- **Deployment type**: Standard is the default. You can also choose Provisioned Throughput if you need guaranteed capacity, though that comes at a higher cost.
- **Tokens per minute rate limit**: Set this based on your expected usage. You can start with a lower limit and increase later.

Click "Create" and wait for the deployment to finish. This usually takes under a minute.

## Step 4: Test the Deployment in the Playground

Azure AI Foundry includes a Playground feature that lets you interact with your deployed model without writing any code. Go to the "Chat" playground from the left sidebar.

Select your newly created deployment from the dropdown at the top. You can now type messages in the chat interface and see GPT-4.1 responses in real time.

The playground also lets you configure system messages, temperature, max tokens, and other parameters. This is a great place to prototype prompts before moving them into your application code.

## Step 5: Retrieve Your Endpoint and API Key

To call the model from your application, you need the endpoint URL and an API key. Go back to the Azure Portal, navigate to your Azure OpenAI resource, and click on "Keys and Endpoint" in the left sidebar.

You will see two keys (Key1 and Key2) and the endpoint URL. Copy these values. The endpoint looks something like:

```text
https://your-resource-name.openai.azure.com/
```

For production use, consider using Azure Managed Identity instead of API keys. This removes the need to store secrets in your application configuration.

## Step 6: Make Your First API Call

Here is a simple Python example showing how to call your deployed GPT-4.1 model. First, install the OpenAI Python library.

```bash
# Install the OpenAI Python SDK

pip install openai
```

Then use the following script to send a chat completion request:

```python
import openai

# Configure the client to use Azure OpenAI
client = openai.AzureOpenAI(
    api_key="your-api-key-here",          # Replace with your actual key
    api_version="2024-10-21",              # Use a supported stable API version
    azure_endpoint="https://your-resource-name.openai.azure.com/"  # Your endpoint
)

# Send a chat completion request to the deployed GPT-4.1 model
response = client.chat.completions.create(
    model="gpt41-production",  # This is your deployment name, not the model name
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain what Azure OpenAI Service is in two sentences."}
    ],
    temperature=0.7,   # Controls randomness (lower = more focused, higher = more creative)
    max_tokens=200      # Maximum number of tokens in the response
)

# Print the model's response
print(response.choices[0].message.content)
```

Notice that the `model` parameter in the API call is actually your deployment name, not the underlying model name. This is a common point of confusion when migrating from the OpenAI API to the Azure OpenAI API.

## Step 7: Configure Advanced Settings

There are several settings worth reviewing after your initial deployment.

### Content Filtering

Azure OpenAI applies default content filters that block harmful content in both inputs and outputs. You can customize these filters in Azure AI Foundry under "Content filters." For most production scenarios, the default settings are appropriate, but you might need to adjust them for specific use cases.

### Networking

By default, the Azure OpenAI resource is accessible over the public internet. For production workloads, consider configuring a private endpoint through Azure Private Link. This ensures traffic between your application and the OpenAI service stays within the Azure backbone network.

### Monitoring

Enable diagnostic logging for your Azure OpenAI resource. Go to the resource in the Azure Portal, click "Diagnostic settings," and configure logs to be sent to a Log Analytics workspace. This gives you visibility into request counts, token usage, latency, and errors.

### Regional Failover

If your application needs high availability, consider deploying the same model in multiple regions. You can then use Azure Traffic Manager or your own routing logic to fail over between regions if one becomes unavailable.

## Cost Considerations

Azure OpenAI pricing is based on tokens processed. Larger GPT-4.1-class models are more expensive than smaller models, so be mindful of token usage. Here are a few ways to manage costs:

- Set token-per-minute rate limits on your deployment to prevent runaway usage.
- Use a smaller model such as GPT-4.1 mini for simpler tasks and reserve GPT-4.1 for complex reasoning tasks.
- Monitor usage through Azure Cost Management and set up budget alerts.
- Use shorter system prompts where possible, since every token in the system message counts toward your usage.

## Common Issues and Troubleshooting

**"Model not found" error**: Make sure you are using the deployment name in your API calls, not the model name. If your deployment is named `gpt41-prod`, use that exact string.

**403 Forbidden**: Check that your API key is correct and that the key belongs to the correct resource. Also verify that your IP is not blocked by any network restrictions on the resource.

**429 Too Many Requests**: You have hit your rate limit. Either increase the tokens-per-minute limit on your deployment or implement retry logic with exponential backoff in your client code.

**Region availability**: Not all models are available in all regions. If GPT-4.1 is not showing up in the model dropdown, try creating your resource in a different region.

## Wrapping Up

Deploying GPT-4.1 in Azure OpenAI Service is straightforward once your subscription has access and quota. The Azure Portal and Azure AI Foundry provide a visual interface for the entire workflow, from creating the resource to testing prompts in the playground. For production workloads, make sure to configure private networking, enable diagnostic logging, and set appropriate rate limits. The combination of GPT-4.1 capabilities with Azure's enterprise infrastructure makes this a solid choice for organizations that need both powerful AI and robust security controls.
