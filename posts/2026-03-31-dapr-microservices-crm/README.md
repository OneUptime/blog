# How to Build a Microservices-Based CRM with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CRM, Microservice, Architecture, Pub/Sub

Description: Design and implement a microservices-based CRM system with Dapr, covering contact management, lead tracking, communication history, and event-driven workflows.

---

## CRM Architecture with Dapr

A CRM (Customer Relationship Management) system maps naturally to Dapr's building blocks. Each domain becomes a microservice, with Dapr handling inter-service communication, state management, and event-driven workflows.

Core services:
- **Contact Service** - Manages customers, leads, and contacts
- **Interaction Service** - Tracks emails, calls, meetings
- **Pipeline Service** - Sales pipeline and deal management
- **Notification Service** - Automated follow-up reminders
- **Analytics Service** - Aggregates CRM metrics

```yaml
# kubernetes/crm-services.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: contact-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: contact-service
  template:
    metadata:
      labels:
        app: contact-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "contact-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: contact-service
        image: myregistry/crm-contact:latest
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
```

## Contact Service - State Management

```python
# contact_service.py
from fastapi import FastAPI, HTTPException
from dapr.clients import DaprClient
from dapr.ext.fastapi import DaprApp
from dataclasses import dataclass, asdict
from typing import Optional
import json

app = FastAPI()
dapr_app = DaprApp(app)

@dataclass
class Contact:
    contact_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    company: str
    status: str  # "lead", "prospect", "customer"
    assigned_to: str
    tags: list

@app.post("/api/contacts")
async def create_contact(contact: dict):
    with DaprClient() as client:
        # Save contact
        client.save_state("statestore",
            f"contact-{contact['contactId']}", json.dumps(contact))

        # Publish contact created event
        client.publish_event("pubsub", "contact-created",
            json.dumps(contact), data_content_type='application/json')

    return {"contactId": contact["contactId"], "status": "created"}

@app.get("/api/contacts/{contact_id}")
async def get_contact(contact_id: str):
    with DaprClient() as client:
        result = client.get_state("statestore", f"contact-{contact_id}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    return json.loads(result.data)
```

## Pipeline Service - Service Invocation

```javascript
// pipeline-service.js
const express = require('express');
const { DaprClient, DaprServer, HttpMethod } = require('@dapr/dapr');

const app = express();
const client = new DaprClient();
const server = new DaprServer({ serverPort: '3001' });

app.use(express.json());

// Create a deal linked to a contact
app.post('/api/deals', async (req, res) => {
  const { dealId, contactId, value, stage } = req.body;

  // Verify contact exists via service invocation
  const contact = await client.invoker.invoke(
    'contact-service', `api/contacts/${contactId}`, HttpMethod.GET
  );

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  // Save deal to state
  await client.state.save('statestore', [
    { key: `deal-${dealId}`, value: { dealId, contactId, value, stage,
        contactName: `${contact.firstName} ${contact.lastName}` } }
  ]);

  // Publish deal created event for analytics
  await client.pubsub.publish('pubsub', 'deal-created', { dealId, value, stage, contactId });

  res.status(201).json({ dealId, stage });
});

// Subscribe to contact updates to sync denormalized data
server.pubsub.subscribe('pubsub', 'contact-updated', async (data) => {
  const deals = await getDealsForContact(data.contactId);
  for (const deal of deals) {
    deal.contactName = `${data.firstName} ${data.lastName}`;
    await client.state.save('statestore', [{ key: `deal-${deal.dealId}`, value: deal }]);
  }
});

server.start();
app.listen(8080);
```

## Notification Service - Actor-Based Reminders

```csharp
// ReminderActor for follow-up notifications
public interface IReminderActor : IActor
{
    Task ScheduleFollowUpAsync(string contactId, DateTime followUpDate);
    Task CancelFollowUpAsync();
}

public class ReminderActor : Actor, IReminderActor, IRemindable
{
    private string? _contactId;

    public ReminderActor(ActorHost host) : base(host) { }

    public async Task ScheduleFollowUpAsync(string contactId, DateTime followUpDate)
    {
        _contactId = contactId;
        await StateManager.SetStateAsync("contactId", contactId);

        var dueTime = followUpDate - DateTime.UtcNow;
        await RegisterReminderAsync("follow-up", null, dueTime, TimeSpan.Zero);
    }

    public async Task ReceiveReminderAsync(string reminderName, byte[] state,
        TimeSpan dueTime, TimeSpan period)
    {
        var contactId = await StateManager.GetStateAsync<string>("contactId");
        await SendFollowUpNotificationAsync(contactId);
    }

    public async Task CancelFollowUpAsync()
    {
        await UnregisterReminderAsync("follow-up");
    }

    private async Task SendFollowUpNotificationAsync(string contactId)
    {
        using var client = new DaprClientBuilder().Build();
        await client.PublishEventAsync("pubsub", "follow-up-due",
            new { ContactId = contactId, DueAt = DateTime.UtcNow });
    }
}
```

## Summary

Building a CRM with Dapr leverages all major Dapr building blocks: state management for contact and deal persistence, service invocation for cross-domain data validation, pub/sub for event-driven synchronization between services, and actors for scheduled follow-up reminders. Each CRM domain operates as an independent microservice, with Dapr providing the communication and state infrastructure, enabling teams to develop and scale each service independently.
