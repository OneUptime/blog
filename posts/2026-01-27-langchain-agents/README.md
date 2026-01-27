# How to Use LangChain Agents for AI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, AI, Agents, LLM, Python, OpenAI, Tools, Autonomous Systems

Description: Learn how to build AI agents with LangChain that can reason, use tools, and take actions to accomplish complex tasks autonomously. This guide covers agent types, custom tools, memory, streaming, and multi-agent systems.

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
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langchain import hub

# Initialize the LLM - agents work best with capable models
llm = ChatOpenAI(model="gpt-4", temperature=0)

# Define tools the agent can use
tools = [
    Tool(
        name="Calculator",
        func=lambda x: eval(x),  # Simple calculator (use safer eval in production)
        description="Useful for math calculations. Input should be a math expression."
    ),
    Tool(
        name="Search",
        func=lambda x: "Search results for: " + x,  # Placeholder
        description="Search the web for current information."
    )
]

# Pull a standard ReAct prompt from LangChain hub
prompt = hub.pull("hwchase17/react")

# Create the agent - combines LLM, tools, and prompt
agent = create_react_agent(llm, tools, prompt)

# AgentExecutor runs the agent loop until completion
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run the agent with a question
result = executor.invoke({"input": "What is 25 * 47 + 123?"})
print(result["output"])  # Agent uses Calculator tool and returns answer
```

---

## Agent Types

LangChain provides several agent types optimized for different use cases.

### ReAct Agent

ReAct (Reasoning + Acting) agents follow a thought-action-observation loop. They explicitly reason about each step before taking action.

```python
# react_agent.py
# ReAct agents think step by step, showing their reasoning
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain import hub
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4", temperature=0)

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
    except:
        return "Invalid timezone"

tools = [get_weather, get_time]

# ReAct prompt encourages step-by-step reasoning
prompt = hub.pull("hwchase17/react")

