# Validation Summary: How to Use Amplify PubSub for Real-Time Data

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Amplify JavaScript
- Amplify PubSub
- AWS IoT Core
- MQTT over WebSocket
- Amazon Cognito Identity Pools
- AWS IAM and AWS IoT policies
- AWS CLI
- React
- TypeScript
- Python boto3

## Sources Consulted
- AWS Amplify Gen 1 PubSub setup documentation: https://docs.amplify.aws/gen1/react/build-a-backend/more-features/pubsub/set-up-pubsub/
- AWS Amplify PubSub subscribe/unsubscribe documentation: https://docs.amplify.aws/react/frontend/pubsub/subscribe/
- AWS Amplify PubSub publish documentation: https://docs.amplify.aws/gen1/react/build-a-backend/more-features/pubsub/publish/
- Amplify JS PubSub API reference: https://aws-amplify.github.io/amplify-js/api/classes/_aws_amplify_pubsub.clients_mqtt.PubSub.html
- AWS IoT Core Cognito authorization documentation: https://docs.aws.amazon.com/iot/latest/developerguide/cog-iot-policies.html
- AWS IoT Core publish/subscribe policy examples: https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
- AWS IoT Core device communication protocols: https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
- AWS CLI describe-endpoint command reference: https://docs.aws.amazon.com/cli/latest/reference/iot/describe-endpoint.html
- Boto3 IoTDataPlane publish reference: https://docs.aws.amazon.com/boto3/latest/reference/services/iot-data/client/publish.html
- React common components event reference: https://react.dev/reference/react-dom/components/common

## Issues Found
- The IAM policy snippet was marked as JSON but contained a JavaScript comment, making it invalid JSON. Removed the comment from the JSON block.
- The authorization section said only the Cognito Identity Pool authenticated role needed IoT permissions. AWS IoT Core documentation states authenticated Cognito identities require both an IAM role policy and an AWS IoT Core policy attached to the Cognito identity for MQTT/WebSocket actions. Added that requirement.
- The `Connect` policy used `${cognito-identity.amazonaws.com:sub}` as the MQTT client ID, but current Amplify PubSub generates a UUID unless `clientId` is provided. Updated the PubSub setup to fetch the Cognito identity ID and pass it as `clientId`.
- The React chat component used `onKeyPress`, which React marks as deprecated. Replaced it with `onKeyDown`.
- The disconnection example used the subscription `error` callback as if it represented automatic reconnection. Amplify documents connection-state monitoring through Hub events. Updated the example to listen for PubSub connection state changes and fetch missed messages after reconnection.

## Review Notes
The post now reflects the current Amplify PubSub API shape. Amplify Gen 1 documentation is in maintenance mode and reaches end of life on May 1, 2027, so a future revision should consider a Gen 2-oriented version if the blog targets new Amplify projects.
