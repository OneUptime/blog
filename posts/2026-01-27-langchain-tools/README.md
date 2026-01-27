# How to Implement LangChain Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, AI, LLM, Python, Tools, Agents, Function Calling, OpenAI, RAG

Description: Learn how to implement and use LangChain tools to extend LLM capabilities with custom functions, input validation, and async support for building powerful AI agents.

---

> Tools are the bridge between language models and the real world. They transform LLMs from passive text generators into active agents that can search databases, call APIs, and execute code. Mastering LangChain tools is essential for building AI applications that do more than just chat.

LangChain tools enable language models to interact with external systems and perform actions. Whether you need to search the web, query a database, or call an API, tools provide a structured way to extend your AI application's capabilities beyond simple text generation.

---

## Understanding Built-in Tools

LangChain provides a rich library of pre-built tools for common tasks. These tools are ready to use out of the box and cover web search, math operations, file handling, and more.

### Installation

```bash
# Install LangChain and common tool dependencies
pip install langchain langchain-openai langchain-community
pip install duckduckgo-search  # For web search
pip install wikipedia          # For Wikipedia lookups
```

### Using Built-in Tools

The following example demonstrates how to load and use built-in tools with a LangChain agent. The agent automatically decides which tool to use based on the user's query.

```python
# builtin_tools.py
# Demonstrates using LangChain's pre-built tools with an agent
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain import hub

# Initialize the language model with function calling capability
llm = ChatOpenAI(
    model="gpt-4-turbo-preview",  # Use a model that supports function calling
    temperature=0  # Lower temperature for more deterministic tool selection
)

# Initialize built-in tools
search_tool = DuckDuckGoSearchRun(
    name="web_search",  # Name the agent will use to invoke this tool
    description="Search the web for current information. Use for recent events or facts."
)

# Configure Wikipedia with custom settings
wiki_wrapper = WikipediaAPIWrapper(
    top_k_results=2,  # Return top 2 results
    doc_content_chars_max=1000  # Limit content length
)
wiki_tool = WikipediaQueryRun(
    api_wrapper=wiki_wrapper,
    name="wikipedia",
    description="Look up factual information on Wikipedia. Use for historical or encyclopedic queries."
)

# Combine tools into a list for the agent
tools = [search_tool, wiki_tool]

# Pull a pre-built prompt template for OpenAI tools agent
prompt = hub.pull("hwchase17/openai-tools-agent")

# Create the agent that uses OpenAI's function calling
agent = create_openai_tools_agent(llm, tools, prompt)

# Wrap the agent in an executor that handles tool invocation
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,  # Print intermediate steps for debugging
    max_iterations=5  # Prevent infinite loops
)

# Run the agent with a query
response = agent_executor.invoke({
    "input": "What are the latest developments in quantum computing?"
})

print(response["output"])  # Print the final answer
```

---

## Creating Custom Tools

Custom tools let you extend LangChain agents with your own functionality. There are multiple ways to create tools, from simple functions to full class implementations.

### Basic Tool Creation with Functions

The simplest way to create a tool is by wrapping a Python function. LangChain will automatically infer the tool's description from the function's docstring and its input schema from type hints.