agent = create_react_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# The agent will reason about which tools to use
result = executor.invoke({
    "input": "What's the weather in Tokyo and what time is it there?"
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

### OpenAI Functions Agent

This agent uses OpenAI's function calling feature for more reliable tool usage. The model outputs structured JSON for tool calls.

```python
# openai_functions_agent.py
# OpenAI Functions agent - uses structured function calling
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import StructuredTool
from pydantic import BaseModel, Field

# GPT-4 with function calling enabled
llm = ChatOpenAI(model="gpt-4", temperature=0)

# Define input schema for structured tools
class OrderLookupInput(BaseModel):
    order_id: str = Field(description="The order ID to look up")
    include_items: bool = Field(default=True, description="Include line items")

class CustomerLookupInput(BaseModel):
    customer_id: str = Field(description="The customer ID")

# Create structured tools with Pydantic schemas
def lookup_order(order_id: str, include_items: bool = True) -> dict:
    """Look up order details by order ID"""
    return {
        "order_id": order_id,
        "status": "shipped",
        "total": 149.99,
        "items": ["Widget A", "Gadget B"] if include_items else []
    }

def lookup_customer(customer_id: str) -> dict:
    """Look up customer details by customer ID"""
    return {
        "customer_id": customer_id,
        "name": "John Doe",
        "email": "john@example.com",
        "tier": "premium"
    }

tools = [
    StructuredTool.from_function(
        func=lookup_order,
        name="lookup_order",
        description="Look up order details",
        args_schema=OrderLookupInput
    ),
    StructuredTool.from_function(
        func=lookup_customer,
        name="lookup_customer",
        description="Look up customer information",
        args_schema=CustomerLookupInput
    )
]

# Prompt template for OpenAI functions agent
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful customer service assistant."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")  # For intermediate steps
])

agent = create_openai_functions_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Agent uses function calling to invoke tools with proper parameters
result = executor.invoke({
    "input": "Look up order ORD-12345 and tell me the customer's email for customer CUST-789"
})
```

### Tool Calling Agent (Recommended)

The newest agent type that works across multiple LLM providers supporting tool calling.

```python
# tool_calling_agent.py
# Universal tool calling agent - works with OpenAI, Anthropic, and others
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4")

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

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that manages customer support operations."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({
    "input": "Search for customers named Smith and create a high priority ticket for account review"
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
from langchain.pydantic_v1 import BaseModel, Field
from typing import Optional
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
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    llm = ChatOpenAI(model="gpt-4")
    tools = [async_fetch_data, async_api_call]

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant."),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad")
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools)

    # Use ainvoke for async execution
    result = await executor.ainvoke({"input": "Fetch data from https://api.example.com/status"})
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
from langchain.pydantic_v1 import BaseModel, Field, validator
from typing import Optional
import re

class EmailInput(BaseModel):
    """Validated input for email operations"""
    to_address: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body content")

    @validator("to_address")
    def validate_email(cls, v):
        # Basic email validation
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(pattern, v):
            raise ValueError(f"Invalid email address: {v}")
        return v

    @validator("subject")
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
    import os

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

## Agent Executors

The AgentExecutor manages the agent loop, handling tool execution, retries, and stopping conditions.

```python
# agent_executor_config.py
# Configuring AgentExecutor for production use
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4")

@tool
def complex_calculation(expression: str) -> str:
    """Perform complex calculations. May take multiple steps."""
    return str(eval(expression))

tools = [complex_calculation]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a math assistant. Show your work step by step."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)

# Configure AgentExecutor with production settings
executor = AgentExecutor(
    agent=agent,
    tools=tools,

    # Iteration limits
    max_iterations=10,  # Maximum reasoning steps (default: 15)
    max_execution_time=60.0,  # Timeout in seconds

    # Error handling
    handle_parsing_errors=True,  # Gracefully handle malformed outputs
    return_intermediate_steps=True,  # Include reasoning in output

    # Execution settings
    verbose=True,  # Print agent reasoning (disable in production)
    early_stopping_method="generate"  # How to stop: "force" or "generate"
)

result = executor.invoke({"input": "Calculate (25 * 47) + (33 * 19) - 127"})

# Access intermediate steps for debugging
print("Final answer:", result["output"])
print("Steps taken:", len(result["intermediate_steps"]))
for i, step in enumerate(result["intermediate_steps"]):
    action, observation = step
    print(f"Step {i+1}: {action.tool} - {observation}")
```

---

## Memory Integration

Add memory to agents for context-aware conversations across multiple interactions.

```python
# agent_memory.py
# Agents with conversation memory for multi-turn interactions
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.tools import tool

llm = ChatOpenAI(model="gpt-4")

@tool
def get_user_profile(user_id: str) -> str:
    """Get user profile information."""
    return f"User {user_id}: Name=Alice, Plan=Premium, Joined=2023"

@tool
def update_preferences(user_id: str, preference: str, value: str) -> str:
    """Update a user preference setting."""
    return f"Updated {preference} to {value} for user {user_id}"

tools = [get_user_profile, update_preferences]

# Buffer memory - stores full conversation history
buffer_memory = ConversationBufferMemory(
    memory_key="chat_history",  # Key used in prompt template
    return_messages=True  # Return as message objects
)

# Alternative: Summary memory for long conversations
# summary_memory = ConversationSummaryMemory(
#     llm=llm,
#     memory_key="chat_history",
#     return_messages=True
# )

# Prompt must include the memory placeholder
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful customer support agent. Use the conversation history to maintain context."),
    MessagesPlaceholder(variable_name="chat_history"),  # Memory goes here
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)

executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=buffer_memory,  # Attach memory to executor
    verbose=True
)

# Multi-turn conversation - agent remembers context
response1 = executor.invoke({"input": "Get my profile, my user ID is USER-123"})
print("Response 1:", response1["output"])

# Agent remembers the user ID from previous turn
response2 = executor.invoke({"input": "Update my notification preference to email only"})
print("Response 2:", response2["output"])

# Reference earlier context
response3 = executor.invoke({"input": "What plan am I on again?"})
print("Response 3:", response3["output"])
```

### Token-Aware Memory

For long conversations, manage context window limits.

```python
# token_aware_memory.py
# Memory that respects token limits for long conversations
from langchain.memory import ConversationTokenBufferMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4")

# Memory that automatically trims to token limit
memory = ConversationTokenBufferMemory(
    llm=llm,
    max_token_limit=2000,  # Keep conversation under 2000 tokens
    memory_key="chat_history",
    return_messages=True
)

# Older messages are dropped when limit is exceeded
# Most recent context is preserved
```

---

## Error Handling and Retries

Production agents need robust error handling for reliability.

```python
# error_handling.py
# Comprehensive error handling for production agents
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from langchain.callbacks import StdOutCallbackHandler
import time

llm = ChatOpenAI(model="gpt-4")

@tool
def unreliable_api(query: str) -> str:
    """Call an external API that sometimes fails."""
    import random
    if random.random() < 0.3:  # 30% failure rate
        raise Exception("API temporarily unavailable")
    return f"API result for: {query}"

tools = [unreliable_api]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. If a tool fails, try rephrasing or try again."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)

