# How to Implement Function Calling with the Gemini API in Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Function Calling, Generative AI

Description: Learn how to implement function calling with the Gemini API in Vertex AI to let the model interact with external tools and APIs.

---

Large language models are great at understanding and generating text, but they cannot directly interact with the outside world. They cannot query your database, call your APIs, or check the current weather. Function calling bridges this gap. You define functions that the model can request to call, the model decides when and how to call them based on the conversation, and your code executes the actual function and returns the result. The model then uses that result to formulate its response.

This pattern is incredibly powerful for building AI assistants that can take real actions.

## How Function Calling Works

The flow goes like this:

1. You define a set of functions (with names, descriptions, and parameter schemas)
2. You send a user message along with the function definitions to the model
3. The model decides whether it needs to call a function to answer the question
4. If it does, it returns a function call request (function name + arguments)
5. Your code executes the function with those arguments
6. You send the function result back to the model
7. The model generates a final response using the function result

The model never actually executes code. It just decides which function to call and with what parameters.

## Defining Functions

Functions are defined as tools with JSON schemas that describe their parameters:

```python
# define_functions.py
# Define functions that Gemini can call

import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    FunctionDeclaration,
    Tool,
)

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Define a function to get server status
get_server_status = FunctionDeclaration(
    name='get_server_status',
    description='Gets the current status and health metrics of a server by its hostname.',
    parameters={
        'type': 'object',
        'properties': {
            'hostname': {
                'type': 'string',
                'description': 'The hostname or IP address of the server',
            },
        },
        'required': ['hostname'],
    },
)

# Define a function to create a support ticket
create_support_ticket = FunctionDeclaration(
    name='create_support_ticket',
    description='Creates a new support ticket in the ticketing system.',
    parameters={
        'type': 'object',
        'properties': {
            'title': {
                'type': 'string',
                'description': 'Title of the support ticket',
            },
            'priority': {
                'type': 'string',
                'description': 'Priority level: low, medium, high, or critical',
                'enum': ['low', 'medium', 'high', 'critical'],
            },
            'description': {
                'type': 'string',
                'description': 'Detailed description of the issue',
            },
        },
        'required': ['title', 'priority', 'description'],
    },
)

# Define a function to list recent deployments
list_deployments = FunctionDeclaration(
    name='list_deployments',
    description='Lists recent deployments for a given service.',
    parameters={
        'type': 'object',
        'properties': {
            'service_name': {
                'type': 'string',
                'description': 'Name of the service to check deployments for',
            },
            'limit': {
                'type': 'integer',
                'description': 'Maximum number of deployments to return',
            },
        },
        'required': ['service_name'],
    },
)

# Bundle functions into a tool
ops_tool = Tool(
    function_declarations=[
        get_server_status,
        create_support_ticket,
        list_deployments,
    ],
)

print("Functions defined successfully")
```

## Implementing the Function Handlers

Now implement the actual functions that get called:

```python
# function_handlers.py
# Actual implementations of the functions

import datetime
import random

def handle_get_server_status(hostname):
    """Simulate getting server status from a monitoring system."""
    # In a real application, this would call your monitoring API
    return {
        'hostname': hostname,
        'status': 'healthy',
        'cpu_usage': f'{random.randint(20, 80)}%',
        'memory_usage': f'{random.randint(30, 70)}%',
        'disk_usage': f'{random.randint(10, 60)}%',
        'uptime': '45 days, 12 hours',
        'last_health_check': datetime.datetime.now().isoformat(),
    }

def handle_create_support_ticket(title, priority, description):
    """Simulate creating a support ticket."""
    # In a real application, this would call your ticketing API
    ticket_id = f'TICKET-{random.randint(1000, 9999)}'
    return {
        'ticket_id': ticket_id,
        'title': title,
        'priority': priority,
        'status': 'created',
        'created_at': datetime.datetime.now().isoformat(),
    }

def handle_list_deployments(service_name, limit=5):
    """Simulate listing recent deployments."""
    # In a real application, this would query your deployment system
    deployments = []
    for i in range(min(limit, 5)):
        deployments.append({
            'deploy_id': f'deploy-{random.randint(100, 999)}',
            'service': service_name,
            'version': f'v1.{10 - i}.0',
            'status': 'successful',
            'deployed_at': f'2026-02-{17 - i}T10:30:00Z',
            'deployed_by': 'ci-pipeline',
        })
    return {'deployments': deployments}
```

## Putting It All Together

Here is the complete flow of a function calling interaction:

```python
# function_calling.py
# Complete function calling example with Gemini

import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    FunctionDeclaration,
    Tool,
    Part,
    Content,
)
import json

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Define functions (same as above)
get_server_status = FunctionDeclaration(
    name='get_server_status',
    description='Gets the current status and health metrics of a server by its hostname.',
    parameters={
        'type': 'object',
        'properties': {
            'hostname': {
                'type': 'string',
                'description': 'The hostname or IP address of the server',
            },
        },
        'required': ['hostname'],
    },
)

ops_tool = Tool(function_declarations=[get_server_status])

# Create the model with the tool
model = GenerativeModel(
    'gemini-1.5-pro',
    tools=[ops_tool],
)

# Map function names to their handlers
function_handlers = {
    'get_server_status': handle_get_server_status,
}

# Start a chat
chat = model.start_chat()

# Send a user message that should trigger a function call
response = chat.send_message('Can you check the status of web-server-01?')

# Check if the model wants to call a function
function_call = response.candidates[0].content.parts[0].function_call

if function_call:
    # Extract the function name and arguments
    function_name = function_call.name
    function_args = dict(function_call.args)

    print(f"Model wants to call: {function_name}")
    print(f"With arguments: {function_args}")

    # Execute the function
    handler = function_handlers[function_name]
    result = handler(**function_args)

    print(f"Function result: {json.dumps(result, indent=2)}")

    # Send the function result back to the model
    response = chat.send_message(
        Part.from_function_response(
            name=function_name,
            response={'result': result},
        )
    )

    # The model now generates a natural language response using the function result
    print(f"\nGemini: {response.text}")
```