```python
# custom_tool_function.py
# Create a custom tool from a simple Python function
from langchain_core.tools import tool
from typing import Optional

@tool
def calculate_compound_interest(
    principal: float,
    rate: float,
    time: int,
    compounds_per_year: int = 12
) -> str:
    """
    Calculate compound interest for an investment.

    Args:
        principal: The initial investment amount in dollars
        rate: Annual interest rate as a decimal (e.g., 0.05 for 5%)
        time: Investment duration in years
        compounds_per_year: Number of times interest compounds per year (default: 12)

    Returns:
        A formatted string with the final amount and interest earned
    """
    # Apply the compound interest formula: A = P(1 + r/n)^(nt)
    final_amount = principal * (1 + rate / compounds_per_year) ** (compounds_per_year * time)
    interest_earned = final_amount - principal

    return f"Final amount: ${final_amount:,.2f}, Interest earned: ${interest_earned:,.2f}"


@tool
def get_stock_price(symbol: str) -> str:
    """
    Get the current stock price for a given ticker symbol.

    Args:
        symbol: The stock ticker symbol (e.g., AAPL, GOOGL, MSFT)

    Returns:
        A string with the current stock price or error message
    """
    # In production, this would call a real stock API
    # Using mock data for demonstration
    mock_prices = {
        "AAPL": 175.50,
        "GOOGL": 140.25,
        "MSFT": 380.75,
        "AMZN": 178.90
    }

    symbol_upper = symbol.upper()
    if symbol_upper in mock_prices:
        return f"{symbol_upper} is currently trading at ${mock_prices[symbol_upper]}"
    else:
        return f"Could not find price data for {symbol_upper}"


# Inspect tool properties
print(f"Tool name: {calculate_compound_interest.name}")
print(f"Tool description: {calculate_compound_interest.description}")
print(f"Tool args: {calculate_compound_interest.args}")

# Use the tools with an agent
tools = [calculate_compound_interest, get_stock_price]
```

---

## Defining Tool Schemas

For complex tools, you may want to define explicit input schemas using Pydantic models. This gives you fine-grained control over input validation, descriptions, and default values.

### Pydantic Schema Definition

Pydantic models provide type validation, default values, and rich descriptions that help the LLM understand how to use your tool correctly.

```python
# tool_schemas.py
# Define explicit input schemas for LangChain tools using Pydantic
from langchain_core.tools import tool, StructuredTool
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class PriorityLevel(str, Enum):
    """Enum for task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CreateTaskInput(BaseModel):
    """Input schema for creating a new task"""

    title: str = Field(
        description="The title of the task, should be concise and descriptive",
        min_length=1,
        max_length=200
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional detailed description of the task"
    )
    priority: PriorityLevel = Field(
        default=PriorityLevel.MEDIUM,
        description="Priority level of the task: low, medium, high, or critical"
    )
    assignee: Optional[str] = Field(
        default=None,
        description="Username of the person to assign the task to"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="List of tags to categorize the task"
    )
    due_date: Optional[str] = Field(
        default=None,
        description="Due date in ISO format (YYYY-MM-DD)"
    )

class SearchTasksInput(BaseModel):
    """Input schema for searching tasks"""

    query: str = Field(
        description="Search query to find matching tasks"
    )
    priority_filter: Optional[PriorityLevel] = Field(
        default=None,
        description="Filter tasks by priority level"
    )
    assignee_filter: Optional[str] = Field(
        default=None,
        description="Filter tasks by assignee username"
    )
    include_completed: bool = Field(
        default=False,
        description="Whether to include completed tasks in results"
    )
    limit: int = Field(
        default=10,
        ge=1,  # Greater than or equal to 1
        le=100,  # Less than or equal to 100
        description="Maximum number of results to return (1-100)"
    )


# Create tool with explicit schema using StructuredTool
def create_task_impl(
    title: str,
    description: Optional[str] = None,
    priority: PriorityLevel = PriorityLevel.MEDIUM,
    assignee: Optional[str] = None,
    tags: List[str] = None,
    due_date: Optional[str] = None
) -> str:
    """Implementation of task creation logic"""
    # In production, this would save to a database
    task_id = "TASK-12345"  # Would be generated dynamically

    result = f"Created task {task_id}: {title}"
    if assignee:
        result += f" (assigned to {assignee})"
    if priority != PriorityLevel.MEDIUM:
        result += f" with {priority.value} priority"

    return result

# Build the tool with the Pydantic schema
create_task_tool = StructuredTool.from_function(
    func=create_task_impl,
    name="create_task",
    description="Create a new task in the task management system",
    args_schema=CreateTaskInput,  # Attach the Pydantic schema
    return_direct=False  # Let the agent process the output
)

# Alternative: Use decorator with explicit args_schema
@tool(args_schema=SearchTasksInput)
def search_tasks(
    query: str,
    priority_filter: Optional[PriorityLevel] = None,
    assignee_filter: Optional[str] = None,
    include_completed: bool = False,
    limit: int = 10
) -> str:
    """Search for tasks matching the given criteria"""
    # Mock implementation
    results = [
        {"id": "TASK-001", "title": "Review PR", "status": "open"},
        {"id": "TASK-002", "title": "Update docs", "status": "open"},
    ]

    # Apply filters (simplified for demonstration)
    if not include_completed:
        results = [r for r in results if r["status"] != "completed"]

    if not results:
        return "No tasks found matching your criteria"

    return f"Found {len(results)} tasks: " + ", ".join(r["title"] for r in results)
```