# Custom error handler function
def handle_tool_error(error: Exception) -> str:
    """Convert exceptions to agent-readable feedback"""
    error_msg = str(error)
    if "unavailable" in error_msg.lower():
        return "The API is temporarily unavailable. Please try again or use an alternative approach."
    elif "timeout" in error_msg.lower():
        return "The request timed out. Consider simplifying the query."
    else:
        return f"Tool error occurred: {error_msg}. Please try a different approach."

executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True,  # Handle malformed LLM outputs
    max_iterations=5,  # Limit retry attempts
)

# Wrap execution with retry logic
def invoke_with_retry(executor, input_data, max_retries=3, delay=1.0):
    """Execute agent with exponential backoff retry"""
    last_error = None

    for attempt in range(max_retries):
        try:
            result = executor.invoke(input_data)
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
    executor,
    {"input": "Query the API for latest updates"},
    max_retries=3
)
```

---

## Streaming Agent Outputs

Stream responses for better user experience in interactive applications.

```python
# streaming_agents.py
# Stream agent thoughts and tool outputs in real-time
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# Enable streaming on the LLM
llm = ChatOpenAI(
    model="gpt-4",
    streaming=True,  # Enable token streaming
    callbacks=[StreamingStdOutCallbackHandler()]  # Print tokens as they arrive
)

@tool
def analyze_data(dataset: str) -> str:
    """Analyze a dataset and return insights."""
    return f"Analysis of {dataset}: 1000 records, avg value 45.2, trend increasing"

tools = [analyze_data]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a data analyst. Explain your analysis step by step."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=False)

