# How to Use Dapr Configuration with Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Java, Dynamic Config, Microservice

Description: Learn how to use Dapr's Configuration API in Java to read and subscribe to dynamic configuration changes from key-value stores like Redis.

---

## Introduction

Dapr's Configuration building block provides a way to read application configuration data from external stores and subscribe to live updates. This is useful for feature flags, runtime settings, and environment-specific parameters that need to change without redeploying services.

## Adding the Dependency

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk</artifactId>
  <version>1.13.0</version>
</dependency>
```

## Configuring the Configuration Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Reading Configuration Values

Retrieve one or more configuration keys:

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.ConfigurationItem;
import java.util.List;
import java.util.Map;

DaprClient client = new DaprClientBuilder().build();

Map<String, ConfigurationItem> config = client.getConfiguration(
    "configstore",
    List.of("feature-flag-new-ui", "max-retry-count"),
    Map.of()
).block();

String featureFlag = config.get("feature-flag-new-ui").getValue();
String maxRetry = config.get("max-retry-count").getValue();

System.out.println("Feature flag: " + featureFlag);
System.out.println("Max retries: " + maxRetry);
```

## Subscribing to Configuration Changes

Subscribe to live updates for specific keys:

```java
import io.dapr.client.domain.SubscribeConfigurationResponse;
import reactor.core.publisher.Flux;

Flux<SubscribeConfigurationResponse> subscription = client.subscribeConfiguration(
    "configstore",
    List.of("feature-flag-new-ui", "max-retry-count"),
    Map.of()
);

// Process updates
subscription.subscribe(response -> {
    response.getItems().forEach((key, item) -> {
        System.out.println("Config updated - " + key + ": " + item.getValue());
        applyConfigChange(key, item.getValue());
    });
}, error -> System.err.println("Subscription error: " + error.getMessage()));
```

## Unsubscribing from Updates

Track the subscription ID to unsubscribe later:

```java
SubscribeConfigurationResponse initial = subscription.blockFirst();
String subscriptionId = initial.getSubscriptionId();

// Later, unsubscribe
client.unsubscribeConfiguration(subscriptionId, "configstore").block();
System.out.println("Unsubscribed from configuration updates");
```

## Applying Configuration in a Service

```java
@Service
public class FeatureFlagService {

    private volatile boolean newUiEnabled = false;
    private final DaprClient daprClient;

    public FeatureFlagService(DaprClient daprClient) {
        this.daprClient = daprClient;
        loadInitialConfig();
        subscribeToChanges();
    }

    private void loadInitialConfig() {
        Map<String, ConfigurationItem> cfg = daprClient
            .getConfiguration("configstore", List.of("feature-flag-new-ui"), Map.of())
            .block();
        newUiEnabled = Boolean.parseBoolean(
            cfg.get("feature-flag-new-ui").getValue()
        );
    }

    private void subscribeToChanges() {
        daprClient.subscribeConfiguration("configstore",
            List.of("feature-flag-new-ui"), Map.of()
        ).subscribe(resp -> {
            ConfigurationItem item = resp.getItems().get("feature-flag-new-ui");
            if (item != null) {
                newUiEnabled = Boolean.parseBoolean(item.getValue());
            }
        });
    }

    public boolean isNewUiEnabled() {
        return newUiEnabled;
    }
}
```

## Summary

Dapr's Configuration API in Java allows you to read dynamic settings from external stores and react to changes in real time without redeploying your services. By combining initial reads with subscriptions, you can build services that adapt their behavior to configuration changes safely and efficiently.