---

## Using the Tool Decorator

The `@tool` decorator is the most common way to create tools in LangChain. It offers various configuration options for customizing tool behavior.

### Decorator Options

The decorator supports several parameters that control how the tool is presented to the LLM and how its output is handled.

```python
# tool_decorator.py
# Explore different @tool decorator configurations
from langchain_core.tools import tool
from typing import Annotated
import json

# Basic tool with inferred schema
@tool
def greet_user(name: str) -> str:
    """Greet a user by name"""
    return f"Hello, {name}! Welcome to the application."


# Tool with custom name (different from function name)
@tool("send_email")
def send_email_tool(
    recipient: str,
    subject: str,
    body: str
) -> str:
    """
    Send an email to a specified recipient.

    Args:
        recipient: Email address of the recipient
        subject: Subject line of the email
        body: Body content of the email
    """
    # Mock email sending
    return f"Email sent to {recipient} with subject: {subject}"


# Tool that returns output directly to user (bypasses agent reasoning)
@tool(return_direct=True)
def generate_report(report_type: str) -> str:
    """
    Generate a formatted report. The output is returned directly to the user.

    Args:
        report_type: Type of report to generate (daily, weekly, monthly)
    """
    # Return directly to user without further agent processing
    return f"""
    ============ {report_type.upper()} REPORT ============
    Generated at: 2026-01-27
    Status: All systems operational
    Uptime: 99.99%
    ==========================================
    """


# Tool with injected dependencies (not visible to LLM)
@tool(parse_docstring=True)  # Parse docstring for description
def query_database(
    query: str,
    db_connection: Annotated[object, "injected"]  # Hidden from LLM
) -> str:
    """
    Execute a read-only database query.

    Args:
        query: SQL query to execute (SELECT statements only)
    """
    # The db_connection is injected at runtime, not by the LLM
    # This pattern is useful for passing authenticated clients
    return f"Query executed: {query}"


# Tool with response metadata
@tool(response_format="content_and_artifact")
def analyze_data(data: str) -> tuple:
    """
    Analyze data and return both a summary and the raw analysis.

    Args:
        data: JSON string containing data to analyze
    """
    # Parse the input data
    parsed = json.loads(data) if isinstance(data, str) else data

    # Perform analysis
    analysis = {
        "record_count": len(parsed) if isinstance(parsed, list) else 1,
        "data_type": type(parsed).__name__
    }

    # Return tuple: (content for LLM, artifact for programmatic use)
    summary = f"Analyzed {analysis['record_count']} records"
    return summary, analysis  # Second element is the artifact


# Combine tools for use with an agent
tools = [
    greet_user,
    send_email_tool,
    generate_report,
    query_database,
    analyze_data
]

# Print tool information
for t in tools:
    print(f"Name: {t.name}")
    print(f"Description: {t.description}")
    print(f"Returns directly: {t.return_direct}")
    print("---")
```

---

## Building Async Tools