## Handling Multiple Function Calls

Sometimes the model needs to call multiple functions to answer a question:

```python
# multi_function.py
# Handle conversations that require multiple function calls

import vertexai
from vertexai.generative_models import GenerativeModel, Tool, Part
import json

vertexai.init(project='your-project-id', location='us-central1')

# Create model with all tools
model = GenerativeModel('gemini-1.5-pro', tools=[ops_tool])
chat = model.start_chat()

def process_response(response):
    """Process a response, handling function calls if present."""
    while True:
        # Check for function calls in the response
        parts = response.candidates[0].content.parts

        has_function_call = False
        for part in parts:
            if hasattr(part, 'function_call') and part.function_call.name:
                has_function_call = True
                fc = part.function_call

                print(f"Calling: {fc.name}({dict(fc.args)})")

                # Execute the function
                handler = function_handlers.get(fc.name)
                if handler:
                    result = handler(**dict(fc.args))

                    # Send result back
                    response = chat.send_message(
                        Part.from_function_response(
                            name=fc.name,
                            response={'result': result},
                        )
                    )
                break

        if not has_function_call:
            # No more function calls - return the text response
            return response.text

# Ask a question that might require multiple function calls
response = chat.send_message(
    'Check the status of web-server-01 and also show me the last 3 deployments for the web-app service.'
)

final_answer = process_response(response)
print(f"\nFinal answer: {final_answer}")
```

## Real-World Example: Infrastructure Assistant

Here is a more complete example of an infrastructure operations assistant:

```python
# infra_assistant.py
# Infrastructure assistant using function calling

import vertexai
from vertexai.generative_models import GenerativeModel, FunctionDeclaration, Tool, Part

vertexai.init(project='your-project-id', location='us-central1')

# Define infrastructure management functions
functions = [
    FunctionDeclaration(
        name='get_instance_list',
        description='Lists all compute instances in a GCP project.',
        parameters={
            'type': 'object',
            'properties': {
                'project_id': {'type': 'string', 'description': 'GCP project ID'},
                'zone': {'type': 'string', 'description': 'GCP zone, e.g., us-central1-a'},
            },
            'required': ['project_id'],
        },
    ),
    FunctionDeclaration(
        name='get_billing_summary',
        description='Gets the billing summary for the current month.',
        parameters={
            'type': 'object',
            'properties': {
                'project_id': {'type': 'string', 'description': 'GCP project ID'},
            },
            'required': ['project_id'],
        },
    ),
    FunctionDeclaration(
        name='scale_instance_group',
        description='Scales a managed instance group to a target size.',
        parameters={
            'type': 'object',
            'properties': {
                'instance_group': {'type': 'string', 'description': 'Instance group name'},
                'target_size': {'type': 'integer', 'description': 'Desired number of instances'},
                'zone': {'type': 'string', 'description': 'GCP zone'},
            },
            'required': ['instance_group', 'target_size', 'zone'],
        },
    ),
]

infra_tool = Tool(function_declarations=functions)

model = GenerativeModel(
    'gemini-1.5-pro',
    tools=[infra_tool],
    system_instruction=[
        'You are an infrastructure operations assistant.',
        'Always confirm destructive actions before executing them.',
        'Provide clear summaries of the results.',
    ],
)

# Interactive chat loop
chat = model.start_chat()

print("Infrastructure Assistant ready. Type 'quit' to exit.")
while True:
    user_input = input("\nYou: ")
    if user_input.lower() == 'quit':
        break

    response = chat.send_message(user_input)

    # Process function calls
    parts = response.candidates[0].content.parts
    for part in parts:
        if hasattr(part, 'function_call') and part.function_call.name:
            fc = part.function_call
            print(f"\n[Calling {fc.name} with {dict(fc.args)}]")

            # Execute and return result
            result = function_handlers.get(fc.name, lambda **k: {'error': 'Unknown function'})(**dict(fc.args))
            response = chat.send_message(
                Part.from_function_response(name=fc.name, response={'result': result})
            )

    print(f"\nAssistant: {response.text}")
```

## Tips for Effective Function Definitions

Write clear, specific descriptions. The model uses the description to decide when to call a function. Vague descriptions lead to incorrect function calls.

Use enum types for parameters with limited options. This helps the model pick valid values.

Make parameters required only when they truly are. Optional parameters with sensible defaults give the model more flexibility.

Test with various phrasings. Users will ask for the same thing in many different ways. Make sure your function descriptions cover the range of natural language variations.

## Wrapping Up

Function calling transforms Gemini from a text generator into an AI agent that can take actions in the real world. By defining functions with clear schemas and descriptions, you give the model the ability to interact with your APIs, databases, and services. The pattern is straightforward: define functions, handle calls, return results. Start with a few simple functions, verify the model calls them correctly, and then expand to build more capable AI assistants.
