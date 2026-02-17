# How to Build a Streaming Function Call Application with Gemini on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Streaming, Function Calling

Description: Learn how to build streaming function call applications with Gemini on Vertex AI for responsive AI agents that execute tools in real time.

---

Combining streaming with function calling gives you the best of both worlds: users see the model's response as it is generated, and the model can pause to call tools when it needs external data. This creates a smooth experience where the user sees progress even when the backend is fetching data from APIs or databases.

Building this requires handling the interleaved stream of text chunks and function call requests. It is more complex than basic streaming or basic function calling alone, but the result is worth it. Let me walk you through the implementation.

## Why Streaming Function Calls?

Without streaming, function-calling applications have noticeable pauses. The user sends a message, waits for the model to decide to call a function, waits for the function to execute, then waits for the model to generate its response. With streaming, the user can see the model start to respond immediately, and function calls happen seamlessly in the background.

The flow looks like this:

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Gemini
    participant Tool

    User->>App: Ask question
    App->>Gemini: Stream request
    Gemini-->>App: Text chunk 1
    App-->>User: Display chunk 1
    Gemini-->>App: Text chunk 2
    App-->>User: Display chunk 2
    Gemini-->>App: Function call request
    App->>Tool: Execute function
    Tool->>App: Return result
    App->>Gemini: Send result, continue streaming
    Gemini-->>App: Text chunk 3 (with tool result)
    App-->>User: Display chunk 3
```

## Setting Up the Basics

Start by defining your tools and creating the model.

```python
import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    FunctionDeclaration,
    Part,
    Tool,
)

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Define tools that the model can call
get_stock_price = FunctionDeclaration(
    name="get_stock_price",
    description="Get the current stock price for a ticker symbol.",
    parameters={
        "type": "object",
        "properties": {
            "ticker": {
                "type": "string",
                "description": "Stock ticker symbol, e.g. GOOGL"
            }
        },
        "required": ["ticker"]
    }
)

get_company_info = FunctionDeclaration(
    name="get_company_info",
    description="Get basic company information like sector, market cap, and CEO.",
    parameters={
        "type": "object",
        "properties": {
            "company_name": {
                "type": "string",
                "description": "The company name"
            }
        },
        "required": ["company_name"]
    }
)

# Bundle tools together
finance_tools = Tool(
    function_declarations=[get_stock_price, get_company_info]
)

# Create the model with tools
model = GenerativeModel(
    "gemini-2.0-flash",
    tools=[finance_tools],
    system_instruction=(
        "You are a financial analysis assistant. Use the available tools "
        "to get real-time data when answering questions about stocks "
        "and companies."
    )
)
```

## Implementing the Tool Executor

You need a function that executes tool calls when the model requests them.

```python
import random

def execute_tool(function_name, args):
    """Execute a tool and return the result."""
    args_dict = dict(args)

    if function_name == "get_stock_price":
        # In production, call a real stock API
        ticker = args_dict.get("ticker", "UNKNOWN")
        price = round(random.uniform(50, 500), 2)
        return {
            "ticker": ticker,
            "price": price,
            "currency": "USD",
            "change_percent": round(random.uniform(-5, 5), 2),
            "volume": random.randint(1000000, 50000000)
        }

    elif function_name == "get_company_info":
        company = args_dict.get("company_name", "Unknown")
        return {
            "name": company,
            "sector": "Technology",
            "market_cap": "1.8T",
            "ceo": "Sample CEO",
            "employees": 150000
        }

    else:
        return {"error": f"Unknown function: {function_name}"}
```

## Handling the Streaming Response

The core of a streaming function call application is the response handler. It needs to process text chunks, detect function calls, execute them, and continue the stream.

```python
def process_streaming_response(chat, user_message):
    """Process a streaming response that may include function calls."""
    # Send message with streaming
    responses = chat.send_message(user_message, stream=True)

    collected_text = ""
    function_calls = []

    for chunk in responses:
        for part in chunk.candidates[0].content.parts:
            # Handle text parts - stream them to the user
            if part.text:
                print(part.text, end="", flush=True)
                collected_text += part.text

            # Handle function call parts
            elif part.function_call:
                fc = part.function_call
                function_calls.append({
                    "name": fc.name,
                    "args": dict(fc.args)
                })
                print(f"\n[Calling {fc.name}...]", flush=True)

    print()  # Newline after streaming

    # If there were function calls, execute them and continue
    if function_calls:
        function_responses = []
        for fc in function_calls:
            result = execute_tool(fc["name"], fc["args"])
            function_responses.append(
                Part.from_function_response(
                    name=fc["name"],
                    response={"result": result}
                )
            )

        # Send function results back and stream the continuation
        continuation = chat.send_message(function_responses, stream=True)

        for chunk in continuation:
            for part in chunk.candidates[0].content.parts:
                if part.text:
                    print(part.text, end="", flush=True)
                    collected_text += part.text

        print()

    return collected_text

