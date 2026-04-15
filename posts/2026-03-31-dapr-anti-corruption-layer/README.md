# How to Implement Anti-Corruption Layer with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Anti-Corruption Layer, Integration, Pattern, Microservice

Description: Learn how to implement the anti-corruption layer pattern with Dapr service invocation to translate between domain models when integrating with legacy systems.

---

## Overview

The Anti-Corruption Layer (ACL) pattern prevents a new system's domain model from being corrupted by the concepts of a legacy or external system. The ACL sits between systems and translates requests and responses, isolating the new system from legacy concepts.

## When to Use ACL

- Integrating a modern microservice with a legacy monolith
- Consuming third-party APIs with different domain models
- Migrating from an old system while both run in parallel
- Protecting a clean domain model from messy external data

## ACL Service Structure

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

// New domain model (clean)
type NewCustomer struct {
    ID        string `json:"id"`
    FirstName string `json:"firstName"`
    LastName  string `json:"lastName"`
    Email     string `json:"email"`
    Phone     string `json:"phone"`
}

// Legacy system model (messy, flat)
type LegacyCustomerRecord struct {
    CUSTNO    string `json:"CUSTNO"`
    FULLNAME  string `json:"FULLNAME"`
    EMAILADDR string `json:"EMAILADDR"`
    TELNO     string `json:"TELNO"`
    ACTFLAG   string `json:"ACTFLAG"`
    CREDT     string `json:"CREDT"`
}

type CustomerACL struct {
    daprClient  dapr.Client
    legacyURL   string
}
```

## Translation Layer

```go
func (acl *CustomerACL) translateFromLegacy(legacy LegacyCustomerRecord) NewCustomer {
    parts := strings.SplitN(legacy.FULLNAME, " ", 2)
    firstName := parts[0]
    lastName := ""
    if len(parts) > 1 {
        lastName = parts[1]
    }

    return NewCustomer{
        ID:        legacy.CUSTNO,
        FirstName: firstName,
        LastName:  lastName,
        Email:     strings.ToLower(legacy.EMAILADDR),
        Phone:     normalizePhone(legacy.TELNO),
    }
}

func (acl *CustomerACL) translateToLegacy(customer NewCustomer) LegacyCustomerRecord {
    return LegacyCustomerRecord{
        CUSTNO:    customer.ID,
        FULLNAME:  customer.FirstName + " " + customer.LastName,
        EMAILADDR: strings.ToUpper(customer.Email),
        TELNO:     customer.Phone,
        ACTFLAG:   "Y",
    }
}

func normalizePhone(phone string) string {
    // Strip non-digits and format
    digits := strings.Map(func(r rune) rune {
        if r >= '0' && r <= '9' {
            return r
        }
        return -1
    }, phone)
    if len(digits) == 10 {
        return fmt.Sprintf("+1-%s-%s-%s", digits[:3], digits[3:6], digits[6:])
    }
    return phone
}
```

## ACL Service Invocation Handler

```go
// Translating GET customer from legacy
func (acl *CustomerACL) GetCustomer(ctx context.Context, customerID string) (*NewCustomer, error) {
    // Call legacy system (could be via Dapr or direct HTTP)
    legacyData, err := acl.daprClient.InvokeMethod(
        ctx,
        "legacy-crm",
        "/api/customer/"+customerID,
        "GET",
    )
    if err != nil {
        return nil, fmt.Errorf("legacy CRM unavailable: %w", err)
    }

    var legacy LegacyCustomerRecord
    json.Unmarshal(legacyData, &legacy)

    // Translate to new domain model
    customer := acl.translateFromLegacy(legacy)
    return &customer, nil
}

// Translating POST customer to legacy
func (acl *CustomerACL) CreateCustomer(ctx context.Context, customer NewCustomer) error {
    legacyRecord := acl.translateToLegacy(customer)
    data, _ := json.Marshal(legacyRecord)

    _, err := acl.daprClient.InvokeMethodWithContent(
        ctx,
        "legacy-crm",
        "/api/customer",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data:        data,
        },
    )
    return err
}
```

## Registering as a Dapr Service

```go
func main() {
    daprClient, _ := dapr.NewClient()
    acl := &CustomerACL{daprClient: daprClient}

    s := daprd.NewService(":8080")

    // New services call the ACL with clean domain model
    s.AddServiceInvocationHandler("/customers", func(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
        params, _ := url.ParseQuery(in.QueryString)
        customerID := params.Get("id")
        customer, err := acl.GetCustomer(ctx, customerID)
        if err != nil {
            return nil, err
        }
        data, _ := json.Marshal(customer)
        return &common.Content{
            ContentType: "application/json",
            Data:        data,
        }, nil
    })

    s.Start()
}
```

## Event Translation

When legacy systems emit events in their own format, translate them before publishing to the new domain's event bus:

```go
func (acl *CustomerACL) handleLegacyEvent(ctx context.Context, e *common.TopicEvent) (bool, error) {
    // Legacy event format
    var legacyEvent struct {
        EventType string               `json:"EVT_TYPE"`
        Customer  LegacyCustomerRecord `json:"CUSTOMER_DATA"`
    }
    json.Unmarshal(e.RawData, &legacyEvent)

    // Translate and republish in new format
    if legacyEvent.EventType == "CUST_UPD" {
        newCustomer := acl.translateFromLegacy(legacyEvent.Customer)
        return false, acl.daprClient.PublishEvent(ctx, "pubsub", "customer.updated", newCustomer)
    }
    return false, nil
}
```

## Summary

The anti-corruption layer pattern with Dapr isolates your clean domain model from legacy or external system concepts. The ACL service uses Dapr service invocation to call legacy systems and translates between their messy models and your new domain model. All new microservices interact with the ACL's clean API, protecting them from the complexity of legacy integration.
