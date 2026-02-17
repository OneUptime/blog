# How to Set Up Azure DevOps Wikis with Mermaid Diagrams for Architecture Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, Wiki, Mermaid Diagrams, Architecture Documentation, DevOps, Technical Writing

Description: Create and organize Azure DevOps project wikis with Mermaid diagrams to document system architecture, deployment flows, and technical decisions.

---

Documentation that lives far from the code is documentation that gets stale. Azure DevOps wikis solve this by putting your documentation right next to your repositories, pipelines, and boards. And with built-in Mermaid diagram support, you can create architecture diagrams, sequence flows, and deployment maps using plain text that is version-controlled and easy to update. No more exporting images from Visio or sharing Lucidchart links that half the team cannot access.

This guide walks through setting up an Azure DevOps wiki, structuring it for architecture documentation, and using Mermaid diagrams effectively.

## Types of Wikis in Azure DevOps

Azure DevOps supports two types of wikis:

1. **Project wiki**: A standalone wiki managed directly in Azure DevOps. Created through the Wiki hub. Good for general documentation.
2. **Code wiki (publish as wiki)**: A folder in a Git repository that Azure DevOps renders as a wiki. Changes go through the same PR process as code. Better for documentation that should be reviewed.

For architecture documentation, I recommend code wikis. They give you version history, branch policies, and code review for your documentation - the same rigor you apply to your code.

## Creating a Project Wiki

Go to your Azure DevOps project, click on "Wiki" in the left navigation, and click "Create project wiki." That is it. You get a markdown-based wiki with a hierarchical page structure.

## Creating a Code Wiki

This approach publishes a folder from a Git repository as a wiki.

### Step 1: Set Up the Repository Structure

Create a docs folder in your repository:

```bash
# Create the documentation structure in your repo
mkdir -p docs/architecture
mkdir -p docs/runbooks
mkdir -p docs/adr

# Create the landing page
touch docs/architecture/Home.md
touch docs/architecture/system-overview.md
touch docs/architecture/deployment-architecture.md
touch docs/architecture/data-flow.md
```

### Step 2: Publish as Wiki

Go to Wiki, click the dropdown next to your wiki name, and select "Publish code as wiki." Choose your repository, branch (usually `main`), and the folder path (e.g., `/docs/architecture`).

Now any changes pushed to that folder in the repository will appear in the wiki automatically.

## Structuring Your Architecture Wiki

A good architecture wiki follows a predictable structure. Here is what I use:

```
docs/architecture/
  Home.md                    (landing page with links to key sections)
  system-overview.md         (high-level architecture diagram and description)
  deployment-architecture.md (how the system is deployed across environments)
  data-flow.md              (how data moves through the system)
  adr/                       (architecture decision records)
    001-use-event-sourcing.md
    002-choose-postgresql.md
  runbooks/
    incident-response.md
    database-failover.md
    scaling-procedures.md
```

## Using Mermaid Diagrams

Azure DevOps wikis support Mermaid syntax natively. You write the diagram as a code block with the `mermaid` language tag, and it renders as a visual diagram.

### System Architecture Diagram

Here is a system overview diagram using Mermaid:

```markdown
## System Overview

Our platform consists of a React frontend, a .NET API layer,
and several backing services.

:::mermaid
flowchart TB
    subgraph Client
        A[React SPA]
        B[Mobile App]
    end

    subgraph API Layer
        C[API Gateway]
        D[Auth Service]
        E[Order Service]
        F[Notification Service]
    end

    subgraph Data
        G[(PostgreSQL)]
        H[(Redis Cache)]
        I[Azure Blob Storage]
    end

    subgraph Messaging
        J[Azure Service Bus]
    end

    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    E --> G
    E --> H
    E --> J
    F --> J
    D --> G
    E --> I
:::
```

Note the syntax difference: in Azure DevOps wikis, you use `:::mermaid` instead of triple backtick fences. Both work, but `:::mermaid` is the officially documented approach for Azure DevOps.

### Sequence Diagrams for API Flows

Sequence diagrams are perfect for documenting API interactions:

```markdown
## Order Creation Flow

When a customer places an order, the following sequence occurs:

:::mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Auth as Auth Service
    participant OS as Order Service
    participant DB as PostgreSQL
    participant SB as Service Bus
    participant NS as Notification Service

    C->>GW: POST /orders
    GW->>Auth: Validate token
    Auth-->>GW: Token valid
    GW->>OS: Create order
    OS->>DB: Insert order record
    DB-->>OS: Order created
    OS->>SB: Publish OrderCreated event
    OS-->>GW: 201 Created
    GW-->>C: Order confirmation
    SB->>NS: Deliver OrderCreated event
    NS->>C: Send confirmation email
:::
```

