# How to Design a Ticketing System Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Support

Description: Learn how to model a customer support ticketing system in MongoDB covering tickets, comments, agents, SLA tracking, and escalation workflows.

---

## Core Collections

A ticketing system requires: `tickets`, `users`, `agents`, `teams`, and `knowledgeBase`. MongoDB works well here because ticket metadata varies by category, attachments need flexible storage, and the conversation thread maps naturally to an embedded or referenced comment structure.

## Ticket Collection

```json
{
  "_id": "ticket-001",
  "ticketNumber": "TKT-2026-00001",
  "subject": "Cannot log in to my account",
  "description": "I get an error when trying to sign in...",
  "status": "open",
  "priority": "high",
  "category": "authentication",
  "tags": ["login", "account-access"],
  "submittedBy": {
    "userId": "cust-456",
    "name": "Alice Smith",
    "email": "alice@example.com"
  },
  "assignedAgentId": "agent-007",
  "assignedTeamId": "team-support",
  "sla": {
    "tier": "premium",
    "firstResponseDue": "2026-03-31T13:00:00Z",
    "resolutionDue":    "2026-04-01T09:00:00Z",
    "firstResponseAt":  "2026-03-31T12:30:00Z",
    "resolvedAt": null,
    "breached": false
  },
  "channel": "email",
  "attachments": [
    { "name": "screenshot.png", "url": "https://cdn.example.com/tickets/ticket-001/screenshot.png", "sizeBytes": 204800 }
  ],
  "customFields": {
    "productVersion": "2.4.1",
    "platform": "iOS"
  },
  "createdAt": "2026-03-31T12:00:00Z",
  "updatedAt": "2026-03-31T12:30:00Z",
  "closedAt": null
}
```

## Comment/Thread Collection

For active tickets with many replies, store comments separately:

```json
{
  "_id": "comment-001",
  "ticketId": "ticket-001",
  "authorId": "agent-007",
  "authorType": "agent",
  "type": "reply",
  "body": "Hi Alice, I am investigating the login issue now...",
  "attachments": [],
  "isInternal": false,
  "createdAt": "2026-03-31T12:30:00Z"
}
```

Internal notes (visible only to agents) use `"isInternal": true`.

## Status History (Embedded)

Embed the status changelog directly in the ticket for audit trails. Bounded to ~20 entries for a typical ticket lifetime:

```json
"statusHistory": [
  { "status": "open",        "ts": "2026-03-31T12:00:00Z", "by": "cust-456" },
  { "status": "in-progress", "ts": "2026-03-31T12:30:00Z", "by": "agent-007" }
]
```

## Agent Collection

```json
{
  "_id": "agent-007",
  "name": "Bob Johnson",
  "email": "bob@support.example.com",
  "teamId": "team-support",
  "skills": ["authentication", "billing", "mobile"],
  "status": "available",
  "currentTicketCount": 8,
  "maxTickets": 15,
  "avgResolutionHours": 4.2,
  "satisfactionScore": 4.8
}
```

## Key Indexes

```javascript
// Agent's open ticket queue
db.tickets.createIndex({ assignedAgentId: 1, status: 1, "sla.resolutionDue": 1 })

// SLA breach monitoring
db.tickets.createIndex({ status: 1, "sla.resolutionDue": 1, "sla.breached": 1 })

// Customer ticket history
db.tickets.createIndex({ "submittedBy.userId": 1, createdAt: -1 })

// Team queue
db.tickets.createIndex({ assignedTeamId: 1, status: 1, priority: 1, createdAt: 1 })

// Comment thread
db.comments.createIndex({ ticketId: 1, createdAt: 1 })

// Full-text search
db.tickets.createIndex({ subject: "text", description: "text", tags: "text" })
```

## SLA Breach Report

Find all open tickets with a breached SLA:

```javascript
db.tickets.find({
  status: { $in: ["open", "in-progress"] },
  "sla.resolutionDue": { $lt: new Date() },
  "sla.resolvedAt": null
}).sort({ "sla.resolutionDue": 1 })
```

## Summary

Embed SLA tracking and status history directly in the ticket document for fast dashboard queries. Store comments in a separate collection to avoid document growth on high-volume tickets. Use a text index on subject, description, and tags for ticket search. Index on `assignedAgentId + status + sla.resolutionDue` for agent workqueue views sorted by urgency. Use `customFields` as a flexible map for category-specific metadata without schema migrations.
