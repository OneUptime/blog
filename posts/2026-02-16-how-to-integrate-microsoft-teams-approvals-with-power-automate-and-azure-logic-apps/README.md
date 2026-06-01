# How to Integrate Microsoft Teams Approvals with Power Automate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Teams, Power Automate, Azure Logic Apps, Approval, Workflow Automation, Business Process, Low-Code

Description: Integrate Microsoft Teams Approvals with Power Automate and Azure Logic Apps to build automated approval workflows triggered by business events.

---

Approval workflows are everywhere in organizations. Purchase requests, time-off approvals, document reviews, expense reports, change requests - they all follow the same pattern: someone submits a request, one or more people need to approve or reject it, and the system needs to take action based on the outcome.

Microsoft Teams has a built-in Approvals app, and when you connect it with Power Automate, you can build sophisticated approval workflows that trigger from many business events. Azure Logic Apps can still be part of the architecture for complex enterprise scenarios, but the Teams approval itself should be created by a Power Automate approval flow that the logic app invokes.

## How Teams Approvals Work

The Teams Approvals framework has three components:

```mermaid
graph LR
    A[Trigger Event] --> B[Power Automate / Logic App]
    B --> C[Power Automate Creates Approval Request]
    C --> D[Teams Approvals App]
    D --> E[Approver Reviews]
    E --> F[Approve / Reject]
    F --> G[Power Automate / Logic App]
    G --> H[Take Action]
```

A business event triggers the workflow, Power Automate creates an approval request, Teams delivers it to the approver, the approver responds, and the workflow takes the appropriate action.

## Basic Approval Flow with Power Automate

Let us start with a straightforward scenario: approving purchase requests submitted through a SharePoint list. Here is the relevant part of the Power Automate flow definition:

```json
{
    "definition": {
        "triggers": {
            "When_an_item_is_created": {
                "type": "OpenApiConnection",
                "inputs": {
                    "host": {
                        "connectionName": "shared_sharepointonline",
                        "operationId": "GetOnNewItems",
                        "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
                    },
                    "parameters": {
                        "dataset": "https://yourcompany.sharepoint.com/sites/Procurement",
                        "table": "PurchaseRequests"
                    }
                }
            }
        },
        "actions": {
            "Start_and_wait_for_an_approval": {
                "type": "OpenApiConnectionWebhook",
                "inputs": {
                    "host": {
                        "connectionName": "shared_approvals",
                        "operationId": "StartAndWaitForAnApproval",
                        "apiId": "/providers/Microsoft.PowerApps/apis/shared_approvals"
                    },
                    "parameters": {
                        "approvalType": "Basic",
                        "WebhookApprovalCreationInput/title": "Purchase Request: @{triggerOutputs()?['body/Title']}",
                        "WebhookApprovalCreationInput/assignedTo": "@{triggerOutputs()?['body/ManagerEmail']}",
                        "WebhookApprovalCreationInput/details": "Amount: $@{triggerOutputs()?['body/Amount']}\nVendor: @{triggerOutputs()?['body/Vendor']}\nJustification: @{triggerOutputs()?['body/Justification']}",
                        "WebhookApprovalCreationInput/itemLink": "https://yourcompany.sharepoint.com/sites/Procurement/Lists/PurchaseRequests/DispForm.aspx?ID=@{triggerOutputs()?['body/ID']}",
                        "WebhookApprovalCreationInput/itemLinkDescription": "View Request",
                        "WebhookApprovalCreationInput/enableNotifications": true
                    }
                }
            }
        }
    }
}
```

The approver receives an approval request through the approval experience, with Approve and Reject responses. With notifications enabled, Power Automate can send email, push, and Teams notifications for the request.

## Multi-Stage Approval with Power Automate

For requests above a certain threshold, you might need multiple levels of approval. The manager approves first, then the finance director:

