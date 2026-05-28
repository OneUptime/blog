# Validation Summary: Create Custom Events and Channels in Eventarc for Application-Level Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Eventarc Advanced
- Eventarc message buses
- Eventarc pipelines and enrollments
- Eventarc Publishing API
- Cloud Run
- CloudEvents
- Google Cloud CLI
- Node.js
- Express
- Firestore

## Sources Consulted
- Google Cloud Eventarc Advanced quickstart: https://docs.cloud.google.com/eventarc/advanced/docs/quickstarts/publish-events-create-bus
- Google Cloud Eventarc Advanced direct publishing: https://docs.cloud.google.com/eventarc/advanced/docs/publish-events/publish-events-direct-format
- Google Cloud SDK reference for `gcloud eventarc message-buses create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/message-buses/create
- Google Cloud SDK reference for `gcloud eventarc message-buses publish`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/message-buses/publish
- Google Cloud SDK reference for `gcloud eventarc pipelines create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/pipelines/create
- Google Cloud SDK reference for `gcloud eventarc enrollments create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/enrollments/create
- Eventarc Advanced access control with IAM: https://docs.cloud.google.com/eventarc/advanced/docs/access-control
- Eventarc Publishing API `messageBuses.publish`: https://docs.cloud.google.com/eventarc/docs/reference/publishing/rest/v1/projects.locations.messageBuses/publish
- Node.js `@google-cloud/eventarc-publishing` `PublisherClient`: https://docs.cloud.google.com/nodejs/docs/reference/eventarc-publishing/latest/eventarc-publishing/v1.publisherclient
- Eventarc CloudEvents HTTP format: https://docs.cloud.google.com/eventarc/docs/cloudevents
- Eventarc Advanced received event format: https://docs.cloud.google.com/eventarc/advanced/docs/receive-events/configure-format-events
- Eventarc Standard third-party channel documentation: https://cloud.google.com/eventarc/standard/docs/third-parties/create-channels

## Issues Found
- The post described Eventarc Standard channels as the mechanism for application-owned custom events. Current Google Cloud documentation positions channels for third-party provider events, while application-published custom events are handled through Eventarc Advanced message buses. I changed the tutorial text, title, diagram, setup commands, and wrap-up language to use message buses.
- The channel creation and describe commands used `gcloud eventarc channels`. I replaced them with `gcloud eventarc message-buses create` and `gcloud eventarc message-buses describe`.
- The routing section used Eventarc Standard triggers with `--channel`. For Eventarc Advanced message buses, routing is configured with pipelines and enrollments. I replaced the trigger examples with `gcloud eventarc pipelines create` and `gcloud eventarc enrollments create`, including CEL matching expressions such as `message.type == 'custom.myapp.user.created'`.
- The publishing CLI used `gcloud eventarc channels publish`, which is not the current command for publishing directly to an Eventarc Advanced bus. I replaced it with `gcloud eventarc message-buses publish` and included the `datacontenttype=application/json` CloudEvents attribute.
- The Node.js publisher used a non-existent `EventarcPublisherClient` import and called `publishEvents()` against a channel. I corrected it to use `PublisherClient` from `require("@google-cloud/eventarc-publishing").v1` and call `publish()` with a `messageBus` resource and `jsonMessage`.
- The publisher application did not grant its runtime identity permission to publish to the message bus. I added an IAM binding example using `roles/eventarc.messageBusUser`, which includes `eventarc.messageBuses.publish`.
- The management commands listed channels and triggers. I replaced them with message bus, enrollment, and pipeline management commands.

## Review Notes
The local environment does not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK command reference rather than local `--help` output. JavaScript snippets were parsed locally with Node.js for syntax validation.
