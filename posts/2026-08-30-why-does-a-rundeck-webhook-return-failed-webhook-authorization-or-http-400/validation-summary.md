# Validation Summary: Why Does a Rundeck Webhook Return "Failed Webhook Authorization" or HTTP 400?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Rundeck 6.1 webhooks
- Rundeck Run Job and Log Events webhook plugins
- Rundeck access-control policies
- HTTP authorization and redirects
- JSON request bodies and media types
- curl
- Reverse proxies, ingress controllers, and WAFs

## Sources Consulted

- [Rundeck Webhooks](https://docs.rundeck.com/docs/manual/webhooks.html)
- [Rundeck Run Job Webhook Plugin](https://docs.rundeck.com/docs/manual/webhooks/run-job.html)
- [Rundeck Log Events Webhook Plugin](https://docs.rundeck.com/docs/manual/webhooks/log-events.html)
- [Rundeck API Reference: API Token Authentication](https://docs.rundeck.com/docs/api/#api-token-authentication)
- [Rundeck API Reference: Send Webhook Event](https://docs.rundeck.com/docs/api/#send-webhook-event)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck Work With Server Logs](https://docs.rundeck.com/docs/learning/howto/workinglogs.html)
- [Rundeck 6.1.0 WebhookController source](https://github.com/rundeck/rundeck/blob/v6.1.0/grails-webhooks/grails-app/controllers/webhooks/WebhookController.groovy#L512-L568)
- [Rundeck 6.1.0 Run Job webhook source](https://github.com/rundeck/rundeck/blob/v6.1.0/grails-webhooks/src/main/groovy/webhooks/plugins/JobRunWebhookEventPlugin.groovy#L89-L159)
- [Rundeck 6.1.0 Log4j2 configuration](https://github.com/rundeck/rundeck/blob/v6.1.0/packaging/lib/common/etc/rundeck/log4j2.properties#L161-L171)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [RFC 8259: The JavaScript Object Notation Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9205: Building Protocols with HTTP](https://www.rfc-editor.org/rfc/rfc9205.html#section-4.6.1)

## Issues Found

- The request-layer explanation omitted Rundeck's project-scope `post` authorization check on the webhook resource. The generated URL token establishes the configured webhook user and roles, and Rundeck checks that identity's `post` permission before it checks the optional `Authorization` header. The introduction, identity guidance, diagnostic list, and conclusion now include this distinct ACL layer and its `You are not authorized to perform this action` response.
- One diagnostic label did not use Rundeck's exact response text. Current Rundeck returns `Failed webhook authorization`, so the in-post diagnostic references now use that wording and capitalization; the existing blog title retains its title-case styling.
- The post incorrectly treated `Content-Type: text/plain` as sufficient to cause a Run Job handler error. In Rundeck 6.1.0, the controller gives every non-form-urlencoded body to the plugin, and the plugin attempts to parse that body as JSON without checking the media type. A valid JSON object labeled `text/plain` can therefore work. The post still recommends the correct `application/json` media type but now uses a valid JSON array as the unsupported example because the plugin deserializes the payload into a JSON object/map.
- The mapping guidance said a missing field could become an empty option. With the current template implementation, a missing nested object can fail substitution, while a missing leaf can render as `null`. The text now describes substitution failure, `null`, and subsequent option or node-filter validation accurately.
- The post warned against changing an existing webhook to run as `admin`, even though the webhook user is immutable and cannot be changed. The advice now accurately warns against recreating the webhook with an admin user or granting it an admin role.

## Review Notes

- The curl example is valid and current. `--request POST` is redundant because `--data` already selects POST, but it is harmless. `--fail-with-body` requires curl 7.76.0 or newer and does not treat an unfollowed 3xx response as an error.
- `application/json` remains the documented and interoperable media type even though the current Run Job implementation does not reject every other non-form media type before parsing.
- Rundeck's current Log4j2 defaults and logging guide use `rundeck.webhooks.log`. An older Log4j example embedded in the general webhook manual shows the singular filename `rundeck.webhook.log`; that documentation inconsistency does not affect the corrected post.
