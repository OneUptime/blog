# How to Use Amazon Bedrock with LangChain

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, LangChain, AI, Python

Description: Learn how to integrate Amazon Bedrock foundation models with LangChain for building chains, agents, and RAG pipelines in Python applications.

---

LangChain has become the go-to framework for building applications powered by large language models, and Amazon Bedrock gives you access to top-tier foundation models without managing infrastructure. Combining them lets you build sophisticated AI pipelines - chains, agents, RAG systems - while keeping everything serverless on the AWS side.

The integration between LangChain and Bedrock is mature and well-supported. You get all the composability and tooling that LangChain provides, backed by the reliability and scale of AWS. Let's dig into how to set this up and build something useful.

## Installation and Setup

First, install the required packages. The Bedrock integration lives in the `langchain-aws` package.

```bash
# Install LangChain and the AWS integration
pip install langchain langchain-aws boto3
```

Make sure your AWS credentials are configured. LangChain's Bedrock integration uses boto3 under the hood, so any method that works for boto3 - environment variables, AWS profiles, IAM roles - works here too.

## Basic Model Invocation

The simplest thing you can do is invoke a Bedrock model through LangChain's chat model interface. This gives you access to all of LangChain's prompt templating, output parsing, and chaining features.

```python
from langchain_aws import ChatBedrock

# Initialize the Bedrock chat model
llm = ChatBedrock(
    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
    region_name="us-east-1",
    model_kwargs={
        "max_tokens": 1024,
        "temperature": 0.7
    }
)

# Simple invocation
response = llm.invoke("What are the key benefits of serverless architecture?")
print(response.content)
```

## Using Prompt Templates

Raw strings are fine for testing, but production applications need structured prompts. LangChain's prompt templates let you build reusable, parameterized prompts.

```python
from langchain_core.prompts import ChatPromptTemplate

# Create a prompt template for code review
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a senior software engineer conducting code reviews. "
               "Focus on security, performance, and maintainability. "
               "Be direct and specific in your feedback."),
    ("human", "Review this {language} code:\n\n```{language}\n{code}\n```")
])

# Create a chain that pipes the prompt into the model
chain = prompt | llm

# Invoke the chain with parameters
response = chain.invoke({
    "language": "python",
    "code": """
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    result = db.execute(query)
    return result.fetchone()
"""
})

print(response.content)
```

## Building Chains with Output Parsing

Chains become really powerful when you add output parsers. They let you extract structured data from the model's response, which is essential for downstream processing.

```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List

# Define the structure you want
class CodeReview(BaseModel):
    issues: List[str] = Field(description="List of issues found")
    severity: str = Field(description="Overall severity: low, medium, or high")
    suggestions: List[str] = Field(description="Improvement suggestions")

# Set up the parser
parser = JsonOutputParser(pydantic_object=CodeReview)

# Build a prompt that includes format instructions
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a code review assistant. Analyze the code and return "
               "your findings in the requested JSON format.\n{format_instructions}"),
    ("human", "Review this code:\n\n```\n{code}\n```")
])

# Chain it all together: prompt -> model -> parser
chain = prompt | llm | parser

result = chain.invoke({
    "code": "password = request.args.get('pwd')\ndb.execute(f'SELECT * FROM users WHERE pass={password}')",
    "format_instructions": parser.get_format_instructions()
})

# result is now a dictionary matching your schema
print(f"Severity: {result['severity']}")
for issue in result['issues']:
    print(f"  - {issue}")
```

## Retrieval-Augmented Generation (RAG)

RAG is where the LangChain-Bedrock combo really shines. You can build a pipeline that retrieves relevant documents from a vector store and uses them as context for the model's response.

Here's a full RAG setup using Bedrock embeddings and FAISS as the vector store.

