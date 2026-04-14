# How to Subscribe to Configuration Changes in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration API, Subscription, Real-Time Configuration, Microservice

Description: Learn how to subscribe to configuration changes in Dapr so your application reacts instantly when feature flags or runtime settings are updated.

---

One of the most powerful features of the Dapr Configuration API is the ability to subscribe to configuration changes in real time. Instead of polling for changes or restarting services after a config update, your application receives a push notification whenever a watched key changes.

## How Configuration Subscriptions Work

Dapr supports subscribing to configuration changes through its SDKs using gRPC server streaming. Your service subscribes to one or more keys and receives events whenever those keys are updated in the backing store. The gRPC-based SDKs (Go, Node.js, Python) handle the streaming details for you, delivering updates via callbacks or handlers.

## Setting Up a Subscription via HTTP

Subscribe to configuration keys:

```bash
curl "http://localhost:3500/v1.0/configuration/appconfig/subscribe?key=feature-new-ui&key=log-level"
```

The response returns a subscription ID:

```json
{"id":"subscription-id-value"}
```

Dapr then pushes configuration updates to your application by calling `POST /configuration/{storeName}/{key}` on your app's HTTP endpoint whenever a watched key changes.

## Subscribing in Node.js

```javascript
const { DaprClient, CommunicationProtocolEnum } = require('@dapr/dapr');

const client = new DaprClient({
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

async function watchConfig() {
  // Start subscription and get a stream object
  const stream = await client.configuration.subscribeWithKeys(
    'appconfig',
    ['feature-new-ui', 'log-level', 'max-retries'],
    async (config) => {
      console.log('Configuration changed:', config.items);

      // React to specific changes
      if ('feature-new-ui' in config.items) {
        const enabled = config.items['feature-new-ui'].value === 'true';
        updateFeatureFlag('new-ui', enabled);
      }

      if ('log-level' in config.items) {
        setLogLevel(config.items['log-level'].value);
      }
    }
  );

  return stream;
}

// Unsubscribe when done
function stopWatching(stream) {
  stream.stop();
}
```

## Subscribing in Python

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._response import ConfigurationResponse

config_state = {
    "feature-new-ui": "false",
    "log-level": "info"
}

def handler(id: str, resp: ConfigurationResponse):
    for key, item in resp.items.items():
        config_state[key] = item.value
        print(f"Config updated: {key} = {item.value}")

with DaprClient() as client:
    subscription_id = client.subscribe_configuration(
        store_name='appconfig',
        keys=['feature-new-ui', 'log-level'],
        handler=handler
    )
    print(f"Subscribed with ID: {subscription_id}")

    # Keep service running...
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.unsubscribe_configuration(
            store_name='appconfig',
            id=subscription_id
        )
```

## Reacting to Changes in a Long-Running Service

The pattern for a long-running service is to hold the current config in memory and update it when events arrive:

```go
package main

import (
    "context"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

var currentConfig = map[string]string{
    "max-retries":    "3",
    "timeout-seconds": "30",
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()
    subscriptionID, err := client.SubscribeConfigurationItems(
        ctx,
        "appconfig",
        []string{"max-retries", "timeout-seconds"},
        func(id string, items map[string]*dapr.ConfigurationItem) {
            for key, item := range items {
                log.Printf("Config change: %s = %s", key, item.Value)
                currentConfig[key] = item.Value
            }
        },
    )
    if err != nil {
        log.Fatal(err)
    }
    defer client.UnsubscribeConfigurationItems(ctx, "appconfig", subscriptionID)

    // Run service...
    select {}
}
```

## Summary

Dapr Configuration subscriptions enable real-time config updates without service restarts. By subscribing to specific keys in your configuration store, your application receives push notifications whenever values change and can immediately update in-memory state, toggle feature flags, or adjust runtime parameters - making dynamic configuration a first-class feature of your microservices architecture.
