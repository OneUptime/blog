# How to Build a Chatbot with Amazon Bedrock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, Chatbot, AI, Serverless

Description: Build a production-ready chatbot with Amazon Bedrock using conversation history, streaming responses, and a serverless backend architecture.

---

Building a chatbot used to mean months of work with custom NLP pipelines, intent matching, and endless training data. With Amazon Bedrock, you can build a genuinely useful chatbot in a weekend. The foundation models do the heavy lifting - you just need to handle the conversation flow, session management, and integration with your application.

This guide walks through building a chatbot from the ground up, starting with a basic conversation loop and working up to a production-ready system with session persistence, streaming, and a serverless API.

## The Basic Conversation Loop

At its core, a chatbot is just a loop: take user input, send it to the model along with conversation history, and display the response. Here's the simplest possible version.

```python
import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def chat(messages, user_input):
    """Send a message and get a response, maintaining conversation history."""
    # Add the user's message to the conversation
    messages.append({"role": "user", "content": user_input})

    # Call the model with the full conversation history
    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'system': 'You are a friendly customer support agent for an online store.',
            'messages': messages
        })
    )

    result = json.loads(response['body'].read())
    assistant_message = result['content'][0]['text']

    # Add the assistant's response to history
    messages.append({"role": "assistant", "content": assistant_message})

    return assistant_message

# Run the chat loop
conversation = []
print("Chatbot ready! Type 'quit' to exit.\n")

while True:
    user_input = input("You: ")
    if user_input.lower() == 'quit':
        break

    response = chat(conversation, user_input)
    print(f"Bot: {response}\n")
```

This works, but it's missing several things you'd need for production: streaming, session persistence, error handling, and a proper API.

## Adding Streaming Responses

Nobody likes waiting for a full response to generate before seeing anything. Streaming gives users immediate feedback and makes the chatbot feel responsive.

```python
def chat_stream(messages, user_input):
    """Stream the chatbot response token by token."""
    messages.append({"role": "user", "content": user_input})

    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'system': 'You are a friendly customer support agent.',
            'messages': messages
        })
    )

    # Collect the full response while streaming
    full_response = ""

    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'])

        if chunk['type'] == 'content_block_delta':
            text = chunk['delta'].get('text', '')
            full_response += text
            print(text, end='', flush=True)  # Print as it arrives

    print()  # Newline after streaming completes

    # Save the complete response to conversation history
    messages.append({"role": "assistant", "content": full_response})
    return full_response
```

## Session Management with DynamoDB

A real chatbot needs to persist conversations across requests. DynamoDB is a natural fit - it's fast, serverless, and scales without effort.

```python
import boto3
import json
import time
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('chatbot-sessions')

def save_session(session_id, messages):
    """Save conversation history to DynamoDB."""
    table.put_item(Item={
        'session_id': session_id,
        'messages': json.dumps(messages),
        'updated_at': datetime.utcnow().isoformat(),
        'ttl': int(time.time()) + 86400  # Expire after 24 hours
    })

def load_session(session_id):
    """Load conversation history from DynamoDB."""
    response = table.get_item(Key={'session_id': session_id})
    if 'Item' in response:
        return json.loads(response['Item']['messages'])
    return []

def delete_session(session_id):
    """Delete a conversation session."""
    table.delete_item(Key={'session_id': session_id})
```

Here's the DynamoDB table definition you'll need.

```python
# Create the DynamoDB table for sessions
dynamodb_client = boto3.client('dynamodb', region_name='us-east-1')

dynamodb_client.create_table(
    TableName='chatbot-sessions',
    KeySchema=[
        {'AttributeName': 'session_id', 'KeyType': 'HASH'}
    ],
    AttributeDefinitions=[
        {'AttributeName': 'session_id', 'AttributeType': 'S'}
    ],
    BillingMode='PAY_PER_REQUEST'
)
```

## Building the Serverless API

For a web application, you'll want an API Gateway and Lambda setup. Here's the Lambda function that ties everything together.