### Deployment Architecture

Use a flowchart to show your deployment topology:

```markdown
## Deployment Architecture

Each environment runs in its own Azure subscription with
isolated networking.

:::mermaid
flowchart LR
    subgraph Development
        D1[AKS Dev Cluster]
        D2[(SQL Dev)]
    end

    subgraph Staging
        S1[AKS Staging Cluster]
        S2[(SQL Staging)]
    end

    subgraph Production
        P1[AKS Prod Cluster - East]
        P2[AKS Prod Cluster - West]
        P3[(SQL Prod - Primary)]
        P4[(SQL Prod - Replica)]
        P5[Traffic Manager]
    end

    P5 --> P1
    P5 --> P2
    P3 --> P4
    P1 --> P3
    P2 --> P4
:::
```

### State Diagrams for Workflows

State diagrams document business workflows:

```markdown
## Order State Machine

An order transitions through the following states:

:::mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed: Payment received
    Pending --> Cancelled: Customer cancels
    Confirmed --> Processing: Warehouse picks up
    Processing --> Shipped: Package dispatched
    Shipped --> Delivered: Package received
    Shipped --> Returned: Customer returns
    Delivered --> [*]
    Returned --> Refunded: Refund processed
    Refunded --> [*]
    Cancelled --> [*]
:::
```

### Entity Relationship Diagrams

Document your data model with ER diagrams:

```markdown
## Core Data Model

:::mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        uuid id PK
        string email
        string name
        datetime created_at
    }
    ORDER ||--|{ ORDER_LINE : contains
    ORDER {
        uuid id PK
        uuid customer_id FK
        string status
        decimal total
        datetime created_at
    }
    ORDER_LINE }|--|| PRODUCT : references
    ORDER_LINE {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    PRODUCT {
        uuid id PK
        string name
        decimal price
        int stock_count
    }
:::
```

## Architecture Decision Records

ADRs are short documents that capture important technical decisions. They work well in a wiki because they accumulate over time and provide context for future team members.

Here is a template for an ADR page:

```markdown
# ADR-001: Use Event Sourcing for Order Management

## Status
Accepted

## Context
Our order management system needs to maintain a complete audit trail
of all changes to orders. We also need the ability to rebuild the
current state of an order from its history for debugging and
compliance purposes.

## Decision
We will use event sourcing for the order management domain. All
state changes will be recorded as immutable events in an append-only
event store. The current state of an order will be derived by
replaying its events.

## Consequences

### Positive
- Complete audit trail with no additional effort
- Ability to rebuild state at any point in time
- Natural fit for event-driven architecture with Service Bus

### Negative
- More complex than simple CRUD for basic operations
- Requires careful event schema versioning
- Team needs training on event sourcing patterns

## Alternatives Considered
1. Traditional CRUD with an audit log table
2. Change Data Capture from PostgreSQL WAL
```

## Wiki Organization Tips

### Use the .order File

Azure DevOps code wikis use a `.order` file to control page ordering. Create this file in each directory:

```
Home
system-overview
deployment-architecture
data-flow
```

Without this file, pages are sorted alphabetically, which is rarely the order you want.

### Cross-link Between Pages

Use relative links to connect related pages:

```markdown
For details on how data flows through the system, see
[Data Flow Architecture](./data-flow).

Related ADRs:
- [ADR-001: Event Sourcing](./adr/001-use-event-sourcing)
- [ADR-002: PostgreSQL](./adr/002-choose-postgresql)
```

### Keep Diagrams Close to Text

Do not create pages that are just diagrams. Each diagram should have surrounding text that explains what the diagram shows, why the architecture looks this way, and what the key design decisions were. The diagram is a visual aid, not a replacement for written explanation.

## Maintaining the Wiki

Architecture documentation rots fast if you do not maintain it. Here are some strategies:

1. **Include wiki updates in your definition of done.** If a PR changes the architecture, it should also update the relevant wiki pages.
2. **Review the wiki quarterly.** Schedule a recurring meeting to review and update architecture documentation.
3. **Use PR reviews for wiki changes.** Since code wikis go through the same PR process as code, reviewers can catch outdated information.

## Wrapping Up

Azure DevOps wikis with Mermaid diagrams give you a lightweight, version-controlled documentation system that lives right next to your code. The Mermaid integration means you can create and update architecture diagrams as easily as editing a markdown file - no design tools needed. Start with a system overview diagram, add sequence diagrams for your most important flows, and build out ADRs as you make architectural decisions. The documentation will be more useful and more current than anything you put in a separate tool.