```json
{
    "actions": {
        "Check_Amount": {
            "type": "If",
            "expression": {
                "greaterOrEquals": [
                    "@triggerOutputs()?['body/Amount']",
                    5000
                ]
            },
            "actions": {
                "Manager_Approval": {
                    "type": "OpenApiConnectionWebhook",
                    "inputs": {
                        "host": {
                            "connectionName": "shared_approvals",
                            "operationId": "StartAndWaitForAnApproval",
                            "apiId": "/providers/Microsoft.PowerApps/apis/shared_approvals"
                        },
                        "parameters": {
                            "approvalType": "Basic",
                            "WebhookApprovalCreationInput/title": "Purchase Request Approval (Stage 1): @{triggerOutputs()?['body/Title']}",
                            "WebhookApprovalCreationInput/assignedTo": "@{triggerOutputs()?['body/ManagerEmail']}",
                            "WebhookApprovalCreationInput/details": "Amount: $@{triggerOutputs()?['body/Amount']}",
                            "WebhookApprovalCreationInput/enableNotifications": true
                        }
                    }
                },
                "Check_Manager_Response": {
                    "type": "If",
                    "runAfter": { "Manager_Approval": ["Succeeded"] },
                    "expression": {
                        "equals": [
                            "@body('Manager_Approval')?['outcome']",
                            "Approve"
                        ]
                    },
                    "actions": {
                        "Finance_Director_Approval": {
                            "type": "OpenApiConnectionWebhook",
                            "inputs": {
                                "host": {
                                    "connectionName": "shared_approvals",
                                    "operationId": "StartAndWaitForAnApproval",
                                    "apiId": "/providers/Microsoft.PowerApps/apis/shared_approvals"
                                },
                                "parameters": {
                                    "approvalType": "Basic",
                                    "WebhookApprovalCreationInput/title": "Purchase Request Approval (Stage 2): @{triggerOutputs()?['body/Title']}",
                                    "WebhookApprovalCreationInput/assignedTo": "finance.director@yourcompany.com",
                                    "WebhookApprovalCreationInput/details": "Manager approved. Amount: $@{triggerOutputs()?['body/Amount']}",
                                    "WebhookApprovalCreationInput/enableNotifications": true
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

## Azure Logic Apps for Enterprise Scenarios

When you need more control, error handling, and integration with enterprise systems, Azure Logic Apps provides a more robust orchestration platform. The Standard approvals connector is not available directly in Azure Logic Apps, so a supported pattern is to have the logic app call a Power Automate flow with an HTTP trigger. That flow creates the approval with the Start and wait for an approval action, then returns the outcome to the logic app.

Here is a Logic App that handles an expense report workflow by calling a Power Automate approval flow with parallel approvers:

```json
{
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
        "When_a_HTTP_request_is_received": {
            "type": "Request",
            "kind": "Http",
            "inputs": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "requestId": { "type": "string" },
                        "submitter": { "type": "string" },
                        "amount": { "type": "number" },
                        "category": { "type": "string" },
                        "description": { "type": "string" },
                        "approvers": {
                            "type": "array",
                            "items": { "type": "string" }
                        }
                    }
                }
            }
        }
    },
    "actions": {
        "Run_Power_Automate_Approval": {
            "type": "Http",
            "inputs": {
                "method": "POST",
                "uri": "@parameters('approvalFlowUrl')",
                "body": {
                    "title": "Expense Report: @{triggerBody()?['description']}",
                    "approvalType": "Custom responses - Wait for all responses",
                    "assignedTo": "@{join(triggerBody()?['approvers'], ';')}",
                    "details": "Submitted by: @{triggerBody()?['submitter']}\nAmount: $@{triggerBody()?['amount']}\nCategory: @{triggerBody()?['category']}",
                    "responseOptions": ["Approve", "Reject", "Request More Info"]
                }
            }
        },
        "Handle_Response": {
            "type": "Switch",
            "runAfter": { "Run_Power_Automate_Approval": ["Succeeded"] },
            "expression": "@body('Run_Power_Automate_Approval')?['outcome']",
            "cases": {
                "Approved": {
                    "case": "Approve",
                    "actions": {
                        "Process_Reimbursement": {
                            "type": "Http",
                            "inputs": {
                                "method": "POST",
                                "uri": "https://api.yourcompany.com/expenses/process",
                                "body": {
                                    "requestId": "@{triggerBody()?['requestId']}",
                                    "status": "approved",
                                    "approvedBy": "@{body('Run_Power_Automate_Approval')?['responses'][0]?['approver']}"
                                }
                            }
                        },
                        "Notify_Submitter_Approved": {
                            "type": "Http",
                            "inputs": {
                                "method": "POST",
                                "uri": "https://graph.microsoft.com/v1.0/chats/{submitter-chat-id}/messages",
                                "authentication": {
                                    "type": "ManagedServiceIdentity",
                                    "audience": "https://graph.microsoft.com"
                                },
                                "body": {
                                    "body": {
                                        "contentType": "text",
                                        "content": "Your expense report has been approved and is being processed for reimbursement."
                                    }
                                }
                            }
                        }
                    }
                },
                "Rejected": {
                    "case": "Reject",
                    "actions": {
                        "Update_Status_Rejected": {
                            "type": "Http",
                            "inputs": {
                                "method": "POST",
                                "uri": "https://api.yourcompany.com/expenses/reject",
                                "body": {
                                    "requestId": "@{triggerBody()?['requestId']}",
                                    "reason": "@{body('Run_Power_Automate_Approval')?['responses'][0]?['comments']}"
                                }
                            }
                        }
                    }
                },
                "NeedInfo": {
                    "case": "Request More Info",
                    "actions": {
                        "Send_Info_Request": {
                            "type": "Http",
                            "inputs": {
                                "method": "POST",
                                "uri": "https://graph.microsoft.com/v1.0/chats/{submitter-chat-id}/messages",
                                "authentication": {
                                    "type": "ManagedServiceIdentity",
                                    "audience": "https://graph.microsoft.com"
                                },
                                "body": {
                                    "body": {
                                        "contentType": "text",
                                        "content": "Your expense report requires additional information. Please update and resubmit. Comments: @{body('Run_Power_Automate_Approval')?['responses'][0]?['comments']}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

## Approval Reminders and Escalation

Approvals that sit unanswered slow down business processes. Build in reminders and escalation:

```csharp
// Azure Function that sends reminders for pending approvals
public class ApprovalReminderFunction
{
    private readonly GraphServiceClient _graphClient;

    [FunctionName("SendApprovalReminders")]
    public async Task Run(
        [TimerTrigger("0 0 9 * * 1-5")] TimerInfo timer, // 9 AM weekdays
        ILogger log)
    {
        // Query for approvals that have been pending more than 24 hours
        var pendingApprovals = await GetPendingApprovalsAsync(
            TimeSpan.FromHours(24));

        foreach (var approval in pendingApprovals)
        {
            // Send a Teams chat message reminder
            var message = new ChatMessage
            {
                Body = new ItemBody
                {
                    Content = $"Reminder: You have a pending approval request " +
                              $"'{approval.Title}' submitted {approval.SubmittedAt:g}. " +
                              $"Please review and respond at your earliest convenience.",
                    ContentType = BodyType.Text
                }
            };

            await _graphClient.Chats[approval.ApproverChatId]
                .Messages
                .PostAsync(message);

            log.LogInformation(
                "Reminder sent for approval {ApprovalId} to {Approver}",
                approval.Id, approval.ApproverEmail);

            // If pending more than 48 hours, escalate to the approver's manager
            if (approval.PendingSince > TimeSpan.FromHours(48))
            {
                await EscalateApprovalAsync(approval);
                log.LogWarning(
                    "Approval {ApprovalId} escalated after 48 hours",
                    approval.Id);
            }
        }
    }

    private async Task EscalateApprovalAsync(PendingApproval approval)
    {
        // Get the approver's manager from Microsoft Entra ID
        var manager = await _graphClient.Users[approval.ApproverId]
            .Manager
            .GetAsync();

        // Create a new approval for the manager with context
        // about why it was escalated
    }

    private async Task<List<PendingApproval>> GetPendingApprovalsAsync(TimeSpan age)
    {
        // Query your database for approvals older than the specified age
        return new List<PendingApproval>();
    }
}
```

## Tracking Approval Metrics

Build a dashboard to monitor approval workflow performance:

```csharp
// API endpoint that returns approval workflow analytics
[HttpGet("api/approvals/analytics")]
public async Task<IActionResult> GetAnalytics(
    [FromQuery] string period = "30d")
{
    var days = int.Parse(period.Replace("d", ""));
    var since = DateTime.UtcNow.AddDays(-days);

    var stats = await _approvalRepo.GetStatisticsAsync(since);

    return Ok(new
    {
        period = period,
        totalApprovals = stats.Total,
        approved = stats.Approved,
        rejected = stats.Rejected,
        pendingInfo = stats.PendingInfo,
        averageResponseTime = stats.AverageResponseTime.TotalHours,
        approvalRate = stats.Total == 0 ? 0 : (double)stats.Approved / stats.Total * 100,
        slowestCategory = stats.SlowestCategory,
        fastestApprover = stats.FastestApprover,
        escalationCount = stats.Escalations
    });
}
```

## Best Practices for Approval Workflows

After building a number of these workflows, here are the patterns that work well:

- Always include a link back to the source document or system in the approval card. Approvers need context.
- Set reasonable deadlines and communicate them. An approval with no deadline often gets ignored.
- Use "First to respond" approval type when any one approver is sufficient. Use "Everyone must respond" only when consensus is genuinely required.
- Log everything. Store the full audit trail including who approved, when, and any comments they provided.
- Test with real approvers before going live. The Teams notification experience varies between desktop, mobile, and web clients.

## Wrapping Up

Microsoft Teams Approvals combined with Power Automate provides a powerful platform for automating business approval workflows. Power Automate works well for straightforward flows that a business analyst can build and maintain. Azure Logic Apps steps in when you need enterprise-grade error handling, complex branching, and integration with APIs and databases, while delegating the Teams approval request to Power Automate. Start with your most common approval workflow, prove the pattern, and then expand to other business processes.
