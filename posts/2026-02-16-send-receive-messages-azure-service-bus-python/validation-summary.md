# Validation Summary: How to Send and Receive Messages with Azure Service Bus Using azure-servicebus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure CLI
- Python
- azure-servicebus Python SDK
- azure-identity and DefaultAzureCredential
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Azure Service Bus client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/servicebus-readme?view=azure-python
- Microsoft Learn: ServiceBusClient class - https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.servicebusclient?view=azure-python
- Microsoft Learn: ServiceBusSender class - https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.servicebussender?view=azure-python
- Microsoft Learn: ServiceBusMessage class - https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.servicebusmessage?view=azure-python
- Microsoft Learn: ServiceBusMessageBatch class - https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.servicebusmessagebatch?view=azure-python
- Microsoft Learn: Azure Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Enable Azure Service Bus message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-message-sessions
- Microsoft Learn: az servicebus namespace - https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace?view=azure-cli-latest
- Microsoft Learn: az servicebus topic - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic?view=azure-cli-latest
- Microsoft Learn: az servicebus topic subscription - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription?view=azure-cli-latest

## Issues Found
- The queue setup did not create the `session-queue` used later in the Sessions section, and Service Bus sessions must be enabled when the queue is created. Added a `session-queue` creation command with `--enable-session true`.
- The RBAC examples used `<your-principal-id>` inside a shell command. Unquoted angle brackets are interpreted by the shell as redirection, so the placeholder would not copy cleanly. Replaced it with `YOUR_PRINCIPAL_ID`.
- The first queue-send Python snippet used `DefaultAzureCredential()` without importing it. Added `from azure.identity import DefaultAzureCredential`.
- The scheduled-message example treated `ServiceBusSender.schedule_messages()` as returning a single sequence number. The current SDK returns a list of sequence numbers, even when scheduling one message. Renamed the variable to `sequence_numbers` and updated the cancellation example.

## Review Notes
- The remaining SDK usage is consistent with the current `azure-servicebus` Python API, including `ServiceBusClient`, queue and topic senders, receivers, message settlement, dead-letter access with `sub_queue="deadletter"`, batch creation, and session receivers.
- The local environment did not have Azure CLI installed, so CLI validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
