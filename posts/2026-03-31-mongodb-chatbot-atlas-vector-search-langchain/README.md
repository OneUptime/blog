# How to Build a Chatbot with MongoDB Atlas Vector Search and LangChain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, LangChain, Vector Search

Description: Build a conversational chatbot backed by MongoDB Atlas Vector Search and LangChain to answer questions grounded in your own documents with memory support.

---

LangChain provides abstractions for building LLM applications, including a MongoDB Atlas Vector Search integration. This guide shows how to build a chatbot that retrieves relevant context from MongoDB and maintains conversation memory.

## Setup

```bash
pip install langchain langchain-community langchain-mongodb langchain-openai pymongo
```

## Step 1: Initialize MongoDB as a Vector Store

LangChain's `MongoDBAtlasVectorSearch` class handles embedding generation and document storage:

```python
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://user:pass@cluster.mongodb.net/"
DB_NAME = "chatbot_db"
COLLECTION_NAME = "knowledge_base"
INDEX_NAME = "vector_index"

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = MongoDBAtlasVectorSearch(
    collection=collection,
    embedding=embeddings,
    index_name=INDEX_NAME,
    relevance_score_fn="cosine"
)
```

## Step 2: Load Documents into the Vector Store

Use LangChain document loaders and text splitters to process your knowledge base:

```python
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

loader = DirectoryLoader("./docs", glob="**/*.txt", loader_cls=TextLoader)
documents = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)
chunks = text_splitter.split_documents(documents)

vector_store.add_documents(chunks)
print(f"Indexed {len(chunks)} document chunks")
```

## Step 3: Create a Retrieval Chain

```python
from langchain_openai import ChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=retriever,
    memory=memory,
    return_source_documents=True,
    verbose=False
)
```

## Step 4: Run the Chatbot

```python
def chat(question: str) -> dict:
    result = chain.invoke({"question": question})
    return {
        "answer": result["answer"],
        "sources": [doc.metadata.get("source", "unknown") for doc in result["source_documents"]]
    }

# Interactive loop
print("Chatbot ready. Type 'exit' to quit.")
while True:
    user_input = input("You: ").strip()
    if user_input.lower() == "exit":
        break
    if not user_input:
        continue
    response = chat(user_input)
    print(f"Bot: {response['answer']}")
    print(f"Sources: {', '.join(set(response['sources']))}\n")
```

## Step 5: Store Conversation History in MongoDB

Persist chat history to MongoDB so sessions survive restarts:

```python
from langchain_mongodb.chat_message_histories import MongoDBChatMessageHistory

def get_chat_chain(session_id: str):
    message_history = MongoDBChatMessageHistory(
        connection_string=MONGO_URI,
        session_id=session_id,
        database_name=DB_NAME,
        collection_name="chat_history"
    )

    memory = ConversationBufferMemory(
        chat_memory=message_history,
        memory_key="chat_history",
        return_messages=True,
        output_key="answer"
    )

    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True
    )

# Each user gets their own session
chain_for_user = get_chat_chain(session_id="user_123")
```

## Summary

A MongoDB-backed LangChain chatbot stores knowledge base chunks with embeddings via `MongoDBAtlasVectorSearch`, retrieves relevant context per question using the Atlas vector index, and generates grounded answers with `ConversationalRetrievalChain`. Conversation history can be persisted in MongoDB through `MongoDBChatMessageHistory`, enabling multi-turn sessions that survive application restarts.