For I/O-bound operations like API calls or database queries, async tools prevent blocking and enable concurrent execution. LangChain fully supports async tool implementations.

### Async Tool Implementation

Async tools are defined using `async def` and can be awaited when invoked. They integrate seamlessly with async agents and chains.

```python
# async_tools.py
# Create async tools for non-blocking I/O operations
import asyncio
import aiohttp
from langchain_core.tools import tool, StructuredTool
from pydantic import BaseModel, Field
from typing import List, Optional

@tool
async def fetch_url_content(url: str) -> str:
    """
    Fetch content from a URL asynchronously.

    Args:
        url: The URL to fetch content from (must be a valid HTTP/HTTPS URL)
    """
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    # Limit content to prevent overwhelming the LLM
                    content = await response.text()
                    return content[:5000] if len(content) > 5000 else content
                else:
                    return f"HTTP {response.status}: Failed to fetch URL"
        except asyncio.TimeoutError:
            return "Error: Request timed out after 10 seconds"
        except aiohttp.ClientError as e:
            return f"Error fetching URL: {str(e)}"


class MultiURLInput(BaseModel):
    """Schema for fetching multiple URLs"""
    urls: List[str] = Field(
        description="List of URLs to fetch concurrently",
        min_length=1,
        max_length=10
    )
    timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Total timeout in seconds for all requests"
    )

async def fetch_multiple_urls_impl(urls: List[str], timeout: int = 30) -> str:
    """Fetch multiple URLs concurrently"""
    async def fetch_one(session: aiohttp.ClientSession, url: str) -> dict:
        """Helper to fetch a single URL and return result dict"""
        try:
            async with session.get(url, timeout=10) as response:
                content = await response.text()
                return {
                    "url": url,
                    "status": response.status,
                    "content_length": len(content),
                    "preview": content[:200]  # First 200 chars
                }
        except Exception as e:
            return {"url": url, "error": str(e)}

    async with aiohttp.ClientSession() as session:
        # Create tasks for concurrent execution
        tasks = [fetch_one(session, url) for url in urls]

        # Wait for all with overall timeout
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            return f"Overall timeout of {timeout}s exceeded"

    # Format results
    successful = [r for r in results if isinstance(r, dict) and "error" not in r]
    failed = [r for r in results if isinstance(r, dict) and "error" in r]

    summary = f"Fetched {len(successful)}/{len(urls)} URLs successfully"
    if failed:
        summary += f". Failed: {', '.join(r['url'] for r in failed)}"

    return summary

# Create async tool with schema
fetch_multiple_tool = StructuredTool.from_function(
    coroutine=fetch_multiple_urls_impl,  # Use coroutine parameter for async
    name="fetch_multiple_urls",
    description="Fetch multiple URLs concurrently for efficiency",
    args_schema=MultiURLInput
)


@tool
async def async_database_query(
    collection: str,
    filter_query: str,
    limit: int = 10
) -> str:
    """
    Query a database collection asynchronously.

    Args:
        collection: Name of the database collection to query
        filter_query: JSON string representing the query filter
        limit: Maximum number of documents to return
    """
    # Simulate async database operation
    await asyncio.sleep(0.1)  # Simulates network latency

    # Mock response
    results = [
        {"id": f"doc_{i}", "collection": collection}
        for i in range(min(limit, 5))
    ]

    return f"Found {len(results)} documents in {collection}"


# Using async tools with an async agent
async def run_async_agent():
    """Example of running an async agent with async tools"""
    from langchain_openai import ChatOpenAI
    from langchain.agents import AgentExecutor, create_openai_tools_agent
    from langchain import hub

    # Initialize components
    llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)
    tools = [fetch_url_content, fetch_multiple_tool, async_database_query]
    prompt = hub.pull("hwchase17/openai-tools-agent")

    # Create agent and executor
    agent = create_openai_tools_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    # Run asynchronously with ainvoke
    result = await executor.ainvoke({
        "input": "Fetch the content from https://example.com"
    })

    return result["output"]


# Run the async agent
if __name__ == "__main__":
    output = asyncio.run(run_async_agent())
    print(output)
```

