# Validation Summary: How to Send SMS Messages Programmatically Using Azure Communication Services SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Communication Services SMS
- Azure Communication Services JavaScript SDK
- Azure Communication Services Python SDK
- Azure CLI
- Azure Event Grid
- Azure Functions for Python
- SMS delivery reports and opt-out handling

## Sources Consulted
- Microsoft Learn: Send an SMS message with Azure Communication Services - https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/sms/send
- Microsoft Learn: Azure Communication Services SMS events for Event Grid - https://learn.microsoft.com/en-us/azure/event-grid/communication-services-telephony-sms-events
- Microsoft Learn: Handle SMS events with Azure Communication Services - https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/sms/handle-sms-events
- Microsoft Learn: Azure Communication Services SMS overview - https://learn.microsoft.com/en-us/azure/communication-services/concepts/sms/concepts
- Microsoft Learn: Azure Communication Services SMS FAQ - https://learn.microsoft.com/en-us/azure/communication-services/concepts/sms/sms-faq
- Microsoft Learn: Azure CLI az communication reference - https://learn.microsoft.com/en-us/cli/azure/communication
- Microsoft Learn: Azure CLI az eventgrid event-subscription reference - https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Python documentation: secrets module - https://docs.python.org/3/library/secrets.html

## Issues Found
- The prerequisites and phone-number setup described ACS senders as "toll-free or local" numbers. ACS documentation uses sender types such as toll-free, short code, 10DLC, mobile numbers, and alphanumeric sender IDs, with country/region-specific availability. Updated the wording to match ACS sender terminology.
- The delivery report handler checked for an "Undelivered" delivery status. Microsoft documents SMS delivery report statuses as "Delivered" and "Failed". Removed the undocumented branch.
- The 2FA example generated verification codes with Python's `random` module, which is not appropriate for security-sensitive tokens. Replaced it with `secrets.randbelow`.
- The rate-limit section said short codes have unspecified higher throughput and that local numbers vary by region. Updated the listed rates to match the ACS SMS overview: toll-free numbers at 200 messages/minute, short codes at 6,000 messages/minute, and 10DLC/mobile numbers at 200 messages/minute, with increases available upon request.

## Review Notes
The JavaScript and Python SMS SDK send examples match the current Microsoft quickstart patterns, including `SmsClient`, `send`, `enableDeliveryReport`, `enable_delivery_report`, and delivery-report tags. The Azure CLI could not be checked locally because `az` is not installed in this environment, so command syntax was verified against Microsoft Learn instead.
