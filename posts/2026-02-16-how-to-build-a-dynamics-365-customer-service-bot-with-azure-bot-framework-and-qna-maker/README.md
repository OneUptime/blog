# How to Build a Dynamics 365 Customer Service Bot with Azure Bot Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dynamics 365, Azure Bot Framework, QnA Maker, Customer Service, Chatbot, AI, Omnichannel

Description: Build a customer service chatbot that integrates with Dynamics 365 Customer Service using Azure Bot Framework and QnA Maker for automated case resolution.

---

Customer service teams deal with the same questions over and over. Password resets, order status checks, return policies, product FAQs - these are all questions that a bot can handle instantly, freeing up human agents for complex issues. When you connect that bot to Dynamics 365 Customer Service, you get the best of both worlds: automated responses for common questions and seamless handoff to a human agent when the bot cannot help.

In this guide, I will build a customer service bot using Azure Bot Framework and Azure AI Language custom question answering that integrates with Dynamics 365 Customer Service through the Omnichannel for Customer Service module.

## Architecture

```mermaid
graph TD
    A[Customer] --> B[Web Chat / Teams / SMS]
    B --> C[Azure Bot Service]
    C --> D[Bot Framework SDK]
    D --> E{Intent Recognition}
    E -->|FAQ| F[Azure AI Language custom question answering]
    E -->|Case Status| G[Dynamics 365 API]
    E -->|Complex Issue| H[Handoff to Agent]
    F --> D
    G --> D
    H --> I[Dynamics 365 Omnichannel]
    I --> J[Human Agent]
```

The bot receives customer messages through various channels, determines the intent, and either answers from the question answering project, queries Dynamics 365 for case-specific information, or escalates to a human agent.

## Setting Up Custom Question Answering

Create an Azure AI Language resource with custom question answering enabled. Custom question answering uses Azure AI Search for its indexed project content, so pass the Azure AI Search endpoint and key when you create the Language resource:

```bash
# Create an Azure AI Language resource for custom question answering

az cognitiveservices account create \
  --name language-customer-service \
  --resource-group rg-d365-bot \
  --kind TextAnalytics \
  --sku S0 \
  --location westus \
  --custom-domain language-customer-service \
  --api-properties \
      qnaAzureSearchEndpointId="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-d365-bot/providers/Microsoft.Search/searchServices/$SEARCH_SERVICE_NAME" \
      qnaAzureSearchEndpointKey="$SEARCH_ADMIN_KEY" \
  --yes
```

Create and deploy a custom question answering project in Azure AI Foundry, then populate it with your FAQ data. You can import from URLs, documents, or define Q&A pairs manually:

```json
{
    "assets": {
        "qnas": [
            {
                "id": 1,
                "answer": "You can reset your password by visiting our account portal at https://account.yourcompany.com/reset. Click 'Forgot Password' and follow the instructions sent to your email.",
                "source": "customer-faq",
                "questions": [
                    "How do I reset my password?",
                    "I forgot my password",
                    "Can't log in to my account",
                    "Password reset"
                ],
                "metadata": {
                    "category": "account"
                }
            },
            {
                "id": 2,
                "answer": "Our return policy allows returns within 30 days of purchase. Items must be in original condition with all packaging. To start a return, log in to your account and go to Order History, then click 'Return Item' next to the order.",
                "source": "customer-faq",
                "questions": [
                    "What is your return policy?",
                    "How do I return an item?",
                    "Can I return a product?",
                    "Return window",
                    "How long do I have to return something?"
                ],
                "metadata": {
                    "category": "returns"
                }
            },
            {
                "id": 3,
                "answer": "Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days. Overnight shipping is available for orders placed before 2 PM EST. You can check your order status anytime by asking me 'What is my order status?' and providing your order number.",
                "source": "customer-faq",
                "questions": [
                    "How long does shipping take?",
                    "When will my order arrive?",
                    "Shipping times",
                    "Express shipping options",
                    "How fast is delivery?"
                ],
                "metadata": {
                    "category": "shipping"
                }
            }
        ]
    }
}
```

## Building the Bot Application

Here is the bot built with the Bot Framework SDK in C#:

```csharp
// Main bot class that handles customer service interactions
public class CustomerServiceBot : ActivityHandler
{
    private readonly QuestionAnsweringClient _questionAnsweringClient;
    private readonly QuestionAnsweringProject _questionAnsweringProject;
    private readonly IDynamics365Client _d365Client;
    private readonly ConversationState _conversationState;
    private readonly ILogger<CustomerServiceBot> _logger;

    public CustomerServiceBot(
        QuestionAnsweringClient questionAnsweringClient,
        QuestionAnsweringProject questionAnsweringProject,
        IDynamics365Client d365Client,
        ConversationState conversationState,
        ILogger<CustomerServiceBot> logger)
    {
        _questionAnsweringClient = questionAnsweringClient;
        _questionAnsweringProject = questionAnsweringProject;
        _d365Client = d365Client;
        _conversationState = conversationState;
        _logger = logger;
    }

    protected override async Task OnMessageActivityAsync(
        ITurnContext<IMessageActivity> turnContext,
        CancellationToken cancellationToken)
    {
        var text = turnContext.Activity.Text?.Trim();
        if (string.IsNullOrEmpty(text)) return;

        // Get conversation state to track the dialog flow
        var stateAccessor = _conversationState
            .CreateProperty<ConversationData>("ConversationData");
        var conversationData = await stateAccessor.GetAsync(
            turnContext, () => new ConversationData(), cancellationToken);

        // Check if the user is in the middle of a specific flow
        if (conversationData.CurrentFlow == "case-status")
        {
            await HandleCaseStatusLookupAsync(turnContext, text, conversationData, cancellationToken);
            await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken);
            return;
        }

        // Check for specific intents first
        if (text.Contains("order status", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("case status", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("ticket status", StringComparison.OrdinalIgnoreCase))
        {
            conversationData.CurrentFlow = "case-status";
            await turnContext.SendActivityAsync(
                "I can help you check your case status. Please provide your " +
                "case number.",
                cancellationToken: cancellationToken);
            await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken);
            return;
        }

        if (text.Contains("talk to agent", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("human", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("speak to someone", StringComparison.OrdinalIgnoreCase))
        {
            await InitiateHandoffAsync(turnContext, conversationData, cancellationToken);
            return;
        }

        // Try custom question answering for FAQ-type questions
        var answerResponse = await _questionAnsweringClient.GetAnswersAsync(
            text,
            _questionAnsweringProject,
            cancellationToken: cancellationToken);
        var answers = answerResponse.Value.Answers;

        if (answers.Count > 0 && answers[0].Confidence > 0.7)
        {
            // High confidence answer from custom question answering
            await turnContext.SendActivityAsync(
                answers[0].Answer,
                cancellationToken: cancellationToken);

            // Ask if the answer was helpful
            await turnContext.SendActivityAsync(
                "Was this helpful? If you need more assistance, I can connect " +
                "you with a support agent.",
                cancellationToken: cancellationToken);
        }
        else if (answers.Count > 0 && answers[0].Confidence > 0.4)
        {
            // Medium confidence - provide the answer but offer alternatives
            await turnContext.SendActivityAsync(
                $"I think this might help:\n\n{answers[0].Answer}\n\n" +
                "If this doesn't answer your question, I can connect you " +
                "with a support agent. Just say 'talk to agent'.",
                cancellationToken: cancellationToken);
        }
        else
        {
            // Low confidence - offer to create a case or transfer to agent
            await turnContext.SendActivityAsync(
                "I'm not sure I can answer that. Would you like me to:\n" +
                "1. Create a support case for you\n" +
                "2. Connect you with a support agent\n\n" +
                "Just reply with 1 or 2.",
                cancellationToken: cancellationToken);

            conversationData.CurrentFlow = "escalation-choice";
            await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken);
        }
    }

    private async Task HandleCaseStatusLookupAsync(
        ITurnContext turnContext,
        string caseNumber,
        ConversationData conversationData,
        CancellationToken cancellationToken)
    {
        // Clean up the case number input
        caseNumber = caseNumber.Trim().ToUpper();

        if (caseNumber.Length < 3)
        {
            await turnContext.SendActivityAsync(
                "That doesn't look like a valid case number. Please " +
                "double-check the number and try again.",
                cancellationToken: cancellationToken);
            return;
        }

        try
        {
            // Query Dynamics 365 for the case
            var caseInfo = await _d365Client.GetCaseByNumberAsync(caseNumber);

            if (caseInfo != null)
            {
                var statusText = caseInfo.StatusCode switch
                {
                    1 => "In Progress",
                    2 => "On Hold",
                    3 => "Waiting for Details",
                    4 => "Researching",
                    5 => "Problem Solved",
                    6 => "Cancelled",
                    1000 => "Information Provided",
                    2000 => "Merged",
                    _ => "Open"
                };

                await turnContext.SendActivityAsync(
                    $"Here's the status of your case:\n\n" +
                    $"**Case Number:** {caseInfo.CaseNumber}\n" +
                    $"**Title:** {caseInfo.Title}\n" +
                    $"**Status:** {statusText}\n" +
                    $"**Priority:** {caseInfo.Priority}\n" +
                    $"**Created:** {caseInfo.CreatedOn:MMMM d, yyyy}\n" +
                    $"**Assigned To:** {caseInfo.AssignedTo}\n\n" +
                    "Is there anything else I can help you with?",
                    cancellationToken: cancellationToken);
            }
            else
            {
                await turnContext.SendActivityAsync(
                    $"I couldn't find a case with number {caseNumber}. " +
                    "Please double-check the number and try again, or I can " +
                    "connect you with an agent.",
                    cancellationToken: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to look up case: {CaseNumber}", caseNumber);
            await turnContext.SendActivityAsync(
                "Sorry, I'm having trouble looking up that case right now. " +
                "Let me connect you with an agent who can help.",
                cancellationToken: cancellationToken);
        }

        // Reset the conversation flow
        conversationData.CurrentFlow = null;
    }

    private async Task InitiateHandoffAsync(
        ITurnContext turnContext,
        ConversationData conversationData,
        CancellationToken cancellationToken)
    {
        // Build a summary of the conversation for the agent
        var summary = $"Customer requested agent assistance. " +
                      $"Topic: {conversationData.LastTopic ?? "General inquiry"}";

        // Create an event to trigger the Omnichannel handoff
        var handoffEvent = EventFactory.CreateHandoffInitiation(
            turnContext,
            new { summary, customerEmail = conversationData.CustomerEmail });

        await turnContext.SendActivityAsync(handoffEvent, cancellationToken);

        await turnContext.SendActivityAsync(
            "I'm connecting you with a support agent now. Please hold on - " +
            "someone will be with you shortly.",
            cancellationToken: cancellationToken);
    }

    protected override async Task OnMembersAddedAsync(
        IList<ChannelAccount> membersAdded,
        ITurnContext<IConversationUpdateActivity> turnContext,
        CancellationToken cancellationToken)
    {
        foreach (var member in membersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(
                    "Hi! I'm your customer service assistant. I can help with:\n\n" +
                    "- Answering common questions about our products and services\n" +
                    "- Checking the status of your support case\n" +
                    "- Connecting you with a support agent\n\n" +
                    "What can I help you with today?",
                    cancellationToken: cancellationToken);
            }
        }
    }
}
```