---

## Tool Input Validation

Proper input validation ensures your tools receive valid data and provide helpful error messages when they do not. LangChain leverages Pydantic for comprehensive validation.

### Validation with Pydantic

Pydantic validators can check input values, transform data, and raise descriptive errors that help the LLM correct its tool calls.

```python
# tool_validation.py
# Implement comprehensive input validation for LangChain tools
from langchain_core.tools import tool, StructuredTool
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
import re
from datetime import datetime

class EmailInput(BaseModel):
    """Validated input schema for sending emails"""

    recipient: str = Field(
        description="Email address of the recipient"
    )
    subject: str = Field(
        description="Email subject line",
        min_length=1,
        max_length=200
    )
    body: str = Field(
        description="Email body content",
        min_length=1,
        max_length=10000
    )
    cc: Optional[List[str]] = Field(
        default=None,
        description="Optional list of CC recipients"
    )
    priority: str = Field(
        default="normal",
        description="Email priority: low, normal, or high"
    )

    @field_validator("recipient")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate that recipient is a valid email address"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError(f"Invalid email address: {v}")
        return v.lower()  # Normalize to lowercase

    @field_validator("cc")
    @classmethod
    def validate_cc_emails(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate all CC email addresses"""
        if v is None:
            return v
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        validated = []
        for email in v:
            if not re.match(email_pattern, email):
                raise ValueError(f"Invalid CC email address: {email}")
            validated.append(email.lower())
        return validated

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        """Validate priority is one of the allowed values"""
        allowed = {"low", "normal", "high"}
        if v.lower() not in allowed:
            raise ValueError(f"Priority must be one of: {', '.join(allowed)}")
        return v.lower()


class DateRangeInput(BaseModel):
    """Input schema with cross-field validation"""

    start_date: str = Field(
        description="Start date in YYYY-MM-DD format"
    )
    end_date: str = Field(
        description="End date in YYYY-MM-DD format"
    )
    include_weekends: bool = Field(
        default=True,
        description="Whether to include weekends in the range"
    )

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Validate date string format"""
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError(f"Invalid date format: {v}. Use YYYY-MM-DD")

    @model_validator(mode="after")
    def validate_date_range(self):
        """Ensure end_date is after start_date"""
        start = datetime.strptime(self.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.end_date, "%Y-%m-%d")

        if end < start:
            raise ValueError("end_date must be after start_date")

        # Warn if range is very large
        days_diff = (end - start).days
        if days_diff > 365:
            raise ValueError("Date range cannot exceed 365 days")

        return self


class APIRequestInput(BaseModel):
    """Input schema with complex validation"""

    endpoint: str = Field(
        description="API endpoint path (e.g., /users/123)"
    )
    method: str = Field(
        default="GET",
        description="HTTP method: GET, POST, PUT, DELETE"
    )
    headers: Optional[dict] = Field(
        default=None,
        description="Optional HTTP headers as key-value pairs"
    )
    body: Optional[str] = Field(
        default=None,
        description="Request body for POST/PUT requests (JSON string)"
    )

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        """Ensure endpoint starts with /"""
        if not v.startswith("/"):
            return f"/{v}"
        return v

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        """Validate HTTP method"""
        allowed = {"GET", "POST", "PUT", "DELETE", "PATCH"}
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Method must be one of: {', '.join(allowed)}")
        return v_upper

    @model_validator(mode="after")
    def validate_body_for_method(self):
        """Ensure body is provided for POST/PUT"""
        if self.method in {"POST", "PUT"} and not self.body:
            raise ValueError(f"{self.method} requests require a body")
        if self.method == "GET" and self.body:
            raise ValueError("GET requests should not have a body")
        return self


# Create tools with validated schemas
@tool(args_schema=EmailInput)
def send_validated_email(
    recipient: str,
    subject: str,
    body: str,
    cc: Optional[List[str]] = None,
    priority: str = "normal"
) -> str:
    """Send an email with validated inputs"""
    cc_info = f" (CC: {', '.join(cc)})" if cc else ""
    return f"Email sent to {recipient}{cc_info} with {priority} priority"


@tool(args_schema=DateRangeInput)
def get_events_in_range(
    start_date: str,
    end_date: str,
    include_weekends: bool = True
) -> str:
    """Get events within a validated date range"""
    return f"Found 5 events between {start_date} and {end_date}"


@tool(args_schema=APIRequestInput)
def make_api_request(
    endpoint: str,
    method: str = "GET",
    headers: Optional[dict] = None,
    body: Optional[str] = None
) -> str:
    """Make a validated API request"""
    return f"{method} request to {endpoint} completed successfully"


# Example of handling validation errors gracefully
def create_tool_with_error_handling():
    """Wrap tool execution with error handling"""
    from langchain_core.tools import ToolException

    @tool(handle_tool_error=True)  # Return error message instead of raising
    def safe_email_tool(recipient: str, subject: str, body: str) -> str:
        """Send email with built-in error handling"""
        # Validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, recipient):
            raise ToolException(f"Invalid email: {recipient}. Please provide a valid email address.")

        return f"Email sent to {recipient}"

    return safe_email_tool
```

