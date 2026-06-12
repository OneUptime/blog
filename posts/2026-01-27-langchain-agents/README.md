# How to Use LangChain Agents for AI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, AI, Agent, LLM, Python, OpenAI, Tool, Autonomous Systems

Description: Learn how to build AI agents with LangChain that can reason, use tools, and take actions to accomplish complex tasks autonomously.

---

> Agents represent the shift from static prompts to dynamic AI systems that can think, plan, and act. LangChain agents combine large language models with tools and reasoning frameworks to create applications that autonomously solve complex problems.

Traditional LLM applications follow a fixed execution path. Agents break this pattern by letting the model decide which tools to use and in what order, enabling AI systems that adapt to each unique situation.

---

## What Are LangChain Agents

An agent is an LLM-powered system that:
- Receives a goal or question
- Reasons about how to achieve it
- Selects and uses tools
- Observes the results
- Iterates until the goal is met

Unlike chains (which follow predetermined steps), agents dynamically choose their path based on intermediate results.

```python
# agents_intro.py

# Basic agent structure - the model decides what actions to take
from langchain.agents import create_agent
from langchain.tools import tool

@tool("calculator", description="Useful for math calculations. Input should be a math expression.")
def calculator(expression: str) -> str:
    """Evaluate a simple math expression."""
    return str(eval(expression))  # Use a safer math parser in production

@tool("search", description="Search the web for current information.")
def search(query: str) -> str:
    """Return search results for a query."""
    return "Search results for: " + query  # Placeholder

# Create the agent - combines model, tools, and prompt
agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=[calculator, search],
    system_prompt="You are a helpful assistant."
)

# Run the agent with a question
result = agent.invoke({
    "messages": [{"role": "user", "content": "What is 25 * 47 + 123?"}]
})
print(result["messages"][-1].content)  # Agent uses calculator and returns answer
```

---

## Agent Types

LangChain's current agent API uses `create_agent` as the standard agent factory, with tools, prompts, middleware, and provider-specific model capabilities controlling the behavior.

### ReAct Agent

ReAct (Reasoning + Acting) agents follow a thought-action-observation loop. They explicitly reason about each step before taking action.

```python
# react_agent.py
# ReAct agents think step by step, showing their reasoning
from langchain.agents import create_agent
from langchain.tools import tool

# Define tools using the @tool decorator for cleaner syntax
@tool
def get_weather(city: str) -> str:
    """Get current weather for a city. Returns temperature and conditions."""
    # Simulated weather API response
    weather_data = {
        "new york": "72F, Sunny",
        "london": "58F, Cloudy",
        "tokyo": "68F, Clear"
    }
    return weather_data.get(city.lower(), "Weather data not available")

@tool
def get_time(timezone: str) -> str:
    """Get current time in a timezone. Input should be a timezone name."""
    from datetime import datetime
    import pytz
    try:
        tz = pytz.timezone(timezone)
        return datetime.now(tz).strftime("%H:%M:%S")
    except pytz.UnknownTimeZoneError:
        return "Invalid timezone"

tools = [get_weather, get_time]

agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=tools,
    system_prompt="Reason step by step before choosing tools."
)

# The agent will reason about which tools to use
result = agent.invoke({
    "messages": [{"role": "user", "content": "What's the weather in Tokyo and what time is it there?"}]
})

# Verbose output shows the agent's reasoning:
# Thought: I need to get weather and time for Tokyo
# Action: get_weather
# Action Input: Tokyo
# Observation: 68F, Clear
# Thought: Now I need the time in Tokyo
# Action: get_time
# Action Input: Asia/Tokyo
# Observation: 14:30:45
# Thought: I have both pieces of information
# Final Answer: In Tokyo, it's currently 68F and Clear, and the time is 14:30:45
```

### OpenAI Tool Calling

OpenAI models support tool calling, where the model emits structured arguments for tools instead of free-form text.

