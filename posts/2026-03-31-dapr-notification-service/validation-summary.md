# Validation Summary: How to Build a Notification Service with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub
- Dapr Output Bindings
- Dapr SendGrid (Twilio SendGrid) Binding
- Dapr Twilio SMS Binding
- Go (Dapr Go SDK)
- SendGrid email delivery
- Twilio SMS delivery

## Sources Consulted
- Dapr SendGrid output binding specification: https://docs.dapr.io/reference/components-reference/supported-bindings/sendgrid/
- Dapr Twilio SMS output binding specification: https://docs.dapr.io/reference/components-reference/supported-bindings/twilio/
- Dapr Go SDK source code (github.com/dapr/go-sdk): client.InvokeBindingRequest, client.PublishEvent, service/common.TopicEvent
- Dapr Go SDK binding invocation examples

## Issues Found

### 1. SendGrid email binding invocation — incorrect payload structure
**What was wrong:** The `sendEmail` function constructed a JSON object with `emailTo`, `subject`, and `htmlBody` fields all inside the `Data` byte slice. According to the Dapr SendGrid binding spec, `emailTo` and `subject` must be passed as `Metadata` fields on the `InvokeBindingRequest`, and the HTML body goes directly into `Data` as raw bytes. There is no `htmlBody` field.

**What was changed:** Replaced the `fmt.Sprintf` JSON body construction with proper use of the `Metadata` map for `emailTo` and `subject`, and placed the rendered template HTML directly in `Data`.

### 2. Twilio SMS binding invocation — incorrect payload structure
**What was wrong:** The `sendSMS` function marshaled a JSON object containing `toNumber` and `body` into the `Data` field. According to the Dapr Twilio SMS binding spec and source code, `toNumber` must be passed as a `Metadata` field on the `InvokeBindingRequest`, and the SMS body text goes directly into `Data` as plain text bytes.

**What was changed:** Replaced the `json.Marshal` call with direct `[]byte(notif.Body)` for `Data`, and moved `toNumber` into the `Metadata` map.

### 3. Twilio SMS component YAML — hardcoded `toNumber` prevents dynamic routing
**What was wrong:** The component YAML included a hardcoded `toNumber: "+15551234567"` in the spec metadata. The Dapr Twilio SMS binding uses the component-level `toNumber` with priority over invoke-time metadata, so all SMS would be sent to that single number regardless of the recipient passed at invocation time. A notification service must send to different numbers dynamically.

**What was changed:** Removed the `toNumber` entry from the component YAML so that the per-request `toNumber` in the invoke metadata is used.

## Review Notes
- The Go code uses `dapr.Client` and `dapr.InvokeBindingRequest` without showing import statements. This is acceptable for a tutorial — the conventional alias is `import dapr "github.com/dapr/go-sdk/client"`.
- The `sendPush` and `sendSlack` methods are referenced in the switch statement but not implemented in the post. This is fine for a tutorial focused on email and SMS.
- The `getUserPreferences` method is called but not defined. This is acceptable as it's clearly a placeholder for application-specific logic.
- The `renderTemplate` function ignores template parse/execute errors. In production code, these should be handled, but this is acceptable for a tutorial.