---

## Integrating Tools with Agents

Tools become powerful when integrated with LangChain agents. Here is a complete example showing how to build a functional agent with multiple custom tools.

### Complete Agent Example

This example demonstrates a practical agent that can manage tasks, search information, and interact with external services.

```python
# agent_integration.py
# Complete example of integrating custom tools with a LangChain agent
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import json

# In-memory storage for demonstration
task_store = {}
note_store = {}

# Define tool schemas
class TaskInput(BaseModel):
    title: str = Field(description="Title of the task")
    description: Optional[str] = Field(default=None, description="Task description")
    due_date: Optional[str] = Field(default=None, description="Due date (YYYY-MM-DD)")
    priority: str = Field(default="medium", description="Priority: low, medium, high")

class NoteInput(BaseModel):
    title: str = Field(description="Note title")
    content: str = Field(description="Note content")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")

# Define tools
@tool(args_schema=TaskInput)
def create_task(
    title: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: str = "medium"
) -> str:
    """Create a new task in the task management system"""
    task_id = f"task_{len(task_store) + 1}"
    task_store[task_id] = {
        "id": task_id,
        "title": title,
        "description": description,
        "due_date": due_date,
        "priority": priority,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    return f"Created task '{title}' with ID {task_id}"


@tool
def list_tasks(status_filter: Optional[str] = None) -> str:
    """
    List all tasks, optionally filtered by status.

    Args:
        status_filter: Optional filter for task status (pending, in_progress, completed)
    """
    if not task_store:
        return "No tasks found"

    tasks = list(task_store.values())
    if status_filter:
        tasks = [t for t in tasks if t["status"] == status_filter]

    if not tasks:
        return f"No tasks with status '{status_filter}'"

    result = "Tasks:\n"
    for task in tasks:
        result += f"- [{task['id']}] {task['title']} ({task['status']})\n"
    return result


@tool
def update_task_status(task_id: str, new_status: str) -> str:
    """
    Update the status of a task.

    Args:
        task_id: The ID of the task to update
        new_status: New status (pending, in_progress, completed)
    """
    if task_id not in task_store:
        return f"Task {task_id} not found"

    valid_statuses = {"pending", "in_progress", "completed"}
    if new_status not in valid_statuses:
        return f"Invalid status. Use: {', '.join(valid_statuses)}"

    task_store[task_id]["status"] = new_status
    return f"Updated task {task_id} status to '{new_status}'"


@tool(args_schema=NoteInput)
def create_note(title: str, content: str, tags: List[str] = None) -> str:
    """Create a new note for future reference"""
    note_id = f"note_{len(note_store) + 1}"
    note_store[note_id] = {
        "id": note_id,
        "title": title,
        "content": content,
        "tags": tags or [],
        "created_at": datetime.now().isoformat()
    }
    return f"Created note '{title}' with ID {note_id}"


@tool
def search_notes(query: str) -> str:
    """
    Search notes by title or content.

    Args:
        query: Search query to match against note titles and content
    """
    if not note_store:
        return "No notes found"

    query_lower = query.lower()
    matches = []
    for note in note_store.values():
        if (query_lower in note["title"].lower() or
            query_lower in note["content"].lower()):
            matches.append(note)

    if not matches:
        return f"No notes matching '{query}'"

    result = f"Found {len(matches)} matching notes:\n"
    for note in matches:
        result += f"- [{note['id']}] {note['title']}\n"
    return result


@tool
def get_current_datetime() -> str:
    """Get the current date and time"""
    now = datetime.now()
    return f"Current date and time: {now.strftime('%Y-%m-%d %H:%M:%S')}"


# Create the agent
def create_productivity_agent():
    """Create an agent with productivity tools"""

    # Initialize the LLM
    llm = ChatOpenAI(
        model="gpt-4-turbo-preview",
        temperature=0
    )

    # Define all tools
    tools = [
        create_task,
        list_tasks,
        update_task_status,
        create_note,
        search_notes,
        get_current_datetime
    ]

    # Create a custom prompt with system instructions
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful productivity assistant. You can help users manage their tasks and notes.

Available capabilities:
- Create, list, and update tasks
- Create and search notes
- Get current date and time

Always confirm actions with the user and provide helpful summaries."""),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad")
    ])

    # Create the agent
    agent = create_openai_tools_agent(llm, tools, prompt)

    # Wrap in executor with configuration
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=10,
        early_stopping_method="generate",
        handle_parsing_errors=True
    )

    return executor


# Example usage with conversation history
def run_conversation():
    """Run a multi-turn conversation with the agent"""
    agent = create_productivity_agent()
    chat_history = []

    # First turn
    response1 = agent.invoke({
        "input": "Create a task to review the quarterly report, due next Friday, high priority",
        "chat_history": chat_history
    })
    print(f"Agent: {response1['output']}\n")

    # Update history
    chat_history.extend([
        HumanMessage(content="Create a task to review the quarterly report"),
        AIMessage(content=response1["output"])
    ])

    # Second turn
    response2 = agent.invoke({
        "input": "Now show me all my tasks",
        "chat_history": chat_history
    })
    print(f"Agent: {response2['output']}\n")


if __name__ == "__main__":
    run_conversation()
```

---

## Best Practices Summary

1. **Use descriptive docstrings** - The LLM uses your tool's docstring to understand when and how to use it
2. **Define explicit schemas** - Pydantic models provide type safety and help the LLM generate correct inputs
3. **Validate inputs thoroughly** - Catch errors early with field validators and model validators
4. **Use async for I/O** - Async tools prevent blocking during network calls and database queries
5. **Handle errors gracefully** - Use `handle_tool_error=True` to return error messages instead of crashing
6. **Keep tools focused** - Each tool should do one thing well rather than handling multiple responsibilities
7. **Provide helpful error messages** - When validation fails, tell the LLM what went wrong and how to fix it
8. **Test tools independently** - Verify tool behavior before integrating with agents
9. **Use meaningful names** - Tool names should clearly indicate their purpose
10. **Document expected formats** - Specify date formats, enum values, and other constraints in descriptions

---

*Ready to monitor your AI applications in production? [OneUptime](https://oneuptime.com) provides comprehensive observability for your LangChain agents, including tracing, logging, and performance monitoring to ensure your AI tools are running reliably.*