```python
# openai_tool_calling.py
# OpenAI tool calling - uses structured tool arguments
from langchain.agents import create_agent
from langchain.tools import tool
from pydantic import BaseModel, Field

# Define input schema for structured tools
class OrderLookupInput(BaseModel):
    order_id: str = Field(description="The order ID to look up")
    include_items: bool = Field(default=True, description="Include line items")

class CustomerLookupInput(BaseModel):
    customer_id: str = Field(description="The customer ID")

# Create structured tools with Pydantic schemas
@tool(args_schema=OrderLookupInput)
def lookup_order(order_id: str, include_items: bool = True) -> dict:
    """Look up order details by order ID"""
    return {
        "order_id": order_id,
        "status": "shipped",
        "total": 149.99,
        "items": ["Widget A", "Gadget B"] if include_items else []
    }

@tool(args_schema=CustomerLookupInput)
def lookup_customer(customer_id: str) -> dict:
    """Look up customer details by customer ID"""
    return {
        "customer_id": customer_id,
        "name": "John Doe",
        "email": "john@example.com",
        "tier": "premium"
    }

agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=[lookup_order, lookup_customer],
    system_prompt="You are a helpful customer service assistant."
)

# Agent uses tool calling to invoke tools with proper parameters
result = agent.invoke({
    "messages": [{
        "role": "user",
        "content": "Look up order ORD-12345 and tell me the customer's email for customer CUST-789"
    }]
})
```

### Standard Agent with Tool Calling (Recommended)

The standard `create_agent` API works across multiple LLM providers supporting tool calling.

```python
# tool_calling_agent.py
# Universal tool calling agent - works with OpenAI, Anthropic, and others
from langchain.agents import create_agent
from langchain.tools import tool

@tool
def search_database(query: str, table: str = "users") -> str:
    """Search a database table. Returns matching records."""
    return f"Found 3 records matching '{query}' in {table}"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email to a recipient."""
    return f"Email sent to {to}"

@tool
def create_ticket(title: str, description: str, priority: str = "medium") -> str:
    """Create a support ticket. Priority can be low, medium, or high."""
    return f"Created ticket: {title} (Priority: {priority})"

tools = [search_database, send_email, create_ticket]

agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=tools,
    system_prompt="You are a helpful assistant that manages customer support operations."
)

result = agent.invoke({
    "messages": [{
        "role": "user",
        "content": "Search for customers named Smith and create a high priority ticket for account review"
    }]
})
```

---

## Creating Custom Tools

Tools are the capabilities you give to agents. Well-designed tools make agents more effective.

### Basic Tool Creation

```python
# custom_tools.py
# Different ways to create custom tools for agents
from langchain.tools import Tool, tool, StructuredTool
from pydantic import BaseModel, Field
import requests

# Method 1: Using the @tool decorator (simplest)
@tool
def get_stock_price(symbol: str) -> str:
    """Get the current stock price for a ticker symbol."""
    # In production, call a real API
    prices = {"AAPL": 175.50, "GOOGL": 140.25, "MSFT": 378.91}
    price = prices.get(symbol.upper())
    if price:
        return f"{symbol.upper()}: ${price}"
    return f"Price not found for {symbol}"

# Method 2: Using Tool class directly
def fetch_webpage(url: str) -> str:
    """Fetch and return text content from a URL"""
    try:
        response = requests.get(url, timeout=10)
        return response.text[:1000]  # Truncate for context limits
    except Exception as e:
        return f"Error fetching URL: {str(e)}"

webpage_tool = Tool(
    name="fetch_webpage",
    func=fetch_webpage,
    description="Fetch content from a URL. Input should be a valid URL."
)

# Method 3: StructuredTool with Pydantic schema (most control)
class DatabaseQueryInput(BaseModel):
    """Input schema for database queries"""
    query: str = Field(description="SQL query to execute")
    database: str = Field(default="main", description="Database to query")
    limit: int = Field(default=10, description="Maximum rows to return")

def execute_query(query: str, database: str = "main", limit: int = 10) -> str:
    """Execute a read-only SQL query"""
    # Validate query is SELECT only
    if not query.strip().upper().startswith("SELECT"):
        return "Error: Only SELECT queries allowed"
    # Execute query (placeholder)
    return f"Executed '{query}' on {database}, returned {limit} rows"

database_tool = StructuredTool.from_function(
    func=execute_query,
    name="database_query",
    description="Execute read-only SQL queries against the database",
    args_schema=DatabaseQueryInput
)
```