# Stream execution events
async def stream_agent():
    async for event in executor.astream_events(
        {"input": "Analyze the sales dataset and summarize findings"},
        version="v1"
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            # Stream LLM tokens
            content = event["data"]["chunk"].content
            if content:
                print(content, end="", flush=True)

        elif kind == "on_tool_start":
            # Tool invocation started
            print(f"\n[Using tool: {event['name']}]")

        elif kind == "on_tool_end":
            # Tool completed
            print(f"\n[Tool result: {event['data']['output'][:100]}...]")

# Run streaming: asyncio.run(stream_agent())
```

### FastAPI Streaming Endpoint

```python
# fastapi_streaming.py
# Stream agent responses through a FastAPI endpoint
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langchain.agents import AgentExecutor
import asyncio
import json

app = FastAPI()

# Assume executor is configured elsewhere
# executor = AgentExecutor(...)

@app.post("/chat/stream")
async def stream_chat(request: dict):
    """Stream agent response as Server-Sent Events"""

    async def generate():
        async for event in executor.astream_events(
            {"input": request["message"]},
            version="v1"
        ):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    # Format as SSE
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

            elif event["event"] == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"

            elif event["event"] == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_end', 'result': event['data']['output']})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

---

## Agent Callbacks for Monitoring

Callbacks provide hooks for logging, monitoring, and debugging agent behavior.

```python
# agent_callbacks.py
# Custom callbacks for monitoring and logging agent execution
from langchain.callbacks.base import BaseCallbackHandler
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from typing import Any, Dict, List
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentMonitorCallback(BaseCallbackHandler):
    """Custom callback handler for monitoring agent execution"""

    def __init__(self):
        self.start_time = None
        self.tool_calls = []
        self.total_tokens = 0
        self.errors = []

    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs):
        """Called when agent execution starts"""
        self.start_time = time.time()
        logger.info(f"Agent started with input: {inputs.get('input', '')[:100]}")

    def on_chain_end(self, outputs: Dict[str, Any], **kwargs):
        """Called when agent execution completes"""
        duration = time.time() - self.start_time
        logger.info(f"Agent completed in {duration:.2f}s")
        logger.info(f"Tools used: {len(self.tool_calls)}")
        logger.info(f"Errors encountered: {len(self.errors)}")

        # Send metrics to monitoring system
        self._send_metrics({
            "duration_seconds": duration,
            "tool_calls": len(self.tool_calls),
            "errors": len(self.errors),
            "success": len(self.errors) == 0
        })

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs):
        """Called when a tool is invoked"""
        tool_name = serialized.get("name", "unknown")
        logger.info(f"Tool started: {tool_name}")
        self.tool_calls.append({
            "tool": tool_name,
            "input": input_str,
            "start_time": time.time()
        })

    def on_tool_end(self, output: str, **kwargs):
        """Called when a tool completes"""
        if self.tool_calls:
            last_call = self.tool_calls[-1]
            last_call["duration"] = time.time() - last_call["start_time"]
            last_call["output_length"] = len(output)
            logger.info(f"Tool completed: {last_call['tool']} in {last_call['duration']:.2f}s")

    def on_tool_error(self, error: Exception, **kwargs):
        """Called when a tool raises an exception"""
        self.errors.append(str(error))
        logger.error(f"Tool error: {error}")

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs):
        """Called when LLM inference starts"""
        logger.debug(f"LLM call started")

    def on_llm_end(self, response, **kwargs):
        """Called when LLM inference completes"""
        # Track token usage if available
        if hasattr(response, "llm_output") and response.llm_output:
            usage = response.llm_output.get("token_usage", {})
            self.total_tokens += usage.get("total_tokens", 0)

    def _send_metrics(self, metrics: Dict[str, Any]):
        """Send metrics to your monitoring system"""
        # Integration with Prometheus, DataDog, OneUptime, etc.
        logger.info(f"Metrics: {metrics}")

# Use the callback with an agent
llm = ChatOpenAI(model="gpt-4")

@tool
def process_data(data: str) -> str:
    """Process some data"""
    return f"Processed: {data}"

tools = [process_data]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)

# Create callback instance
monitor = AgentMonitorCallback()

executor = AgentExecutor(
    agent=agent,
    tools=tools,
    callbacks=[monitor],  # Attach callback
    verbose=False  # Disable default verbose output
)

result = executor.invoke({"input": "Process the customer data"})

# Access collected metrics
print(f"Tool calls made: {monitor.tool_calls}")
print(f"Total tokens used: {monitor.total_tokens}")
```

---

## Multi-Agent Systems

Coordinate multiple specialized agents for complex workflows.

```python
# multi_agent.py
# Multi-agent system with specialized agents
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from typing import Dict, Any

llm = ChatOpenAI(model="gpt-4")

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

research_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a research agent. Gather relevant information to answer questions."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

research_agent = create_tool_calling_agent(llm, research_tools, research_prompt)
research_executor = AgentExecutor(agent=research_agent, tools=research_tools)

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

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a writing agent. Create clear, well-structured content."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

writer_agent = create_tool_calling_agent(llm, writer_tools, writer_prompt)
writer_executor = AgentExecutor(agent=writer_agent, tools=writer_tools)

# Coordinator Agent - orchestrates the workflow
class MultiAgentCoordinator:
    """Coordinates multiple specialized agents"""

    def __init__(self):
        self.agents = {
            "research": research_executor,
            "writer": writer_executor
        }

    def run_workflow(self, task: str) -> Dict[str, Any]:
        """Run a multi-agent workflow"""
        results = {}

        # Step 1: Research phase
        research_result = self.agents["research"].invoke({
            "input": f"Research the following topic: {task}"
        })
        results["research"] = research_result["output"]

        # Step 2: Writing phase using research results
        writing_result = self.agents["writer"].invoke({
            "input": f"Write content about: {task}\n\nResearch findings: {results['research']}"
        })
        results["content"] = writing_result["output"]

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
from langchain.tools import Tool

# Wrap research executor as a tool
research_tool = Tool(
    name="research_assistant",
    func=lambda q: research_executor.invoke({"input": q})["output"],
    description="Use this to research any topic. Input should be a research question."
)

# Wrap writer executor as a tool
writer_tool = Tool(
    name="writing_assistant",
    func=lambda q: writer_executor.invoke({"input": q})["output"],
    description="Use this to write content. Input should include topic and any context."
)

# Supervisor agent that delegates to specialized agents
supervisor_tools = [research_tool, writer_tool]

supervisor_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a supervisor agent that coordinates specialized assistants.
    Use the research_assistant for gathering information.
    Use the writing_assistant for creating content.
    Delegate tasks appropriately and combine results."""),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

supervisor_agent = create_tool_calling_agent(llm, supervisor_tools, supervisor_prompt)
supervisor_executor = AgentExecutor(
    agent=supervisor_agent,
    tools=supervisor_tools,
    verbose=True,
    max_iterations=10  # Allow multiple delegation rounds
)

# The supervisor decides when to use each specialized agent
result = supervisor_executor.invoke({
    "input": "Create a blog post about Kubernetes networking. Research the topic first, then write the post."
})
```

---

## Best Practices Summary

1. **Choose the right agent type** - Tool calling agents for most cases, ReAct for complex reasoning
2. **Design focused tools** - Each tool should do one thing well with clear descriptions
3. **Validate tool inputs** - Use Pydantic schemas to catch errors early
4. **Handle errors gracefully** - Return informative messages instead of crashing
5. **Set iteration limits** - Prevent infinite loops with max_iterations
6. **Use memory wisely** - Token-aware memory for long conversations
7. **Stream for UX** - Stream responses in interactive applications
8. **Monitor everything** - Use callbacks to track performance and errors
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