```python
from langchain_aws import BedrockEmbeddings, ChatBedrock
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Initialize Bedrock embeddings
embeddings = BedrockEmbeddings(
    model_id="amazon.titan-embed-text-v2:0",
    region_name="us-east-1"
)

# Initialize the chat model
llm = ChatBedrock(
    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
    region_name="us-east-1",
    model_kwargs={"max_tokens": 2048, "temperature": 0.3}
)

# Split your documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

# Sample documents - in production, load these from your data source
documents = [
    "Our return policy allows returns within 30 days of purchase...",
    "Shipping is free for orders over $50. Standard shipping takes 5-7 days...",
    "Premium members get 20% off all purchases and free expedited shipping..."
]

texts = text_splitter.create_documents(documents)

# Create the vector store
vectorstore = FAISS.from_documents(texts, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# Build the RAG prompt
rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer the question based only on the following context. "
               "If you cannot answer from the context, say so.\n\n"
               "Context: {context}"),
    ("human", "{question}")
])

# Helper to format retrieved documents
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Build the RAG chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)

# Ask a question
answer = rag_chain.invoke("What is the return policy?")
print(answer)
```

## Streaming Responses

For chat applications, you want to stream the response as it's generated rather than waiting for the full completion. LangChain makes this easy.

```python
from langchain_aws import ChatBedrock

llm = ChatBedrock(
    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
    region_name="us-east-1",
    streaming=True,
    model_kwargs={"max_tokens": 1024}
)

# Stream the response token by token
for chunk in llm.stream("Explain how container orchestration works"):
    print(chunk.content, end="", flush=True)
print()  # Newline at the end
```

## Building an Agent with Tools

LangChain agents can use tools to interact with external systems. Here's an agent that can search a knowledge base and perform calculations.

```python
from langchain_aws import ChatBedrock
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool

# Define tools the agent can use
@tool
def search_inventory(product_name: str) -> str:
    """Search the inventory for a product and return its stock level."""
    # Simulated inventory lookup
    inventory = {"laptop": 42, "mouse": 156, "keyboard": 89}
    stock = inventory.get(product_name.lower(), 0)
    return f"{product_name}: {stock} units in stock"

@tool
def calculate_discount(price: float, discount_percent: float) -> str:
    """Calculate the discounted price given a price and discount percentage."""
    discounted = price * (1 - discount_percent / 100)
    return f"Original: ${price:.2f}, Discount: {discount_percent}%, Final: ${discounted:.2f}"

# Set up the agent
llm = ChatBedrock(
    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
    region_name="us-east-1",
    model_kwargs={"max_tokens": 1024}
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful shopping assistant."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

tools = [search_inventory, calculate_discount]
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run the agent
result = agent_executor.invoke({
    "input": "How many laptops do we have? If they cost $999, what's the price with a 15% discount?"
})
print(result["output"])
```

## Conversation Memory

For chatbots that need to remember previous messages, add conversation memory to your chain.

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

llm = ChatBedrock(
    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
    region_name="us-east-1"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm

# Store for session histories
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

# Wrap the chain with message history
with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# Use it in a conversation
config = {"configurable": {"session_id": "user-123"}}
print(with_history.invoke({"input": "My name is Alex"}, config=config).content)
print(with_history.invoke({"input": "What's my name?"}, config=config).content)
```

## Error Handling and Retries

Production applications need robust error handling. LangChain provides built-in retry logic through its `with_retry` method.

```python
# Add automatic retries for transient failures
robust_llm = llm.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True
)

# Add fallback to a different model if the primary fails
from langchain_aws import ChatBedrock

fallback_llm = ChatBedrock(
    model_id="amazon.titan-text-express-v1",
    region_name="us-east-1"
)

resilient_llm = llm.with_fallbacks([fallback_llm])
```

The combination of LangChain and Bedrock gives you a flexible, production-ready foundation for AI applications. Start with simple chains, add complexity as needed, and leverage LangChain's ecosystem of integrations when you need to connect to other services. For building a full chatbot experience, check out our guide on [building a chatbot with Amazon Bedrock](https://oneuptime.com/blog/post/build-chatbot-amazon-bedrock/view).
