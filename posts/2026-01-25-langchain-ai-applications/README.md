# How to Configure LangChain for AI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, AI, LLM, Python, RAG

Description: Learn how to build AI applications with LangChain, from simple chains to complex agents with tools, memory, and retrieval-augmented generation.

---

Building AI applications requires more than just calling an LLM API. You need to manage prompts, chain multiple operations, handle context, and integrate external tools. LangChain provides a framework for composing these components into production-ready applications.

## What is LangChain?

LangChain is a framework for developing applications powered by language models. It provides:

- Abstractions for different LLM providers (OpenAI, Anthropic, local models)
- Tools for prompt management and templating
- Chains for combining multiple operations
- Agents that can use tools to accomplish tasks
- Memory systems for maintaining conversation context
- Integrations with vector stores for retrieval

## Installation and Setup

Install LangChain with the providers you need:

```bash
# Core LangChain package
pip install langchain langchain-core

# Provider-specific packages
pip install langchain-openai      # OpenAI models
pip install langchain-anthropic   # Claude models
pip install langchain-community   # Community integrations

# Additional dependencies
pip install chromadb              # Vector store
pip install tiktoken              # Token counting
```

Set up your API keys:

```python
import os

# Set API keys as environment variables
os.environ["OPENAI_API_KEY"] = "your-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "your-anthropic-key"

# Or use a .env file with python-dotenv
from dotenv import load_dotenv
load_dotenv()
```

## Basic LLM Interaction

Start with simple LLM calls:

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Initialize the model
llm = ChatOpenAI(
    model="gpt-4",
    temperature=0.7,
    max_tokens=500
)

# Simple message-based interaction
messages = [
    SystemMessage(content="You are a helpful DevOps assistant."),
    HumanMessage(content="What is a Kubernetes Pod?")
]

response = llm.invoke(messages)
print(response.content)
```

## Prompt Templates

Use templates for reusable, parameterized prompts:

```python
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate

# Simple string template
simple_template = PromptTemplate.from_template(
    "Explain {concept} in {style} for a {audience}."
)
formatted = simple_template.format(
    concept="Docker containers",
    style="simple terms",
    audience="beginner developer"
)
print(formatted)

# Chat message template with system and user messages
chat_template = ChatPromptTemplate.from_messages([
    ("system", "You are an expert in {domain}. Be concise and practical."),
    ("human", "{question}")
])

# Use with a model
chain = chat_template | llm
response = chain.invoke({
    "domain": "Kubernetes security",
    "question": "How do I secure secrets in a cluster?"
})
print(response.content)
```

## Building Chains

Chains connect multiple components into a pipeline:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from pydantic import BaseModel, Field

llm = ChatOpenAI(model="gpt-4", temperature=0)

# Simple chain: prompt -> model -> string output
prompt = ChatPromptTemplate.from_template(
    "Write a one-paragraph summary of: {topic}"
)
chain = prompt | llm | StrOutputParser()

summary = chain.invoke({"topic": "Kubernetes autoscaling"})
print(summary)

# Chain with structured output
class CodeReview(BaseModel):
    """Structured code review output."""
    issues: list[str] = Field(description="List of issues found")
    suggestions: list[str] = Field(description="Improvement suggestions")
    score: int = Field(description="Code quality score 1-10")

review_prompt = ChatPromptTemplate.from_template("""
Review this code and provide structured feedback:

```python
{code}
```

Return your review as JSON with keys: issues, suggestions, score
""")

review_chain = review_prompt | llm | JsonOutputParser()

code_to_review = '''
def fetch_data(url):
    import requests
    r = requests.get(url)
    return r.json()
'''

review = review_chain.invoke({"code": code_to_review})
print(f"Score: {review['score']}")
print(f"Issues: {review['issues']}")
```

## Retrieval-Augmented Generation (RAG)

Build a RAG system that answers questions using your documents:

```python
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Sample documents (in practice, load from files or databases)
documents = [
    "Kubernetes uses Pods as the smallest deployable unit. A Pod can contain one or more containers that share storage and network.",
    "Services in Kubernetes provide stable networking for Pods. ClusterIP, NodePort, and LoadBalancer are the main service types.",
    "ConfigMaps store non-sensitive configuration data. Secrets store sensitive data like passwords and API keys.",
    "Deployments manage ReplicaSets and provide declarative updates for Pods. They support rolling updates and rollbacks."
]

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,
    chunk_overlap=20
)
chunks = []
for doc in documents:
    chunks.extend(text_splitter.split_text(doc))

# Create embeddings and vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_texts(
    texts=chunks,
    embedding=embeddings,
    collection_name="k8s-docs"
)

# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}  # Return top 3 matches
)

# RAG prompt template
rag_prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

Context:
{context}

Question: {question}

If the context does not contain enough information, say "I don't have enough information to answer that."
""")

# Helper function to format retrieved documents
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Build RAG chain
llm = ChatOpenAI(model="gpt-4", temperature=0)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)

# Ask questions
answer = rag_chain.invoke("What is the difference between ConfigMaps and Secrets?")
print(answer)
```

## Adding Memory to Conversations

Maintain context across multiple turns:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# Prompt with message history placeholder
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Be concise."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm

# Store for conversation histories (keyed by session ID)
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

# Wrap chain with message history
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# Conversation with memory
config = {"configurable": {"session_id": "user-123"}}

response1 = chain_with_history.invoke(
    {"input": "My name is Alice and I work on Kubernetes."},
    config=config
)
print(f"Bot: {response1.content}")

response2 = chain_with_history.invoke(
    {"input": "What do I work on?"},
    config=config
)
print(f"Bot: {response2.content}")  # Should remember Kubernetes
```

## Building Agents with Tools

Create agents that can use tools to accomplish tasks:

```python
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import requests

# Define custom tools
@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # Simulated weather API call
    return f"The weather in {city} is 72F and sunny."

@tool
def search_documentation(query: str) -> str:
    """Search the documentation for information about a topic."""
    # Simulated documentation search
    docs = {
        "deployment": "A Deployment provides declarative updates for Pods and ReplicaSets.",
        "service": "A Service exposes a set of Pods as a network service.",
        "pod": "A Pod is the smallest deployable unit in Kubernetes."
    }
    for key, value in docs.items():
        if key in query.lower():
            return value
    return "No documentation found for that query."

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression)  # In production, use a safer parser
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"

# Create the agent
llm = ChatOpenAI(model="gpt-4", temperature=0)
tools = [get_weather, search_documentation, calculate]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with access to tools. Use them when needed."),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_openai_functions_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run the agent
response = agent_executor.invoke({
    "input": "What is a Kubernetes deployment and what is 15 * 24?"
})
print(response["output"])
```

## Error Handling and Retries

Add resilience to your chains:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableConfig
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure model with retry settings
llm = ChatOpenAI(
    model="gpt-4",
    temperature=0,
    max_retries=3,
    request_timeout=30
)

# Custom retry wrapper for the entire chain
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def invoke_with_retry(chain, input_data):
    return chain.invoke(input_data)

prompt = ChatPromptTemplate.from_template("Summarize: {text}")
chain = prompt | llm | StrOutputParser()

try:
    result = invoke_with_retry(chain, {"text": "Your long text here..."})
    print(result)
except Exception as e:
    print(f"Failed after retries: {e}")
```

## Observability with LangSmith

Track and debug your LangChain applications:

```python
import os

# Enable LangSmith tracing
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-key"
os.environ["LANGCHAIN_PROJECT"] = "my-ai-project"

# Now all chain invocations are automatically traced
# View traces at https://smith.langchain.com
```

---

LangChain provides the building blocks for AI applications that go beyond simple chat. Start with basic chains, add retrieval for knowledge-grounded responses, and introduce agents when you need dynamic tool use. The composable architecture lets you build incrementally while maintaining clean, testable code.