### Async Tools

For I/O-bound operations, async tools prevent blocking.

```python
# async_tools.py
# Async tools for non-blocking I/O operations
from langchain.tools import tool
import aiohttp
import asyncio

@tool
async def async_fetch_data(url: str) -> str:
    """Asynchronously fetch data from a URL. Better for multiple concurrent requests."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=10) as response:
            text = await response.text()
            return text[:500]  # Truncate response

@tool
async def async_api_call(endpoint: str, method: str = "GET") -> str:
    """Make async API calls to internal services."""
    base_url = "https://api.example.com"
    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/{endpoint}"
        async with session.request(method, url) as response:
            return await response.json()

# Using async tools with agent
async def run_async_agent():
    from langchain.agents import create_agent

    tools = [async_fetch_data, async_api_call]

    agent = create_agent(
        model="openai:gpt-5.4-mini",
        tools=tools,
        system_prompt="You are a helpful assistant."
    )

    # Use ainvoke for async execution
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": "Fetch data from https://api.example.com/status"}]
    })
    return result

# Run the async agent
# asyncio.run(run_async_agent())
```

### Tool Error Handling

Robust tools handle errors gracefully and return useful feedback to the agent.

```python
# tool_error_handling.py
# Tools with proper error handling and validation
from langchain.tools import tool
from pydantic import BaseModel, Field, field_validator
import re

class EmailInput(BaseModel):
    """Validated input for email operations"""
    to_address: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body content")

    @field_validator("to_address")
    @classmethod
    def validate_email(cls, v):
        # Basic email validation
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, v):
            raise ValueError(f"Invalid email address: {v}")
        return v

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v):
        if len(v) > 100:
            raise ValueError("Subject must be under 100 characters")
        return v

@tool(args_schema=EmailInput)
def send_email_safe(to_address: str, subject: str, body: str) -> str:
    """Send an email with validation. Returns success message or error details."""
    try:
        # Simulated email sending
        if "test" in to_address:
            raise Exception("Cannot send to test addresses")

        # Send email logic here
        return f"Email sent successfully to {to_address}"

    except ValueError as e:
        # Validation errors
        return f"Validation error: {str(e)}"
    except Exception as e:
        # Other errors
        return f"Failed to send email: {str(e)}"

@tool
def safe_file_read(filepath: str) -> str:
    """Safely read a file with error handling and path validation."""
    # Security: Prevent directory traversal
    if ".." in filepath or filepath.startswith("/"):
        return "Error: Invalid file path. Use relative paths only."

    # Restrict to allowed directories
    allowed_dirs = ["data", "documents", "reports"]
    if not any(filepath.startswith(d) for d in allowed_dirs):
        return f"Error: Can only read from {allowed_dirs}"

    try:
        with open(filepath, "r") as f:
            content = f.read()
            # Truncate large files
            if len(content) > 5000:
                return content[:5000] + "\n... (truncated)"
            return content
    except FileNotFoundError:
        return f"Error: File not found: {filepath}"
    except PermissionError:
        return f"Error: Permission denied: {filepath}"
    except Exception as e:
        return f"Error reading file: {str(e)}"
```

---

## Agent Configuration

The agent harness manages the agent loop, handling model calls, tool execution, middleware, and stopping conditions.

```python
# agent_executor_config.py
# Configuring an agent for production use
from langchain.agents import create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware, ToolCallLimitMiddleware
from langchain_openai import ChatOpenAI
from langchain.tools import tool

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    timeout=60,
    max_retries=2,
)

@tool
def complex_calculation(expression: str) -> str:
    """Perform complex calculations. May take multiple steps."""
    return str(eval(expression))

tools = [complex_calculation]

agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="You are a math assistant. Show your work step by step.",
    middleware=[
        ModelCallLimitMiddleware(run_limit=5, exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=10),
    ],
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "Calculate (25 * 47) + (33 * 19) - 127"}]
})

# Access the final message
print("Final answer:", result["messages"][-1].content)
```