## Querying Dynamics 365 for Case Data

The Dynamics 365 client queries Dataverse for case information:

```csharp
// Client for querying Dynamics 365 Customer Service data
public class Dynamics365Client : IDynamics365Client
{
    private readonly HttpClient _httpClient;

    public Dynamics365Client(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("Dataverse");
    }

    public async Task<CaseInfo> GetCaseByNumberAsync(string caseNumber)
    {
        var escapedCaseNumber = EscapeODataString(caseNumber);

        // Query the incident (case) table by case number
        var query = $"incidents?" +
                    $"$filter=ticketnumber eq '{escapedCaseNumber}'&" +
                    $"$select=ticketnumber,title,statuscode,prioritycode,createdon&" +
                    $"$expand=ownerid($select=fullname)";

        var response = await _httpClient.GetAsync($"api/data/v9.2/{query}");
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<DataverseResponse>();

        if (data.Value == null || data.Value.Count == 0)
            return null;

        var incident = data.Value[0];

        return new CaseInfo
        {
            CaseNumber = incident["ticketnumber"]?.ToString(),
            Title = incident["title"]?.ToString(),
            StatusCode = Convert.ToInt32(incident["statuscode"]),
            Priority = GetPriorityText(Convert.ToInt32(incident["prioritycode"])),
            CreatedOn = DateTime.Parse(incident["createdon"].ToString()),
            AssignedTo = incident["ownerid"]?["fullname"]?.ToString() ?? "Unassigned"
        };
    }

    // Create a new case in Dynamics 365
    public async Task<string> CreateCaseAsync(
        string title, string description, string customerEmail)
    {
        var escapedCustomerEmail = EscapeODataString(customerEmail);

        // Look up the contact by email
        var contactResponse = await _httpClient.GetAsync(
            $"api/data/v9.2/contacts?$filter=emailaddress1 eq '{escapedCustomerEmail}'&$select=contactid");
        contactResponse.EnsureSuccessStatusCode();
        var contactData = await contactResponse.Content.ReadFromJsonAsync<DataverseResponse>();

        if (contactData.Value == null || contactData.Value.Count == 0)
            throw new InvalidOperationException(
                $"No Dynamics 365 contact was found for {customerEmail}.");

        var newCase = new Dictionary<string, object>
        {
            ["title"] = title,
            ["description"] = description,
            ["caseorigincode"] = 3, // Web origin; use a custom option for chat if configured
            ["prioritycode"] = 2    // Normal priority
        };

        var contactId = contactData.Value[0]["contactid"].ToString();
        newCase["customerid_contact@odata.bind"] = $"/contacts({contactId})";

        var response = await _httpClient.PostAsJsonAsync(
            "api/data/v9.2/incidents", newCase);
        response.EnsureSuccessStatusCode();

        // Get the case number from the response
        var entityId = response.Headers.GetValues("OData-EntityId").Single();
        var caseId = entityId.Split('(')[1].TrimEnd(')');

        var caseResponse = await _httpClient.GetAsync(
            $"api/data/v9.2/incidents({caseId})?$select=ticketnumber");
        var caseData = await caseResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        return caseData["ticketnumber"].ToString();
    }

    private string GetPriorityText(int priorityCode)
    {
        return priorityCode switch
        {
            1 => "High",
            2 => "Normal",
            3 => "Low",
            _ => "Normal"
        };
    }

    private static string EscapeODataString(string value)
    {
        return value.Replace("'", "''");
    }
}
```