```python
import boto3
import json
import uuid

bedrock_runtime = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('chatbot-sessions')

SYSTEM_PROMPT = """You are a helpful customer support agent for TechStore.
You help customers with orders, returns, product information, and general questions.
Be friendly, concise, and helpful. If you don't know something, say so honestly."""

def lambda_handler(event, context):
    """Handle chatbot API requests."""
    body = json.loads(event.get('body', '{}'))
    user_message = body.get('message', '')
    session_id = body.get('session_id', str(uuid.uuid4()))

    if not user_message:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Message is required'})
        }

    # Load existing conversation or start fresh
    messages = load_conversation(session_id)
    messages.append({"role": "user", "content": user_message})

    # Trim conversation history to avoid token limits
    # Keep the last 20 messages to stay within context window
    if len(messages) > 20:
        messages = messages[-20:]

    try:
        # Call Bedrock
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1024,
                'system': SYSTEM_PROMPT,
                'messages': messages
            })
        )

        result = json.loads(response['body'].read())
        assistant_message = result['content'][0]['text']

        # Save updated conversation
        messages.append({"role": "assistant", "content": assistant_message})
        save_conversation(session_id, messages)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_message,
                'session_id': session_id
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Something went wrong. Please try again.'})
        }

def load_conversation(session_id):
    response = table.get_item(Key={'session_id': session_id})
    if 'Item' in response:
        return json.loads(response['Item']['messages'])
    return []

def save_conversation(session_id, messages):
    import time
    table.put_item(Item={
        'session_id': session_id,
        'messages': json.dumps(messages),
        'ttl': int(time.time()) + 86400
    })
```

## Adding Context with a Knowledge Base

A chatbot that can only rely on its training data will eventually give wrong answers about your specific products or policies. Adding a knowledge base gives the chatbot access to your actual documentation.

```python
def chat_with_knowledge_base(session_id, user_message, kb_id):
    """Enhanced chatbot that searches a knowledge base before responding."""
    bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

    # First, search the knowledge base for relevant context
    kb_response = bedrock_agent_runtime.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={'text': user_message},
        retrievalConfiguration={
            'vectorSearchConfiguration': {
                'numberOfResults': 3
            }
        }
    )

    # Extract the relevant passages
    context_chunks = []
    for result in kb_response['retrievalResults']:
        context_chunks.append(result['content']['text'])

    context = "\n\n".join(context_chunks)

    # Build an enhanced system prompt with the retrieved context
    enhanced_system = f"""{SYSTEM_PROMPT}

Use the following knowledge base context to answer questions when relevant:

{context}

If the context doesn't contain relevant information, rely on your general knowledge
but let the user know you're not certain about specifics."""

    # Continue with normal chat flow using the enhanced prompt
    messages = load_conversation(session_id)
    messages.append({"role": "user", "content": user_message})

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'system': enhanced_system,
            'messages': messages[-20:]  # Keep last 20 messages
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

## Frontend Integration

Here's a minimal JavaScript frontend that connects to your chatbot API.

```javascript
// Simple chatbot frontend
class ChatWidget {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.sessionId = localStorage.getItem('chat_session') || null;
    }

    async sendMessage(message) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: this.sessionId
            })
        });

        const data = await response.json();

        // Store session ID for conversation continuity
        this.sessionId = data.session_id;
        localStorage.setItem('chat_session', this.sessionId);

        return data.response;
    }

    resetSession() {
        this.sessionId = null;
        localStorage.removeItem('chat_session');
    }
}

// Usage
const chat = new ChatWidget('https://your-api-gateway-url/chat');
const reply = await chat.sendMessage('What is your return policy?');
```

## Monitoring and Improvement

Once your chatbot is live, you need to track how it's performing. Log every conversation so you can review interactions, spot failure patterns, and improve your system prompt over time.

For monitoring the underlying infrastructure - Lambda performance, DynamoDB throughput, API Gateway errors - a solid observability platform is essential. Check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view) for a comprehensive monitoring setup.

Also consider adding [Bedrock Guardrails](https://oneuptime.com/blog/post/amazon-bedrock-guardrails-safe-ai/view) to protect your chatbot from generating inappropriate content or leaking sensitive information.

Building a chatbot with Bedrock gives you powerful conversational AI without the complexity of training and hosting your own models. Start with the basics, add features incrementally, and let real user interactions guide your improvements.