---

## Memory Integration

Add memory to agents for context-aware conversations across multiple interactions.

```python
# agent_memory.py
# Agents with conversation memory for multi-turn interactions
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver
from langchain.tools import tool

@tool
def get_user_profile(user_id: str) -> str:
    """Get user profile information."""
    return f"User {user_id}: Name=Alice, Plan=Premium, Joined=2023"

@tool
def update_preferences(user_id: str, preference: str, value: str) -> str:
    """Update a user preference setting."""
    return f"Updated {preference} to {value} for user {user_id}"

tools = [get_user_profile, update_preferences]

# Checkpointer stores conversation history by thread ID
agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=tools,
    system_prompt="You are a helpful customer support agent. Use conversation history to maintain context.",
    checkpointer=InMemorySaver()
)

config = {"configurable": {"thread_id": "customer-user-123"}}

# Multi-turn conversation - agent remembers context
response1 = agent.invoke(
    {"messages": [{"role": "user", "content": "Get my profile, my user ID is USER-123"}]},
    config=config
)
print("Response 1:", response1["messages"][-1].content)

# Agent remembers the user ID from previous turn
response2 = agent.invoke(
    {"messages": [{"role": "user", "content": "Update my notification preference to email only"}]},
    config=config
)
print("Response 2:", response2["messages"][-1].content)

# Reference earlier context
response3 = agent.invoke(
    {"messages": [{"role": "user", "content": "What plan am I on again?"}]},
    config=config
)
print("Response 3:", response3["messages"][-1].content)
```

### Token-Aware Memory

For long conversations, manage context window limits.

```python
# token_aware_memory.py
# Memory that respects token limits for long conversations
from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware
from langgraph.checkpoint.memory import InMemorySaver

# Summarization middleware compresses history when it grows too large
agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=[],
    middleware=[
        SummarizationMiddleware(
            model="openai:gpt-5.4-mini",
            trigger=("tokens", 4000),
            keep=("messages", 20)
        )
    ],
    checkpointer=InMemorySaver()
)

# Older messages are summarized while recent context is preserved
```

---

## Error Handling and Retries

Production agents need robust error handling for reliability.

```python
# error_handling.py
# Comprehensive error handling for production agents
from langchain.agents import create_agent
from langchain.agents.middleware import ToolRetryMiddleware
from langchain_openai import ChatOpenAI
from langchain.tools import tool
import time

llm = ChatOpenAI(model="gpt-5.4-mini", max_retries=2)

@tool
def unreliable_api(query: str) -> str:
    """Call an external API that sometimes fails."""
    import random
    if random.random() < 0.3:  # 30% failure rate
        raise Exception("API temporarily unavailable")
    return f"API result for: {query}"

agent = create_agent(
    model=llm,
    tools=[unreliable_api],
    system_prompt="You are a helpful assistant. If a tool fails, try an alternative approach.",
    middleware=[
        ToolRetryMiddleware(max_retries=3)
    ],
)

# Wrap execution with retry logic
def invoke_with_retry(agent, input_data, max_retries=3, delay=1.0):
    """Execute agent with exponential backoff retry"""
    last_error = None

    for attempt in range(max_retries):
        try:
            result = agent.invoke(input_data)
            return result
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)  # Exponential backoff
                print(f"Attempt {attempt + 1} failed, retrying in {wait_time}s...")
                time.sleep(wait_time)

    # All retries exhausted
    return {"output": f"Failed after {max_retries} attempts: {str(last_error)}"}

# Usage with retry
result = invoke_with_retry(
    agent,
    {"messages": [{"role": "user", "content": "Query the API for latest updates"}]},
    max_retries=3
)
```

---

## Streaming Agent Outputs

Stream responses for better user experience in interactive applications.