# Usage
chat = model.start_chat()
result = process_streaming_response(
    chat,
    "What is the current stock price for Google and tell me about the company?"
)
```

## Building a Full Streaming Agent

Here is a more robust agent that handles multiple rounds of function calls and maintains conversation state.

```python
class StreamingFunctionAgent:
    """A streaming agent that can call functions during response generation."""

    def __init__(self, model, tool_executor, max_tool_rounds=3):
        self.model = model
        self.tool_executor = tool_executor
        self.max_tool_rounds = max_tool_rounds
        self.chat = model.start_chat()

    def process_message(self, message, on_text=None, on_tool_call=None):
        """Process a user message with streaming and function calls.

        Args:
            message: The user's message
            on_text: Callback for text chunks - on_text(text_chunk)
            on_tool_call: Callback for tool calls - on_tool_call(name, args)
        """
        if on_text is None:
            on_text = lambda t: print(t, end="", flush=True)
        if on_tool_call is None:
            on_tool_call = lambda n, a: print(f"\n[Tool: {n}({a})]")

        current_input = message
        full_response = ""

        for round_num in range(self.max_tool_rounds + 1):
            # Send message with streaming
            if isinstance(current_input, str):
                responses = self.chat.send_message(current_input, stream=True)
            else:
                responses = self.chat.send_message(current_input, stream=True)

            function_calls = []

            for chunk in responses:
                if not chunk.candidates:
                    continue

                for part in chunk.candidates[0].content.parts:
                    if part.text:
                        on_text(part.text)
                        full_response += part.text
                    elif part.function_call:
                        fc = part.function_call
                        on_tool_call(fc.name, dict(fc.args))
                        function_calls.append(fc)

            # If no function calls, we are done
            if not function_calls:
                break

            # Execute all function calls
            function_responses = []
            for fc in function_calls:
                result = self.tool_executor(fc.name, fc.args)
                function_responses.append(
                    Part.from_function_response(
                        name=fc.name,
                        response={"result": result}
                    )
                )

            # Continue with function results
            current_input = function_responses

        return full_response

# Create the agent
agent = StreamingFunctionAgent(
    model=model,
    tool_executor=execute_tool
)

# Use the agent
print("Agent: ", end="")
response = agent.process_message(
    "Compare Google and Microsoft stock prices and give me a brief analysis."
)
print()
```

## Handling Errors During Streaming

Function calls can fail. You need graceful error handling that does not break the stream.

```python
def safe_tool_executor(function_name, args):
    """Execute a tool with error handling."""
    try:
        result = execute_tool(function_name, args)
        return result
    except TimeoutError:
        return {"error": "Tool call timed out. The service may be temporarily unavailable."}
    except ConnectionError:
        return {"error": "Could not connect to the external service."}
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}

# Use the safe executor with the agent
agent = StreamingFunctionAgent(
    model=model,
    tool_executor=safe_tool_executor
)
```

## Web Application Integration

In a web application, you stream responses to the client using server-sent events (SSE) or WebSockets.

```python
from flask import Flask, Response, request
import json

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat_endpoint():
    """Stream a chat response with function calling."""
    user_message = request.json.get("message", "")

    def generate():
        agent = StreamingFunctionAgent(
            model=model,
            tool_executor=safe_tool_executor,
        )

        def on_text(text):
            # Send text chunk as SSE
            yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

        def on_tool(name, args):
            # Notify client about tool call
            yield f"data: {json.dumps({'type': 'tool_call', 'name': name})}\n\n"

        # Process with callbacks
        # Note: In practice, you would use a different pattern
        # for generator-based callbacks
        responses = agent.chat.send_message(user_message, stream=True)

        for chunk in responses:
            for part in chunk.candidates[0].content.parts:
                if part.text:
                    yield f"data: {json.dumps({'type': 'text', 'content': part.text})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype="text/event-stream")
```

## Performance Considerations

Streaming function call applications have unique performance characteristics:

- First token latency is the same as non-streaming since the model starts generating immediately
- Function call round-trips add latency proportional to your tool execution time
- Multiple parallel function calls should be executed concurrently when possible
- Keep tool responses small - large tool responses slow down the continuation generation

```python
import asyncio

async def execute_tools_parallel(function_calls):
    """Execute multiple tool calls in parallel."""
    tasks = []
    for fc in function_calls:
        task = asyncio.create_task(
            async_execute_tool(fc.name, dict(fc.args))
        )
        tasks.append((fc.name, task))

    results = []
    for name, task in tasks:
        result = await task
        results.append(
            Part.from_function_response(
                name=name,
                response={"result": result}
            )
        )

    return results
```

## Wrapping Up

Streaming function calls create responsive AI agents that feel fast even when they need to fetch external data. The implementation requires careful handling of interleaved text and function call chunks, but the patterns shown here give you a solid foundation. Start with a simple agent, add error handling, then integrate with your web framework. Monitor streaming performance and tool call latency with OneUptime to ensure your agent stays responsive as usage grows.
