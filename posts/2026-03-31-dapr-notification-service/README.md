# How to Build a Notification Service with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Notification, Pub/Sub, Email, SMS

Description: Learn how to build a multi-channel notification service using Dapr pub/sub and output bindings to deliver email, SMS, and push notifications reliably.

---

## Overview

A notification service receives notification requests from other microservices and delivers them across multiple channels (email, SMS, push, Slack). Dapr pub/sub decouples the notification service from producers, and Dapr output bindings simplify integration with delivery providers.

## Notification Model

```go
package main

type NotificationType string

const (
    NotificationEmail NotificationType = "email"
    NotificationSMS   NotificationType = "sms"
    NotificationPush  NotificationType = "push"
    NotificationSlack NotificationType = "slack"
)

type Notification struct {
    ID         string           `json:"id"`
    UserID     string           `json:"userId"`
    Type       NotificationType `json:"type"`
    Channel    string           `json:"channel"` // email address, phone, device token
    Subject    string           `json:"subject"`
    Body       string           `json:"body"`
    TemplateID string           `json:"templateId"`
    Data       map[string]any   `json:"data"`
    Priority   string           `json:"priority"` // "high", "normal", "low"
}
```

## Dapr Output Binding for Email

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid-email
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
    - name: apiKey
      secretKeyRef:
        name: sendgrid-secret
        key: apiKey
    - name: emailFrom
      value: "noreply@example.com"
    - name: emailFromName
      value: "My App"
```

## Notification Service

```go
type NotificationService struct {
    daprClient dapr.Client
    templates  map[string]string
}

func (svc *NotificationService) HandleNotification(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var notif Notification
    if err := json.Unmarshal(e.RawData, &notif); err != nil {
        return false, err
    }

    // Check user notification preferences
    prefs, err := svc.getUserPreferences(ctx, notif.UserID)
    if err != nil {
        return true, err
    }

    if !prefs.IsEnabled(notif.Type) {
        log.Printf("User %s has disabled %s notifications", notif.UserID, notif.Type)
        return false, nil
    }

    switch notif.Type {
    case NotificationEmail:
        return false, svc.sendEmail(ctx, notif)
    case NotificationSMS:
        return false, svc.sendSMS(ctx, notif)
    case NotificationPush:
        return false, svc.sendPush(ctx, notif)
    case NotificationSlack:
        return false, svc.sendSlack(ctx, notif)
    }

    return false, nil
}

func (svc *NotificationService) sendEmail(ctx context.Context, notif Notification) error {
    _, err := svc.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "sendgrid-email",
        Operation: "create",
        Data:      []byte(svc.renderTemplate(notif)),
        Metadata: map[string]string{
            "emailTo": notif.Channel,
            "subject": notif.Subject,
        },
    })
    return err
}
```

## SMS via Twilio Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: twilio-sms
spec:
  type: bindings.twilio.sms
  version: v1
  metadata:
    - name: fromNumber
      value: "+15559876543"
    - name: accountSid
      secretKeyRef:
        name: twilio-secret
        key: accountSid
    - name: authToken
      secretKeyRef:
        name: twilio-secret
        key: authToken
```

```go
func (svc *NotificationService) sendSMS(ctx context.Context, notif Notification) error {
    _, err := svc.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "twilio-sms",
        Operation: "create",
        Data:      []byte(notif.Body),
        Metadata: map[string]string{
            "toNumber": notif.Channel,
        },
    })
    return err
}
```

## Publishing Notifications from Other Services

```go
// Order service publishes notification request
func notifyOrderConfirmed(client dapr.Client, order Order) error {
    return client.PublishEvent(
        context.Background(),
        "pubsub",
        "notifications",
        Notification{
            ID:       uuid.New().String(),
            UserID:   order.CustomerID,
            Type:     NotificationEmail,
            Channel:  order.CustomerEmail,
            Subject:  "Your order has been confirmed",
            TemplateID: "order-confirmed",
            Data: map[string]any{
                "orderId":  order.ID,
                "total":    order.Total,
                "tracking": order.TrackingNumber,
            },
        },
    )
}
```

## Template Rendering

```go
func (svc *NotificationService) renderTemplate(notif Notification) string {
    tmpl, ok := svc.templates[notif.TemplateID]
    if !ok {
        return notif.Body
    }

    t, _ := template.New("notif").Parse(tmpl)
    var buf bytes.Buffer
    t.Execute(&buf, notif.Data)
    return buf.String()
}
```

## Summary

A Dapr-powered notification service uses pub/sub to receive notification requests from any microservice, and output bindings to deliver messages via SendGrid, Twilio SMS, and other providers without vendor SDK dependencies. User preferences are checked before delivery, and template rendering personalizes messages. This architecture decouples notification delivery from business logic and scales independently.