```python
# streaming_agents.py
# Stream agent thoughts and tool outputs in real-time
from langchain.agents import create_agent
from langchain.tools import tool

@tool
def analyze_data(dataset: str) -> str:
    """Analyze a dataset and return insights."""
    return f"Analysis of {dataset}: 1000 records, avg value 45.2, trend increasing"

tools = [analyze_data]

agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=tools,
    system_prompt="You are a data analyst. Explain your analysis step by step."
)

# Stream execution events
async def stream_agent():
    stream = agent.stream_events({
        "messages": [{"role": "user", "content": "Analyze the sales dataset and summarize findings"}],
    }, version="v3")

    for message in stream.messages:
        for delta in message.text:
            print(delta, end="", flush=True)

    for call in stream.tool_calls:
        print(f"\n[Using tool: {call.tool_name}]")
        print(f"\n[Tool result: {str(call.output)[:100]}...]")

# Run streaming: asyncio.run(stream_agent())
```

### FastAPI Streaming Endpoint

```python
# fastapi_streaming.py
# Stream agent responses through a FastAPI endpoint
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

# Assume agent is configured elsewhere with create_agent(...)
# agent = create_agent(...)

@app.post("/chat/stream")
async def stream_chat(request: dict):
    """Stream agent response as Server-Sent Events"""

    async def generate():
        stream = agent.stream_events(
            {"messages": [{"role": "user", "content": request["message"]}]},
            version="v3"
        )

        for message in stream.messages:
            for delta in message.text:
                # Format as SSE
                yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

        for call in stream.tool_calls:
            yield f"data: {json.dumps({'type': 'tool_start', 'tool': call.tool_name})}\n\n"
            yield f"data: {json.dumps({'type': 'tool_end', 'result': str(call.output)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

---

## Agent Middleware for Monitoring

Middleware provides hooks for logging, monitoring, and debugging agent behavior.

```python
# agent_monitoring.py
# Custom middleware for monitoring and logging agent execution
from collections.abc import Callable
from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware
from langchain.messages import ToolMessage
from langchain.tools import tool
from langchain.tools.tool_node import ToolCallRequest
from langgraph.types import Command
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentMonitorMiddleware(AgentMiddleware):
    """Custom middleware for monitoring tool execution"""

    def __init__(self):
        self.tool_calls = []
        self.errors = []

    def wrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], ToolMessage | Command],
    ) -> ToolMessage | Command:
        """Called around each tool invocation"""
        tool_name = request.tool_call["name"]
        started_at = time.time()
        logger.info(f"Tool started: {tool_name}")

        try:
            result = handler(request)
            duration = time.time() - started_at
            self.tool_calls.append({"tool": tool_name, "duration": duration})
            logger.info(f"Tool completed: {tool_name} in {duration:.2f}s")
            return result
        except Exception as error:
            self.errors.append(str(error))
            logger.error(f"Tool error: {error}")
            raise

# Use the middleware with an agent
@tool
def process_data(data: str) -> str:
    """Process some data"""
    return f"Processed: {data}"

tools = [process_data]

# Create middleware instance
monitor = AgentMonitorMiddleware()

agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=tools,
    middleware=[monitor],
    system_prompt="You are a helpful assistant."
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "Process the customer data"}]
})

# Access collected metrics
print(f"Tool calls made: {monitor.tool_calls}")
print(f"Errors encountered: {monitor.errors}")
```

---

## Multi-Agent Systems

Coordinate multiple specialized agents for complex workflows.

```python
# multi_agent.py
# Multi-agent system with specialized agents
from langchain.agents import create_agent
from langchain.tools import tool
from typing import Dict, Any

# Research Agent - gathers information
@tool
def web_search(query: str) -> str:
    """Search the web for information"""
    return f"Search results for '{query}': Found 5 relevant articles..."

@tool
def read_document(doc_id: str) -> str:
    """Read a document from the knowledge base"""
    return f"Document {doc_id} content: This is the document text..."

research_tools = [web_search, read_document]

research_agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=research_tools,
    system_prompt="You are a research agent. Gather relevant information to answer questions."
)

# Writer Agent - creates content
@tool
def write_draft(topic: str, key_points: str) -> str:
    """Write a draft based on topic and key points"""
    return f"Draft about {topic}: Based on the key points, here is the content..."

