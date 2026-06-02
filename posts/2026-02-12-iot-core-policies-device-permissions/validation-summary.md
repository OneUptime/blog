# Validation Summary: How to Create IoT Core Policies for Device Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core policies
- AWS IoT Core MQTT authorization
- AWS IoT Core policy variables
- X.509 certificate policy variables
- AWS IoT Device Shadow MQTT topics
- AWS CLI for IoT Core policy management and authorization testing

## Sources Consulted
- AWS IoT Core policies: https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html
- AWS IoT Core action resources: https://docs.aws.amazon.com/iot/latest/developerguide/iot-action-resources.html
- AWS IoT Core publish/subscribe policy examples: https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
- AWS IoT Core thing policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- AWS IoT Core basic policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/basic-policy-variables.html
- AWS IoT Core X.509 certificate policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/cert-policy-variables.html
- AWS IoT Core Device Shadow MQTT topics: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-mqtt.html
- AWS CLI create-policy reference: https://docs.aws.amazon.com/cli/latest/reference/iot/create-policy.html
- AWS CLI create-policy-version reference: https://docs.aws.amazon.com/cli/latest/reference/iot/create-policy-version.html
- AWS CLI attach-policy reference: https://docs.aws.amazon.com/cli/latest/reference/iot/attach-policy.html
- AWS CLI test-authorization reference: https://docs.aws.amazon.com/cli/latest/reference/iot/test-authorization.html
- Linked OneUptime posts were checked and are reachable:
  - https://oneuptime.com/blog/post/2026-02-12-iot-core-certificate-based-authentication/view
  - https://oneuptime.com/blog/post/2026-02-12-iot-core-device-defender-security-audits/view

## Issues Found
- The example ARNs used a 9-digit account placeholder (`123456789`). AWS account IDs in ARNs are 12 digits, so all examples were changed to `123456789012`.
- The policy basics section said IoT policies are attached to certificates only and described permissions as the union of certificate policies. AWS IoT Core policies can also be attached to Amazon Cognito identities and thing groups, and explicit denies override allows, so the explanation was corrected.
- The ThingName policy-variable examples did not include the recommended `iot:Connection.Thing.IsAttached` condition on `iot:Connect`. Added the condition to registered-device examples that use `${iot:Connection.Thing.ThingName}`.
- The Client ID variable example used `${iot:ClientId}` as the `iot:Connect` resource. AWS explicitly does not recommend using `${iot:ClientId}` with `Connect`, so the example was changed to show client ID use in a topic permission and the caveat was added.
- The shadow policy examples granted `iot:Publish` and `iot:Receive` over the same shadow wildcard resources. AWS documents separate publish request topics and subscribe/receive response topics, so the shadow snippets were split into correct request and response topic permissions.

## Review Notes
- The AWS CLI is not installed in this workspace, so CLI syntax was verified against the official AWS CLI command reference instead of local `aws --help` output.
- All JSON snippets in the edited post were parsed successfully after the changes.
