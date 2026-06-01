# Validation Summary: How to Send Transactional Emails with Azure Communication Services Email

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Communication Services Email
- Azure CLI communication extension
- JavaScript SDK: @azure/communication-email
- Python SDK: azure-communication-email
- DNS sender authentication: SPF, DKIM, DMARC
- Email attachments, CC, and BCC

## Sources Consulted
- Microsoft Learn: Send an email using Azure Communication Services: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email
- Microsoft Learn: Azure CLI `az communication email`: https://learn.microsoft.com/en-us/cli/azure/communication/email
- Microsoft Learn: Add custom verified email domains: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains
- Microsoft Learn: Connect a verified email domain to send email: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/connect-email-communication-resource
- Microsoft Learn: Email domains and sender authentication: https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-domain-and-sender-authentication
- Microsoft Learn: Supported attachment types and message size guidance: https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-attachment-allowed-mime-types
- Microsoft Learn: Azure Communication Services service limits: https://learn.microsoft.com/en-us/azure/communication-services/concepts/service-limits

## Issues Found
- The post description claimed coverage of the REST API, but the article only includes SDK examples. Updated the description to mention the SDK only.
- The custom-domain DKIM DNS names were too generic for Azure Communication Services. Updated the examples to use the Azure-generated selector pattern and added a note to copy exact DNS names and values from the Azure portal because record names vary by DNS zone.
- The attachment JavaScript example was labeled as a standalone file but omitted `EmailClient` setup. Added the required SDK import, connection string, and client initialization.
- The delivery-flow diagram incorrectly showed ACS using DNS to sign DKIM and implied a delivery status update. Updated it to show ACS signing the message and returning send operation status.
- The delivery-status section said `Succeeded` means the recipient mail server accepted the email and listed `Canceled`. Updated it to match Microsoft documentation: `Succeeded` means the email is out for delivery, and recipient-side delivery details require Azure Monitor or Event Grid events.
- The rate-limit section listed unsupported default throughput values. Renamed it to service limits and replaced the values with documented size/resource limits: 50 recipients per email, 10 MB total email request size including attachments and Base64 encoding, and 250 authenticated connections per subscription.

## Review Notes
The SDK package names, JavaScript `beginSend`/`pollUntilDone` usage, Python `begin_send` usage, recipient object shape, and attachment fields match Microsoft documentation. The post still intentionally uses connection strings for simple examples; Microsoft recommends service principals for production environments.