@tool
def edit_text(text: str, instructions: str) -> str:
    """Edit text according to instructions"""
    return f"Edited text: {text[:50]}... (applied: {instructions})"

writer_tools = [write_draft, edit_text]

writer_agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=writer_tools,
    system_prompt="You are a writing agent. Create clear, well-structured content."
)

# Coordinator Agent - orchestrates the workflow
class MultiAgentCoordinator:
    """Coordinates multiple specialized agents"""

    def __init__(self):
        self.agents = {
            "research": research_agent,
            "writer": writer_agent
        }

    def run_workflow(self, task: str) -> Dict[str, Any]:
        """Run a multi-agent workflow"""
        results = {}

        # Step 1: Research phase
        research_result = self.agents["research"].invoke({
            "messages": [{"role": "user", "content": f"Research the following topic: {task}"}]
        })
        results["research"] = research_result["messages"][-1].content

        # Step 2: Writing phase using research results
        writing_result = self.agents["writer"].invoke({
            "messages": [{
                "role": "user",
                "content": f"Write content about: {task}\n\nResearch findings: {results['research']}"
            }]
        })
        results["content"] = writing_result["messages"][-1].content

        return results

# Usage
coordinator = MultiAgentCoordinator()
result = coordinator.run_workflow("Benefits of microservices architecture")
print("Research:", result["research"])
print("Content:", result["content"])
```

### Agent as a Tool

One agent can use another agent as a tool.

```python
# agent_as_tool.py
# Use specialized agents as tools for a supervisor agent
from langchain.agents import create_agent
from langchain.tools import tool

# Wrap research executor as a tool
@tool
def research_assistant(question: str) -> str:
    """Research any topic. Input should be a research question."""
    result = research_agent.invoke({
        "messages": [{"role": "user", "content": question}]
    })
    return result["messages"][-1].content

# Wrap writer executor as a tool
@tool
def writing_assistant(prompt: str) -> str:
    """Write content. Input should include topic and any context."""
    result = writer_agent.invoke({
        "messages": [{"role": "user", "content": prompt}]
    })
    return result["messages"][-1].content

# Supervisor agent that delegates to specialized agents
supervisor_tools = [research_assistant, writing_assistant]

supervisor_agent = create_agent(
    model="openai:gpt-5.4-mini",
    tools=supervisor_tools,
    system_prompt="""You are a supervisor agent that coordinates specialized assistants.
    Use the research_assistant for gathering information.
    Use the writing_assistant for creating content.
    Delegate tasks appropriately and combine results."""
)

# The supervisor decides when to use each specialized agent
result = supervisor_agent.invoke({
    "messages": [{
        "role": "user",
        "content": "Create a blog post about Kubernetes networking. Research the topic first, then write the post."
    }]
})
```

---

## Best Practices Summary

1. **Choose the right agent type** - Tool calling agents for most cases, ReAct for complex reasoning
2. **Design focused tools** - Each tool should do one thing well with clear descriptions
3. **Validate tool inputs** - Use Pydantic schemas to catch errors early
4. **Handle errors gracefully** - Return informative messages instead of crashing
5. **Set call limits** - Prevent infinite loops with model and tool call limit middleware
6. **Use memory wisely** - Token-aware memory for long conversations
7. **Stream for UX** - Stream responses in interactive applications
8. **Monitor everything** - Use middleware, event streams, and tracing to track performance and errors
9. **Test tool behavior** - Unit test tools independently before agent integration
10. **Start simple** - Begin with fewer tools and add complexity as needed

### Limitations to Consider

- **Cost** - Each iteration involves LLM calls; complex tasks get expensive
- **Latency** - Multi-step reasoning adds response time
- **Reliability** - Agents can get stuck in loops or make wrong tool choices
- **Context limits** - Long conversations may exceed token limits
- **Hallucination** - Agents may fabricate tool outputs or skip necessary steps

---

*Building production AI applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your AI systems, including latency tracking, error rates, and usage metrics with native OpenTelemetry support.*

**Related Reading:**
- [How to Structure Logs Properly in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
