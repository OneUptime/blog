# Validation Summary: How to Use CloudEvents Schema with Azure Event Grid

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Event Grid
- CloudEvents v1.0
- Azure CLI
- Azure SDK for .NET
- Azure Functions Event Grid trigger
- HTTP publishing with curl

## Sources Consulted
- Microsoft Learn: CloudEvents v1.0 schema with Azure Event Grid: https://learn.microsoft.com/en-us/azure/event-grid/cloud-event-schema
- Microsoft Learn: Azure Event Grid event schema: https://learn.microsoft.com/en-us/azure/event-grid/event-schema
- Microsoft Learn: Azure CLI `az eventgrid topic create`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/topic
- Microsoft Learn: Azure CLI `az eventgrid event-subscription create`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Event Grid trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- Microsoft Learn: `Azure.Messaging.CloudEvent` class and constructors: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.cloudevent
- Microsoft Learn: `EventGridPublisherClient.SendEventAsync`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridpublisherclient.sendeventasync
- Microsoft Learn: Publish CloudEvent events REST API: https://learn.microsoft.com/en-us/rest/api/eventgrid/dataplane/publish-cloud-event-events/publish-cloud-event-events
- Microsoft Learn: Event filtering for Azure Event Grid namespaces: https://learn.microsoft.com/en-us/azure/event-grid/namespace-event-filtering
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

## Issues Found
- The post described CloudEvents `source` as replacing Event Grid `subject`. CloudEvents has both `source` and `subject`; `source` identifies the producer context, while `subject` remains the event subject. Updated the explanation.
- The HTTP custom-topic publish example used a single structured CloudEvent with `application/cloudevents+json`. The Event Grid custom topic REST API publishes CloudEvents as an array with `application/cloudevents-batch+json`. Updated the example and wording.
- The Azure Functions isolated worker example omitted the Event Grid extension namespace needed for `[EventGridTrigger]`. Added `using Microsoft.Azure.Functions.Worker.Extensions.EventGrid;`.
- The schema mapping diagram incorrectly showed `dataVersion` mapping to CloudEvents `source`. Updated the diagram so Event Grid `topic` maps to CloudEvents `source`, with `dataVersion` left unmapped as described in the text.
- The CloudEvents extension example used underscores in extension attribute names, which violates the CloudEvents attribute naming rules. Renamed the custom extension attributes to lowercase alphanumeric names.
- The `traceparent` sample value was not a valid W3C trace context value. Replaced it with a syntactically valid example.
- The conclusion implied schema conversion works both ways for subscriptions. Event Grid can deliver Event Grid schema input as CloudEvents, but Event Grid output schema is not supported when CloudEvents is the input schema. Narrowed the wording.

## Review Notes
The post is technically sound after the corrections. Future improvements could mention the package version requirement for Azure Functions SDK type bindings and clarify the difference between Event Grid basic custom topics and Event Grid namespace topics when publishing CloudEvents over HTTP.
