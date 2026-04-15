# How to Use Dapr AI Integration with Java SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AI, Java, LLM, Microservice

Description: Learn how to use Dapr's AI building blocks with the Java SDK to call LLMs, manage conversation state, and build AI-powered microservices.

---

## Introduction

Dapr's AI building blocks provide a portable abstraction for interacting with large language models (LLMs) and other AI services. The Java SDK exposes these capabilities through a clean API, letting you switch AI providers without changing application code.

## Adding the Dependency

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk</artifactId>
  <version>1.15.0</version>
</dependency>
```

## Configuring an AI Component

Create a Dapr component YAML for your AI provider. For OpenAI:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai-llm
spec:
  type: conversation.openai
  metadata:
    - name: key
      secretKeyRef:
        name: openai-secret
        key: api-key
    - name: model
      value: gpt-4o
```

## Sending a Conversation Request

Use the `DaprPreviewClient` to send messages to an LLM:

```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.ConversationInput;
import io.dapr.client.domain.ConversationRequest;
import io.dapr.client.domain.ConversationResponse;
import java.util.List;

DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient();

ConversationInput input = new ConversationInput("Summarize the Dapr documentation in 3 bullet points.");

ConversationRequest request = new ConversationRequest("openai-llm", List.of(input));

ConversationResponse response = client.converse(request).block();
response.getConversationOutputs().forEach(output ->
    System.out.println("AI response: " + output.getResult())
);
```

## Enabling Conversation Context

Maintain conversation history by providing a context ID:

```java
ConversationRequest contextRequest = new ConversationRequest("openai-llm", List.of(
    new ConversationInput("What is Dapr?")
))
    .setContextId("user-session-42");

ConversationResponse first = client.converse(contextRequest).block();

// Follow-up in the same conversation
ConversationRequest followUp = new ConversationRequest("openai-llm", List.of(
    new ConversationInput("How does it handle state?")
))
    .setContextId("user-session-42");

ConversationResponse second = client.converse(followUp).block();
System.out.println(second.getConversationOutputs().get(0).getResult());
```

## Integrating with a REST Controller

Expose AI capabilities through a Spring Boot endpoint:

```java
@RestController
@RequestMapping("/ai")
public class AiController {

    private final DaprPreviewClient daprClient;

    public AiController(DaprPreviewClient daprClient) {
        this.daprClient = daprClient;
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody String prompt) {
        ConversationRequest req = new ConversationRequest(
            "openai-llm",
            List.of(new ConversationInput(prompt))
        );
        ConversationResponse resp = daprClient.converse(req).block();
        String result = resp.getConversationOutputs().get(0).getResult();
        return ResponseEntity.ok(result);
    }
}
```

## Switching Providers

To switch from OpenAI to Azure OpenAI, update only the component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai-llm
spec:
  type: conversation.openai
  metadata:
    - name: key
      secretKeyRef:
        name: azure-openai-secret
        key: api-key
    - name: endpoint
      value: "https://my-resource.openai.azure.com/"
    - name: apiType
      value: "azure"
    - name: model
      value: gpt-4o
```

No Java code changes are needed.

## Summary

Dapr's AI integration in the Java SDK provides a provider-agnostic API for calling LLMs and managing conversation state. By abstracting the AI provider behind a Dapr component, you can switch between OpenAI, Azure OpenAI, and other providers with a configuration change rather than a code change.