## Configuring Omnichannel Integration

To use the bot with Dynamics 365 Omnichannel for Customer Service, register it as an Azure agent and bot application user:

1. In the Azure portal, open the bot resource, go to Channels, add the Omnichannel channel, and apply the configuration
2. In the Power Platform admin center, create a new application user for the bot's Microsoft Entra application and assign the Omnichannel agent role
3. In Copilot Service admin center, open the application user, set User type to Bot application user, and provide the Bot Application ID
4. Add the bot user to the relevant workstream and configure routing rules to direct conversations to the bot first

The handoff from bot to human agent is handled through the Omnichannel context variables that the bot sets during the conversation.

## Deploying the Bot

After deploying the bot app to Azure App Service, register the Azure Bot resource with the App Service messaging endpoint:

```bash
# Create the Azure Bot resource
az bot create \
  --resource-group rg-d365-bot \
  --name bot-customer-service \
  --app-type UserAssignedMSI \
  --sku S1 \
  --appid $MANAGED_IDENTITY_CLIENT_ID \
  --msi-resource-id $USER_ASSIGNED_MSI_RESOURCE_ID \
  --tenant-id $TENANT_ID \
  --endpoint "https://bot-customer-service.azurewebsites.net/api/messages"

# Enable the Teams channel
az bot msteams create --resource-group rg-d365-bot --name bot-customer-service
```

## Wrapping Up

A customer service bot that integrates with Dynamics 365 and Azure AI Language custom question answering handles the routine questions automatically while providing seamless escalation to human agents for complex issues. Custom question answering gives the bot a broad knowledge base without writing code for every answer. The Dynamics 365 integration lets the bot look up real case data and create new cases. And the Omnichannel handoff ensures that when the bot reaches its limits, the customer gets a smooth transition to a human agent who has the full conversation context. Start with your top 50 most common questions in your question answering project, deploy the bot to one channel, measure the deflection rate, and expand from there.
